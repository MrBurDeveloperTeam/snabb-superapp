import React, { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus } from 'lucide-react';
import { useUnifiedCartStore } from '../../store/unifiedCartStore';
import { useCheckoutActions, useCheckoutState } from '../../hooks/useCheckoutState';
import { buildLinesParam } from '../../api/checkoutApi';
import { handOffToOdooPayment, CheckoutHandoffError } from '../../api/checkoutHandoff';
import { useCreateAppLink } from '@/mutation/useCreateAppLink';
import { CART_TOAST_STYLE } from '../cartToastStyle';
import AddressFormModal from './AddressFormModal';
import DeliveryMethodList from './DeliveryMethodList';
import OrderSummary from './OrderSummary';
import type { AddressFormValues, CheckoutAddress } from '../../types';

interface CheckoutPageProps {
  /** Returns to the product grid (see UnifiedShopApp's `view` state). */
  onBackToShop: () => void;
}

type AddressModalState =
  | { open: false }
  | { open: true; kind: 'delivery' | 'billing'; initial: CheckoutAddress | null };

/**
 * The native "Delivery" checkout step — reached from CartDrawer's
 * Checkout button (see UnifiedShopApp's `view` state), staying on
 * app.snabbb.com instead of hopping straight to Odoo's own
 * /shop/checkout the way this used to work (see checkoutHandoff.ts's
 * doc comments for why that changed).
 *
 * Breadcrumb, address cards, delivery method list, billing toggle and the
 * order summary (subtotal/delivery/tax/total, reward claim card, Snabbb
 * Credit toggle, Confirm) all mirror mrbur.odoo.com/shop/checkout's own
 * layout — just backed by /api/unified-shop/checkout/* JSON instead of
 * Odoo's server-rendered template. Only the final Confirm step still
 * leaves this app: it hands off to Odoo's own /shop/payment for the
 * actual payment step (out of scope to rebuild natively here).
 */
