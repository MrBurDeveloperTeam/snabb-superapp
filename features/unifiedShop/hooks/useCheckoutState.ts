import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyWalletItem,
  buildLinesParam,
  claimReward,
  confirmCheckout,
  fetchCheckoutState,
  fetchWalletCart,
  releaseDiscountLine,
  removeWalletItem,
  saveAddress,
  selectDeliveryMethod,
  setBillingSameAsDelivery,
  toggleSnabbbCredit,
} from '../api/checkoutApi';
import type { AddressFormValues, CheckoutStateResponse, WalletState } from '../types';

const CHECKOUT_STATE_QUERY_KEY = ['snabbb-shop', 'checkout', 'state'] as const;
const WALLET_CART_QUERY_KEY = ['snabbb-shop', 'checkout', 'wallet-cart'] as const;

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
    // The key changes when the cart does (item removed in checkout) — keep
    // showing the current state until the refreshed one arrives.
    placeholderData: keepPreviousData,
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
  lines: { productId: number; qty: number; unitId?: number }[]
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

export interface CartDiscountSummary {
  /** Discount / promo lines the server has applied (e.g. "30% on your order"), as negative amounts. */
  discounts: { id: number | string; name: string; amount: number; removable: boolean }[];
  /** What the shopper will pay for the items after those discounts (delivery not included). */
  totalAfterDiscounts: number;
}

/**
 * The server-side discounts on the cart (typed promo codes, automatic
 * promotions, free shipping), for the cart drawer to show. The drawer's own
 * lines come from the local cart, which knows nothing about them.
 *
 * Read-only: it never fetches. It watches the same query usePrefetchCheckoutState
 * fills (same key), so it shows whatever the latest background sync returned,
 * and keeps showing the previous result while a new quantity is being synced
 * so the line doesn't flicker off on every +/- click. Returns null while
 * nothing is known or the cart has no discounts.
 */
export function useCartDiscountSummary(
  enabled: boolean,
  lines: { productId: number; qty: number; unitId?: number }[]
): CartDiscountSummary | null {
  const linesParam = buildLinesParam(lines);
  const { data } = useQuery({
    queryKey: [...CHECKOUT_STATE_QUERY_KEY, linesParam] as const,
    queryFn: () => fetchCheckoutState(linesParam),
    enabled: false,
    placeholderData: keepPreviousData,
  });

  if (!enabled || lines.length === 0 || !data || !data.ok || !data.authenticated || data.cart_empty) {
    return null;
  }

  const discounts: CartDiscountSummary['discounts'] = (data.lines ?? [])
    .filter((l) => l.price_subtotal < 0)
    .map((l) => ({
      id: l.id,
      name: l.name,
      amount: l.price_subtotal,
      removable: !!l.removable_discount,
    }));
  if ((data.amount_shipping_discount ?? 0) > 0) {
    discounts.push({
      id: 'shipping',
      name: data.shipping_reward_name || 'Free shipping',
      amount: -(data.amount_shipping_discount ?? 0),
      removable: false,
    });
  }
  if (discounts.length === 0) return null;

  return {
    discounts,
    totalAfterDiscounts: (data.amount_total ?? 0) - (data.amount_delivery ?? 0),
  };
}

/**
 * Removes a typed-in discount code from the cart. Updates the cached state
 * straight away (drops the line and adds its amount back to the total) so the
 * drawer reacts at once, then re-reads the real state from the server.
 */
export function useRemoveCartDiscount(lines: { productId: number; qty: number; unitId?: number }[]) {
  const queryClient = useQueryClient();
  const linesParam = buildLinesParam(lines);
  return async (lineId: number) => {
    await releaseDiscountLine(lineId);
    queryClient.setQueriesData<CheckoutStateResponse>(
      { queryKey: CHECKOUT_STATE_QUERY_KEY },
      (old) => {
        if (!old || !old.lines) return old;
        const gone = old.lines.find((l) => l.id === lineId);
        return {
          ...old,
          lines: old.lines.filter((l) => l.id !== lineId),
          amount_total: (old.amount_total ?? 0) - (gone?.price_subtotal ?? 0),
        };
      }
    );
    void queryClient
      .fetchQuery({
        queryKey: [...CHECKOUT_STATE_QUERY_KEY, linesParam] as const,
        queryFn: () => fetchCheckoutState(linesParam),
        staleTime: 0,
      })
      .catch(() => {});
  };
}

/**
 * mrbur_wallet items (Fixed / Percentage discount, Free Shipping) for the cart
 * drawer. Null while nothing is known, the wallet module isn't installed, or the
 * shopper owns no items.
 *
 * Two sources, newest wins:
 *  - a lightweight /wallet-cart read that fetches on its own as soon as the
 *    drawer opens (fast: it skips the order sync / promotion recompute), and
 *  - the full checkout state that usePrefetchCheckoutState fills in the
 *    background (slow, but authoritative once it lands).
 * Before this, the card waited for the slow one, so it popped in seconds late.
 */
export function useCartWallet(
  enabled: boolean,
  lines: { productId: number; qty: number; unitId?: number }[]
): WalletState | null {
  const linesParam = buildLinesParam(lines);
  const active = enabled && lines.length > 0;

  const fast = useQuery({
    queryKey: WALLET_CART_QUERY_KEY,
    queryFn: fetchWalletCart,
    enabled: active,
    staleTime: 15_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
  const { data, dataUpdatedAt } = useQuery({
    queryKey: [...CHECKOUT_STATE_QUERY_KEY, linesParam] as const,
    queryFn: () => fetchCheckoutState(linesParam),
    enabled: false,
    placeholderData: keepPreviousData,
  });

  if (!active) return null;

  const fromState =
    data && data.ok && data.authenticated && !data.cart_empty ? data.wallet ?? null : null;
  const fromFast = fast.data?.ok ? fast.data.wallet : null;
  const wallet =
    fromState && fromFast
      ? dataUpdatedAt >= fast.dataUpdatedAt
        ? fromState
        : fromFast
      : fromState ?? fromFast;

  if (!wallet) return null;
  if (wallet.available.length + wallet.applied.length + wallet.unavailable.length === 0) return null;
  return wallet;
}

/**
 * Apply / remove a wallet item from the cart drawer. The wallet card is
 * refreshed from the fast /wallet-cart read so the button un-sticks right away;
 * the heavy full-state refresh (totals, discount summary) runs in the background.
 */
export function useCartWalletActions(lines: { productId: number; qty: number; unitId?: number }[]) {
  const queryClient = useQueryClient();
  const linesParam = buildLinesParam(lines);
  const refresh = async () => {
    await queryClient.fetchQuery({
      queryKey: WALLET_CART_QUERY_KEY,
      queryFn: fetchWalletCart,
      staleTime: 0,
    });
    void queryClient
      .fetchQuery({
        queryKey: [...CHECKOUT_STATE_QUERY_KEY, linesParam] as const,
        queryFn: () => fetchCheckoutState(linesParam),
        staleTime: 0,
      })
      .catch(() => {});
  };
  return {
    apply: async (itemId: number) => {
      await applyWalletItem(itemId);
      await refresh();
    },
    remove: async (itemId: number) => {
      await removeWalletItem(itemId);
      await refresh();
    },
  };
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

  const applyWalletMutation = useMutation({
    mutationFn: (itemId: number) => applyWalletItem(itemId),
    onSuccess: invalidate,
  });

  const removeWalletMutation = useMutation({
    mutationFn: (itemId: number) => removeWalletItem(itemId),
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
    applyWallet: applyWalletMutation,
    removeWallet: removeWalletMutation,
    confirm: confirmMutation,
  };
}
