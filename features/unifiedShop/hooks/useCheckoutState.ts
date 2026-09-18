import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  claimReward,
  confirmCheckout,
  fetchCheckoutState,
  saveAddress,
  selectDeliveryMethod,
  setBillingSameAsDelivery,
  toggleSnabbbCredit,
} from '../api/checkoutApi';
import type { AddressFormValues } from '../types';

const CHECKOUT_STATE_QUERY_KEY = ['unified-shop', 'checkout', 'state'] as const;

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
