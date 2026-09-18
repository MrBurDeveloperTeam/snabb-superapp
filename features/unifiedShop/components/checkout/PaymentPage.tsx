import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, ShieldCheck } from 'lucide-react';
import { useCheckoutState, useCheckoutActions } from '../../hooks/useCheckoutState';
import { fetchPaymentMethods, fetchPaymentStatus, initPayment } from '../../api/paymentApi';
import { CheckoutApiError } from '../../api/checkoutApi';
import { handOffToOdooPayment, CheckoutHandoffError } from '../../api/checkoutHandoff';
import { useCreateAppLink } from '@/mutation/useCreateAppLink';
import { useUnifiedCartStore } from '../../store/unifiedCartStore';
import { CART_TOAST_STYLE } from '../cartToastStyle';
import type { PaymentProvider } from '../../types';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

function formatAddress(addr: { name: string; street: string; city: string; country_name: string } | null | undefined) {
  if (!addr) return '';
  return [addr.name, addr.street, addr.city, addr.country_name].filter(Boolean).join(', ');
}

// Stripe.js must be loaded from js.stripe.com directly (never bundled/
// self-hosted/proxied — that's a hard requirement of Stripe's own PCI SAQ-A
// eligibility, not just a style choice), so this loads it at runtime with a
// plain <script> tag instead of an npm dependency.
declare global {
  interface Window {
    Stripe?: (publishableKey: string) => any;
  }
}

let stripeJsPromise: Promise<NonNullable<Window['Stripe']>> | null = null;
function loadStripeJs(): Promise<NonNullable<Window['Stripe']>> {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (stripeJsPromise) return stripeJsPromise;
  stripeJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error('Stripe.js loaded without window.Stripe')));
    script.onerror = () => reject(new Error('Could not load Stripe.js'));
    document.head.appendChild(script);
  });
  return stripeJsPromise;
}

interface PaymentPageProps {
  /** Back to the Delivery step (components/checkout/CheckoutPage.tsx). */
  onBack: () => void;
  /** All the way back to the product grid. */
  onBackToShop: () => void;
  /**
   * Set when this page was reached by a full-page reload back from Stripe's
   * own 3DS/bank-authentication redirect (see loadStripeJs's neighbor,
   * ssoRedirect's opposite number — the `return_url` passed to
   * stripe.confirmPayment below). UnifiedShopApp reads `?stripe_return=1&
   * tx_ref=...` off the URL on mount and passes the reference through here
   * so this page resumes straight into "confirming payment" instead of
   * showing the picker again and creating a second transaction.
   */
  resumeReference?: string | null;
}

/**
 * The native "Payment" step — reached from CheckoutPage's Confirm button.
 * Mirrors mrbur.odoo.com/shop/payment (the screenshot this was built from):
 * a Delivery & Billing summary line, a payment method picker, Card fields
 * ("Secured by Stripe"), an order summary, an earn-credits banner, the
 * Snabbb Credit toggle, and Pay now.
 *
 * Only Card is genuinely native here — see PaymentProvider.inline and this
 * file's provider-selection logic below. Every other enabled provider
 * (2c2p, doku, ...) is an inherently hosted, redirect-only page in Odoo
 * regardless of who renders the picker, so those still use the existing
 * SSO hand-off (handOffToOdooPayment) once selected — this page just adds
 * one more screen in front of that hand-off for them, it doesn't change
 * how they work.
 *
 * Card handling is Stripe's own hosted Payment Element (loaded via
 * Stripe.js, mounted into #unified-shop-payment-element below) — raw card
 * numbers are typed directly into Stripe's iframe and never pass through
 * this component's state, this app's bundle, or the backend. See
 * unified_shop_api/controllers/checkout.py's payment/* routes for the
 * server side of this (creates the payment.transaction via Odoo's own
 * documented `payment.transaction.create()` + `_get_processing_values()`
 * entry point, never touches card data).
 */
