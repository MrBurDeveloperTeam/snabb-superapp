import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, UnifiedProduct } from '../types';

interface UnifiedCartStore {
  /** The cart currently on screen — always the active owner's cart. */
  lines: CartLine[];
  isOpen: boolean;
  /**
   * Identity (normalized email) of the account `lines` currently belongs
   * to. `null` means this cart has never been tied to any account yet —
   * either it predates this field, or it's a guest cart nobody has logged
   * in to claim.
   */
  ownerId: string | null;
  /**
   * Other accounts' carts, parked here while they're not the active
   * owner. Switching back to one of these accounts (reconcileOwner)
   * swaps its stashed cart back into `lines` instead of starting it over.
   * Not meant to be read directly by UI code.
   */
  carts: Record<string, CartLine[]>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (
    product: UnifiedProduct,
    qty?: number,
    unit?: { id: number; name: string; price: number }
  ) => void;
  removeItem: (productId: number, unitId?: number) => void;
  setQty: (productId: number, qty: number, unitId?: number) => void;
  clear: () => void;
  /**
   * Call this whenever the signed-in identity is (re)established — on
   * login and on session re-verification. Logout intentionally does NOT
   * touch the cart (see services/signOut.ts) so whoever logs back in
   * gets their own items back.
   *
   * Each account's cart lives in its own slot (`carts`, keyed by
   * identity), so switching from account A to account B on the same
   * browser never shows B what A had in their cart — and switching back
   * from B to A restores A's cart exactly as they left it, instead of
   * wiping it. A cart with no owner yet (a guest who never logged in) is
   * adopted by whichever account logs in first, unless that account
   * already has its own stashed cart, in which case that one wins.
   */
  reconcileOwner: (identity: string | null) => void;
}

export const useUnifiedCartStore = create<UnifiedCartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      ownerId: null,
      carts: {},

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (product, qty = 1, unit) => {
        // A line is a product in ONE unit; picking another unit adds a
        // separate line (like mrbur.shop). Without an explicit pick the
        // product's default unit is used (unitId stays as the catalog's).
        const unitId = unit?.id ?? product.unitId;
        const unitName = unit?.name ?? product.unit;
        const price = unit?.price ?? product.price;
        const existing = get().lines.find(
          (l) => l.productId === product.id && l.unitId === unitId
        );
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l === existing ? { ...l, qty: l.qty + qty } : l
            ),
          });
          return;
        }
        set({
          lines: [
            ...get().lines,
            {
              productId: product.id,
              brand: product.brand,
              name: product.name,
              price,
              currency: product.currency,
              imageUrl: product.imageUrl,
              qty,
              unitId,
              unitName,
            },
          ],
        });
      },

      removeItem: (productId, unitId) => {
        set({
          lines: get().lines.filter(
            (l) => !(l.productId === productId && (unitId === undefined || l.unitId === unitId))
          ),
        });
      },

      setQty: (productId, qty, unitId) => {
        if (qty <= 0) {
          get().removeItem(productId, unitId);
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.productId === productId && (unitId === undefined || l.unitId === unitId)
              ? { ...l, qty }
              : l
          ),
        });
      },

      clear: () => set({ lines: [] }),

      reconcileOwner: (identity) => {
        // No signed-in identity (guest browsing, or a logout in
        // progress) — nothing to reconcile against.
        if (!identity) return;

        const { ownerId, lines, carts } = get();

        // Same account still logged in (routine re-verification on
        // focus/SSO checks) — nothing to swap.
        if (ownerId === identity) return;

        const nextCarts = { ...carts };

        // Park the outgoing account's cart instead of discarding it, so
        // it's there to restore if they log back in later. A `null`
        // ownerId means there's no real account to stash for (a fresh
        // cart, or a guest cart nobody has claimed) — its lines fall
        // through to the adoption branch below instead.
        if (ownerId !== null) {
          nextCarts[ownerId] = lines;
        }

        let restored: CartLine[];
        if (Object.prototype.hasOwnProperty.call(nextCarts, identity)) {
          // This account has its own stashed cart from earlier on this
          // browser — that's theirs, restore it.
          restored = nextCarts[identity];
          delete nextCarts[identity];
        } else if (ownerId === null) {
          // Nobody owned the cart that was active (guest/unattributed) —
          // the logging-in account adopts it rather than starting empty.
          restored = lines;
        } else {
          // A genuinely new account on this browser — starts empty.
          restored = [];
        }

        set({ ownerId: identity, lines: restored, carts: nextCarts });
      },
    }),
    {
      name: 'snabbb-unified-shop-cart',
      // isOpen is UI-only — no reason to restore a stale drawer-open state
      // across page loads.
      partialize: (state) => ({
        lines: state.lines,
        ownerId: state.ownerId,
        carts: state.carts,
      }),
    }
  )
);

/** Total item count across all lines — for a cart badge, etc. */
export function useUnifiedCartCount(): number {
  return useUnifiedCartStore((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));
}

/**
 * Cart total grouped by brand — mirrors how checkout will eventually split
 * this cart into one sale.order per brand, so the UI can show "you'll get
 * separate confirmations for MR.BUR and Kaneiko" style messaging later.
 *
 * Deliberately does NOT build this object inside the Zustand selector: a
 * selector that returns a fresh object/array on every call defeats Zustand's
 * `useSyncExternalStore`-based reference check (every snapshot "looks new"),
 * which can spiral into "Maximum update depth exceeded" — that's what caused
 * the blank-screen crash on the first version of this hook. Subscribing to
 * the store's own `lines` array (a stable reference that only changes when
 * `set()` actually runs) and deriving the totals with `useMemo` keyed on it
 * keeps the derived object stable between unrelated re-renders.
 */
export function useUnifiedCartTotalsByBrand(): Record<string, number> {
  const lines = useUnifiedCartStore((s) => s.lines);
  return useMemo(
    () =>
      lines.reduce<Record<string, number>>((totals, l) => {
        totals[l.brand] = (totals[l.brand] || 0) + l.price * l.qty;
        return totals;
      }, {}),
    [lines]
  );
}
