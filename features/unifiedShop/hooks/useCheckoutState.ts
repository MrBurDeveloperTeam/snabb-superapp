import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildLinesParam,
  claimReward,
  confirmCheckout,
  fetchCheckoutState,
  saveAddress,
  selectDeliveryMethod,
  setBillingSameAsDelivery,
  toggleSnabbbCredit,
} from '../api/checkoutApi';
import type { AddressFormValues } from '../types';

const CHECKOUT_STATE_QUERY_KEY = ['snabbb-shop', 'checkout', 'state'] as const;

/**
 * `linesParam` (from checkoutApi's buildLinesParam) should be built from
 * the local cart once, when the Delivery step first opens — see
 * CheckoutPage.tsx. The backend applies it idempotently (see checkout.py's
 * _sync_lines_to_order), so passing it again would be harmless, but it's
 * only needed on that first fetch of a checkout session; every mutation
 * hook below invalidates this query afterward to pick up the server's new
 * state without re-sending `lines`.
 */
export function useCheckoutState(linesParam: string | undefined) {
  return useQuery({
    queryKey: [...CHECKOUT_STATE_QUERY_KEY, linesParam ?? 'synced'] as const,
    queryFn: () => fetchCheckoutState(linesParam),
    // Delivery methods, reward eligibility and credit balance should
    // always reflect the latest server truth while actively checking
    // out — this isn't a browse-y list that benefits from staying stale.
    staleTime: 0,
    retry: false,
  });
}

/** How long after the last quantity edit before the early sync starts. */
const PREFETCH_DEBOUNCE_MS = 350;
/** A prefetched state newer than this isn't re-requested (e.g. drawer re-opened). */
const PREFETCH_FRESH_MS = 30_000;

/**
 * Starts the checkout-state request in the background while the shopper is
 * still looking at the cart drawer, so the server's order sync / promotion
 * recalculation overlaps with them reading the cart instead of starting
 * only when they press Checkout.
 *
 * Waits PREFETCH_DEBOUNCE_MS after the last quantity change (so a run of
 * +/- clicks sends one request, not one per click). It uses exactly the
 * query key CheckoutPage's useCheckoutState builds from the same cart, so
 * opening checkout finds the data already cached (or joins the request
 * still in flight) instead of starting a new one.
 *
 * Side effect to be aware of: like opening checkout, this makes the server
 * sync the cart into its draft order — so only enable it for a signed-in
 * shopper with the drawer open and something in the cart. Checkout always
 * re-syncs with the final cart, so a stale or racing prefetch can never
 * leave the order wrong. Errors are swallowed: it's an optimisation only.
 */
export function usePrefetchCheckoutState(
  enabled: boolean,
  lines: { productId: number; qty: number }[]
) {
  const queryClient = useQueryClient();
  const linesParam = buildLinesParam(lines);
  const hasLines = lines.length > 0;

  useEffect(() => {
    if (!enabled || !hasLines) return;
    const timer = window.setTimeout(() => {
      void queryClient
        .prefetchQuery({
          queryKey: [...CHECKOUT_STATE_QUERY_KEY, linesParam] as const,
          queryFn: () => fetchCheckoutState(linesParam),
          staleTime: PREFETCH_FRESH_MS,
        })
        .catch(() => {});
    }, PREFETCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, hasLines, linesParam, queryClient]);
}

/**
 * One mutation per Delivery-step action, each refetching /checkout/state
 * on success so the order summary, delivery method list, etc. all stay in
 * sync with whatever the server just computed (address change can affect
 * tax/delivery rates; reward claim and credit toggle both affect totals).
 */
export function useCheckoutActions() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CHECKOUT_STATE_QUERY_KEY });

  const saveAddressMutation = useMutation({
    mutationFn: ({
      type,
      address,
    }: {
      type: 'delivery' | 'billing';
      address: AddressFormValues;
    }) => saveAddress(type, address),
    onSuccess: invalidate,
  });

  const setBillingSameMutation = useMutation({
    mutationFn: (sameAsDelivery: boolean) => setBillingSameAsDelivery(sameAsDelivery),
    onSuccess: invalidate,
  });

  const selectDeliveryMethodMutation = useMutation({
    mutationFn: (carrierId: number) => selectDeliveryMethod(carrierId),
    onSuccess: invalidate,
  });

  const toggleCreditMutation = useMutation({
    mutationFn: (useCredit: boolean) => toggleSnabbbCredit(useCredit),
    onSuccess: invalidate,
  });

  const claimRewardMutation = useMutation({
    mutationFn: (code: string) => claimReward(code),
    onSuccess: invalidate,
  });

  // Not invalidated — Confirm is a one-shot readiness check right before
  // the SSO hand-off to Odoo's own /shop/payment (see
  // handOffToOdooPayment), not a state change worth refetching for.
  const confirmMutation = useMutation({
    mutationFn: () => confirmCheckout(),
  });

  return {
    saveAddress: saveAddressMutation,
    setBillingSame: setBillingSameMutation,
    selectDeliveryMethod: selectDeliveryMethodMutation,
    toggleCredit: toggleCreditMutation,
    claimReward: claimRewardMutation,
    confirm: confirmMutation,
  };
}