const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToShop }) => {
  const lines = useUnifiedCartStore((s) => s.lines);

  // Computed once, at mount — the backend applies it idempotently, but
  // there's no reason to resend it on every refetch once the real Odoo
  // order is in sync (see useCheckoutState's doc comment).
  const [linesParam] = useState(() =>
    buildLinesParam(lines.map((l) => ({ productId: l.productId, qty: l.qty })))
  );

  const { data, isLoading, isError, error } = useCheckoutState(linesParam);
  const actions = useCheckoutActions();
  const { mutateAsync: createAppLink } = useCreateAppLink();

  const [addressModal, setAddressModal] = useState<AddressModalState>({ open: false });
  const [addressError, setAddressError] = useState<string | null>(null);
  const [claimingRewardId, setClaimingRewardId] = useState<number | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isHandingOff, setIsHandingOff] = useState(false);

  // Turning the toggle OFF is purely a local UI reveal (show the billing
  // address form) — there's nothing to tell the backend yet, since no
  // distinct billing address has been chosen. Only turning it back ON is a
  // real state change (billing = delivery), so only that direction calls
  // /checkout/address. `null` here means "follow the server's own
  // billing_same_as_delivery" — restored once that call succeeds, so a
  // later address save (which also flips it server-side) stays authoritative.
  const [billingSameOverride, setBillingSameOverride] = useState<boolean | null>(null);

  const handleSaveAddress = async (values: AddressFormValues) => {
    if (!addressModal.open) return;
    setAddressError(null);
    try {
      await actions.saveAddress.mutateAsync({ type: addressModal.kind, address: values });
      if (addressModal.kind === 'billing') setBillingSameOverride(null);
      setAddressModal({ open: false });
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Could not save this address.');
    }
  };

  const handleToggleBillingSame = async (sameAsDelivery: boolean) => {
    if (!sameAsDelivery) {
      setBillingSameOverride(false);
      return;
    }
    try {
      await actions.setBillingSame.mutateAsync(true);
      setBillingSameOverride(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not update billing address.',
        { style: CART_TOAST_STYLE }
      );
    }
  };

  const handleSelectDeliveryMethod = async (carrierId: number) => {
    try {
      await actions.selectDeliveryMethod.mutateAsync(carrierId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not select this delivery method.',
        { style: CART_TOAST_STYLE }
      );
    }
  };

  const handleClaimReward = async (rewardId: number, code: string) => {
    setRewardError(null);
    setClaimingRewardId(rewardId);
    try {
      await actions.claimReward.mutateAsync(code);
      toast.success('Reward claimed!', { style: CART_TOAST_STYLE });
    } catch (err) {
      setRewardError(err instanceof Error ? err.message : 'Could not claim this reward.');
    } finally {
      setClaimingRewardId(null);
    }
  };

  const handleApplyCode = async (code: string) => {
    await handleClaimReward(-1, code);
  };

  const handleToggleCredit = async (useCredit: boolean) => {
    try {
      await actions.toggleCredit.mutateAsync(useCredit);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not update Snabbb Credit.',
        { style: CART_TOAST_STYLE }
      );
    }
  };

  const handleConfirm = async () => {
    setConfirmError(null);
    try {
      await actions.confirm.mutateAsync();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Please finish the steps above before continuing.');
      return;
    }
    setIsHandingOff(true);
    try {
      await handOffToOdooPayment(createAppLink);
      // On success the browser navigates away — nothing left to do here.
    } catch (err) {
      const message =
        err instanceof CheckoutHandoffError ? err.message : 'Could not reach payment. Please try again.';
      setConfirmError(message);
      setIsHandingOff(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-[13px] text-slate-400">
        Loading checkout…
      </div>
    );
  }

  if (isError || !data?.ok) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          {error instanceof Error ? error.message : 'Could not load checkout.'}
        </p>
        <button
          type="button"
          onClick={onBackToShop}
          className="mt-4 rounded-lg bg-tiffany-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-tiffany-600"
        >
          Back to shop
        </button>
      </div>
    );
  }

  if (!data.authenticated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Please log in to continue to checkout.
        </p>
        <button
          type="button"
          onClick={onBackToShop}
          className="mt-4 rounded-lg bg-tiffany-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-tiffany-600"
        >
          Back to shop
        </button>
      </div>
    );
  }

  if (data.cart_empty) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">Your cart is empty.</p>
        <button
          type="button"
          onClick={onBackToShop}
          className="mt-4 rounded-lg bg-tiffany-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-tiffany-600"
        >
          Back to shop
        </button>
      </div>
    );
  }

  const currency = data.currency ?? 'USD';
  const deliveryAddress = data.delivery_address ?? null;
  const billingAddress = data.billing_address ?? null;
  const billingSame = billingSameOverride ?? (data.billing_same_as_delivery ?? true);
  const otherSavedAddresses = (data.saved_addresses ?? []).filter(
    (a) => a.id !== deliveryAddress?.id
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Breadcrumb — Review Order / Delivery / Payment, matching Odoo's own
          checkout header. Review Order returns to the cart drawer; Payment
          stays inert since that step isn't built natively here yet. */}
      <nav className="mb-5 flex items-center gap-2 text-[13px] font-semibold text-slate-400">
        <button type="button" onClick={onBackToShop} className="text-tiffany-600 hover:underline dark:text-tiffany-400">
          Review Order
        </button>
        <span>›</span>
        <span className="text-slate-900 dark:text-white">Delivery</span>
        <span>›</span>
        <span className="text-slate-300 dark:text-slate-600">Payment</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Delivery address
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {deliveryAddress && (
                <div className="rounded-xl border-2 border-tiffany-500 p-4 dark:border-tiffany-400">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {deliveryAddress.name}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
                    {deliveryAddress.street}
                    {deliveryAddress.street2 ? `, ${deliveryAddress.street2}` : ''}
                    <br />
                    {[deliveryAddress.zip, deliveryAddress.city].filter(Boolean).join(' ')}
                    {deliveryAddress.state_name ? `, ${deliveryAddress.state_name}` : ''}
                    <br />
                    {deliveryAddress.country_name}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setAddressModal({ open: true, kind: 'delivery', initial: deliveryAddress })
                    }
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-tiffany-600 hover:underline dark:text-tiffany-400"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setAddressModal({ open: true, kind: 'delivery', initial: null })}
                className="flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-tiffany-400 hover:text-tiffany-600 dark:border-slate-700 dark:hover:border-tiffany-500"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[13px] font-semibold">Add address</span>
              </button>
            </div>

            {otherSavedAddresses.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {otherSavedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() =>
                      actions.saveAddress.mutate({
                        type: 'delivery',
                        address: {
                          id: addr.id,
                          name: addr.name,
                          street: addr.street,
                          street2: addr.street2,
                          city: addr.city,
                          zip: addr.zip,
                          state_id: addr.state_id,
                          country_id: addr.country_id,
                          phone: addr.phone,
                          email: addr.email,
                        },
                      })
                    }
                    className="text-left text-[12px] font-medium text-slate-500 hover:text-tiffany-600 dark:text-slate-400 dark:hover:text-tiffany-400"
                  >
                    Use: {addr.street}, {addr.city}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Choose a delivery method
            </h2>
            <DeliveryMethodList
              methods={data.delivery_methods ?? []}
              selectedId={data.selected_carrier_id ?? false}
              currency={currency}
              disabled={actions.selectDeliveryMethod.isPending}
              onSelect={handleSelectDeliveryMethod}
            />
          </section>

          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Billing address
            </h2>
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600 dark:text-slate-300">
              <button
                type="button"
                role="switch"
                aria-checked={billingSame}
                disabled={actions.setBillingSame.isPending}
                onClick={() => handleToggleBillingSame(!billingSame)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  billingSame ? 'bg-tiffany-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    billingSame ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              Same as delivery address
            </label>

            {!billingSame && (
              <div className="mt-3 max-w-sm">
                {billingAddress && billingAddress.id !== deliveryAddress?.id ? (
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {billingAddress.name}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
                      {billingAddress.street}
                      {billingAddress.street2 ? `, ${billingAddress.street2}` : ''}
                      <br />
                      {[billingAddress.zip, billingAddress.city].filter(Boolean).join(' ')}
                      {billingAddress.state_name ? `, ${billingAddress.state_name}` : ''}
                      <br />
                      {billingAddress.country_name}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setAddressModal({ open: true, kind: 'billing', initial: billingAddress })
                      }
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-tiffany-600 hover:underline dark:text-tiffany-400"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddressModal({ open: true, kind: 'billing', initial: null })}
                    className="flex min-h-[80px] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-tiffany-400 hover:text-tiffany-600 dark:border-slate-700 dark:hover:border-tiffany-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[13px] font-semibold">Add billing address</span>
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        <div>
          <OrderSummary
            itemCount={(data.lines ?? []).reduce((sum, l) => sum + l.qty, 0)}
            currency={currency}
            amountSubtotal={data.amount_subtotal ?? 0}
            amountDelivery={data.amount_delivery ?? 0}
            amountTax={data.amount_tax ?? 0}
            amountTotal={data.amount_total ?? 0}
            rewards={data.rewards ?? []}
            credit={data.credit}
            claimingRewardId={claimingRewardId}
            rewardError={rewardError}
            onClaimReward={(reward) => handleClaimReward(reward.id, reward.code)}
            onApplyCode={handleApplyCode}
            applyingCode={actions.claimReward.isPending}
            creditToggling={actions.toggleCredit.isPending}
            onToggleCredit={handleToggleCredit}
            confirmDisabled={
              !deliveryAddress ||
              !(billingSame || billingAddress) ||
              !data.selected_carrier_id ||
              isHandingOff
            }
            confirming={actions.confirm.isPending || isHandingOff}
            confirmError={confirmError}
            onConfirm={handleConfirm}
            onBackToCart={onBackToShop}
          />
        </div>
      </div>

      {addressModal.open && (
        <AddressFormModal
          title={addressModal.kind === 'delivery' ? 'Delivery address' : 'Billing address'}
          initial={addressModal.initial}
          saving={actions.saveAddress.isPending}
          error={addressError}
          onCancel={() => {
            setAddressModal({ open: false });
            setAddressError(null);
          }}
          onSave={handleSaveAddress}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