const PaymentPage: React.FC<PaymentPageProps> = ({ onBack, onBackToShop, resumeReference }) => {
  const { data: state } = useCheckoutState(undefined);
  const actions = useCheckoutActions();
  const { mutateAsync: createAppLink } = useCreateAppLink();
  const clearCart = useUnifiedCartStore((s) => s.clear);

  const methodsQuery = useQuery({
    queryKey: ['unified-shop', 'checkout', 'payment-methods'],
    queryFn: fetchPaymentMethods,
    staleTime: 0,
    retry: false,
    enabled: !resumeReference,
  });

  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [saveInfo, setSaveInfo] = useState(true);
  const [txReference, setTxReference] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initializingTx, setInitializingTx] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'confirming' | 'success' | 'failed'>(
    resumeReference ? 'confirming' : 'idle'
  );
  const [redirectingOther, setRedirectingOther] = useState(false);

  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const elementMountedRef = useRef(false);
  const elementContainerRef = useRef<HTMLDivElement | null>(null);
  const txInitiatedForProvider = useRef<number | null>(null);

  const providers: PaymentProvider[] = methodsQuery.data?.providers ?? [];
  const selectedProvider = providers.find((p) => p.id === selectedProviderId) ?? null;

  // Pick the first inline (Stripe) provider by default once the list
  // loads — matching the screenshot, where "Card" is pre-selected.
  useEffect(() => {
    if (selectedProviderId !== null || providers.length === 0) return;
    const inlineFirst = providers.find((p) => p.inline) ?? providers[0];
    setSelectedProviderId(inlineFirst.id);
  }, [providers, selectedProviderId]);

  // Create the payment.transaction + mount Stripe's Payment Element as
  // soon as an inline provider is selected. Stripe's PaymentIntent-based
  // Elements need a client_secret to even render the card fields, so the
  // transaction has to exist before the shopper sees the form — this
  // mirrors how Odoo's own inline Stripe flow works, not a shortcut taken
  // here. Re-selecting the same provider (e.g. re-render) doesn't create a
  // second transaction — guarded by txInitiatedForProvider.
  useEffect(() => {
    if (!selectedProvider || !selectedProvider.inline) return;
    if (txInitiatedForProvider.current === selectedProvider.id) return;
    txInitiatedForProvider.current = selectedProvider.id;

    let cancelled = false;
    setInitError(null);
    setInitializingTx(true);

    (async () => {
      try {
        const res = await initPayment(selectedProvider.id, saveInfo);
        if (cancelled) return;
        setTxReference(res.reference);

        // Confirmed via a live /payment/init response on this instance:
        // processing_values carries client_secret but NEVER a publishable
        // key — Odoo's own /shop/payment template reads that straight off
        // provider_sudo.stripe_publishable_key server-side, it never rides
        // along in processing_values. checkout.py's _provider_json now
        // attaches it to the provider list instead (GET /payment/methods),
        // so it comes from selectedProvider here, not from this response.
        const pv = res.processing_values;
        const publishableKey = selectedProvider.stripe_publishable_key;
        const clientSecret = pv.client_secret ?? pv.stripe_client_secret;
        if (typeof publishableKey !== 'string' || typeof clientSecret !== 'string') {
          // Surface exactly what's missing so this is self-diagnosing from
          // the browser — no need for another round trip through DevTools.
          const gotKeys = Object.keys(pv).join(', ') || '(none)';
          throw new Error(
            typeof publishableKey !== 'string'
              ? 'This provider has no Stripe publishable key configured (Payment Providers > Stripe > Credentials in Odoo).'
              : `Payment provider did not return a client secret. Fields received: ${gotKeys}`
          );
        }

        const Stripe = await loadStripeJs();
        if (cancelled) return;
        const stripe = Stripe(publishableKey);
        const elements = stripe.elements({
          clientSecret,
          appearance: { theme: 'stripe', variables: { colorPrimary: '#0d9488' } },
        });
        const paymentElement = elements.create('payment', {
          layout: 'tabs',
          fields: { billingDetails: { address: { country: 'auto' } } },
        });
        if (elementContainerRef.current) {
          paymentElement.mount(elementContainerRef.current);
          elementMountedRef.current = true;
        }
        stripeRef.current = stripe;
        elementsRef.current = elements;
      } catch (err) {
        if (cancelled) return;
        setInitError(err instanceof Error ? err.message : 'Could not start Card payment. Please try again.');
        txInitiatedForProvider.current = null;
      } finally {
        if (!cancelled) setInitializingTx(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider?.id]);

  // Resume path: landed back here after Stripe's own 3DS/bank redirect.
  useEffect(() => {
    if (!resumeReference) return;
    pollStatus(resumeReference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeReference]);

  const pollStatus = async (reference: string) => {
    setStatus('confirming');
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const res = await fetchPaymentStatus(reference);
        if (res.is_done) {
          setStatus('success');
          clearCart();
          return;
        }
        if (res.is_error) {
          setStatus('failed');
          setPayError(res.state_message || 'Payment was not successful. Please try again.');
          return;
        }
      } catch {
        // transient — keep polling until the attempt budget runs out
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    // Odoo's webhook can lag a payment provider's own confirmation by a few
    // seconds — rather than declare failure, hand off to Odoo's own status
    // page, which keeps polling the same transaction.
    setStatus('idle');
    setPayError("This is taking longer than expected. We'll take you to your order status page.");
  };

  const handlePayNow = async () => {
    if (!selectedProvider) return;
    setPayError(null);

    if (!selectedProvider.inline) {
      setRedirectingOther(true);
      try {
        await handOffToOdooPayment(createAppLink);
      } catch (err) {
        setPayError(
          err instanceof CheckoutHandoffError ? err.message : 'Could not reach payment. Please try again.'
        );
        setRedirectingOther(false);
      }
      return;
    }

    if (!stripeRef.current || !elementsRef.current || !txReference) {
      setPayError('Payment form is still loading — please wait a moment and try again.');
      return;
    }

    setPaying(true);
    try {
      const billing = state?.billing_address;
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set('stripe_return', '1');
      returnUrl.searchParams.set('tx_ref', txReference);

      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        redirect: 'if_required',
        confirmParams: {
          return_url: returnUrl.toString(),
          payment_method_data: billing
            ? {
                billing_details: {
                  name: billing.name || undefined,
                  email: billing.email || undefined,
                  phone: billing.phone || undefined,
                },
              }
            : undefined,
        },
      });

      if (result.error) {
        setPayError(result.error.message || 'Your card was not approved. Please try another payment method.');
        setPaying(false);
        return;
      }

      // No redirect was needed (result.paymentIntent is present) — poll our
      // own status route rather than trusting the client-side Stripe result
      // alone, since that's what actually reflects
      // payment.transaction._set_done() having run.
      await pollStatus(txReference);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Something went wrong confirming payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleToggleCredit = async (useCredit: boolean) => {
    try {
      await actions.toggleCredit.mutateAsync(useCredit);
      // Amount changed — the mounted Stripe Element's clientSecret is now
      // stale (fixed amount at creation). Simplest safe fix: force a fresh
      // transaction/element on next render rather than risk charging the
      // old amount.
      txInitiatedForProvider.current = null;
      setTxReference(null);
      elementMountedRef.current = false;
      if (selectedProvider?.inline) {
        // Re-trigger the init effect for the same provider id.
        setSelectedProviderId(null);
        setTimeout(() => setSelectedProviderId(selectedProvider.id), 0);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update Snabbb Credit.', {
        style: CART_TOAST_STYLE,
      });
    }
  };

  if (status === 'confirming') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Confirming your payment…</p>
        <p className="mt-1 text-[12px] text-slate-400">This only takes a moment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-3 text-[15px] font-bold text-slate-900 dark:text-white">Payment successful!</p>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
          {state?.order_id ? `Order confirmed — thank you for shopping with us.` : 'Your order is confirmed.'}
        </p>
        <button
          type="button"
          onClick={onBackToShop}
          className="mt-5 rounded-lg bg-tiffany-500 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-tiffany-600"
        >
          Continue shopping
        </button>
      </div>
    );
  }

  const currency = methodsQuery.data?.currency ?? state?.currency ?? 'USD';
  const amountSubtotal = state?.amount_subtotal ?? 0;
  const amountDelivery = state?.amount_delivery ?? 0;
  const amountTax = state?.amount_tax ?? 0;
  const amountTotal = methodsQuery.data?.amount_total ?? state?.amount_total ?? 0;
  const earnCredits = methodsQuery.data?.earn_credits ?? 0;
  const credit = state?.credit;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <nav className="mb-5 flex items-center gap-2 text-[13px] font-semibold text-slate-400">
        <button type="button" onClick={onBackToShop} className="text-tiffany-600 hover:underline dark:text-tiffany-400">
          Review Order
        </button>
        <span>›</span>
        <button type="button" onClick={onBack} className="text-tiffany-600 hover:underline dark:text-tiffany-400">
          Delivery
        </button>
        <span>›</span>
        <span className="text-slate-900 dark:text-white">Payment</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Delivery &amp; Billing:</span>{' '}
          {formatAddress(state?.delivery_address)}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-tiffany-600 hover:underline dark:text-tiffany-400"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            Choose a payment method
          </h2>

          {methodsQuery.isLoading && (
            <p className="text-[13px] text-slate-400">Loading payment methods…</p>
          )}

          {methodsQuery.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {methodsQuery.error instanceof CheckoutApiError
                ? methodsQuery.error.message
                : 'Could not load payment methods.'}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`rounded-xl border-2 p-4 transition-colors ${
                  selectedProviderId === provider.id
                    ? 'border-tiffany-500 dark:border-tiffany-400'
                    : 'border-slate-100 dark:border-slate-800'
                }`}
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="payment-provider"
                    checked={selectedProviderId === provider.id}
                    onChange={() => setSelectedProviderId(provider.id)}
                    className="h-4 w-4 accent-tiffany-500"
                  />
                  {provider.image_url && (
                    <img src={provider.image_url} alt="" className="h-5 w-auto object-contain" />
                  )}
                  <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {provider.inline ? 'Card' : provider.name}
                  </span>
                </label>

                {selectedProviderId === provider.id && provider.inline && (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {initError && (
                      <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {initError}
                      </p>
                    )}
                    {initializingTx && !elementMountedRef.current && (
                      <p className="text-[12px] text-slate-400">Loading secure card form…</p>
                    )}
                    <div ref={elementContainerRef} id="unified-shop-payment-element" />

                    <label className="mt-3 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={saveInfo}
                        disabled={!!txReference}
                        onChange={(e) => setSaveInfo(e.target.checked)}
                        className="h-3.5 w-3.5 accent-tiffany-500"
                      />
                      Save my payment details for faster checkout next time
                    </label>

                    <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> Secured by Stripe
                    </p>
                  </div>
                )}

                {selectedProviderId === provider.id && !provider.inline && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    You'll be securely redirected to complete this payment with {provider.name}.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="block text-[15px] font-bold text-slate-900 dark:text-white">Order summary</span>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500 dark:text-slate-400">Delivery</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {formatPrice(amountDelivery, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {formatPrice(amountSubtotal + amountDelivery, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500 dark:text-slate-400">Taxes</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {formatPrice(amountTax, currency)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-[14px] font-bold text-slate-900 dark:text-white">Total</span>
                <span className="text-[17px] font-bold text-slate-900 dark:text-white">
                  {formatPrice(amountTotal, currency)}
                </span>
              </div>
            </div>

            {earnCredits > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
                <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300">
                  You'll earn {earnCredits.toLocaleString()} Snabbb Credits from this order!
                </p>
              </div>
            )}

            {payError && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {payError}
              </p>
            )}

            <button
              type="button"
              onClick={handlePayNow}
              disabled={!selectedProvider || paying || redirectingOther || (selectedProvider?.inline && !txReference)}
              className="mt-4 w-full rounded-xl bg-tiffany-500 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-tiffany-600 disabled:opacity-50 disabled:hover:bg-tiffany-500"
            >
              {paying || redirectingOther ? 'Processing…' : 'Pay now'}
            </button>

            {credit && (
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Pay with Snabbb Credit</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  Use your available Snabbb Credit for this order.
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">100 Snabbb Credit = 1.00 order currency</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={credit.use_credit}
                    disabled={actions.toggleCredit.isPending}
                    onClick={() => handleToggleCredit(!credit.use_credit)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      credit.use_credit ? 'bg-tiffany-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        credit.use_credit ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Available balance:{' '}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {credit.formatted_balance} Snabbb Credit
                  </span>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onBack}
              className="mt-4 w-full text-center text-[12px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to delivery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
