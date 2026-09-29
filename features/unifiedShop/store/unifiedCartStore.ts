import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, UnifiedProduct } from '../types';

interface UnifiedCartStore {
  lines: CartLine[];
  isOpen: boolean;
  /**
   * Identity (normalized email) of the account this persisted cart
   * currently belongs to. `null` means the cart predates this field or
   * was built by a guest who never logged in — either way, nothing to
   * reconcile against yet.
   */
  ownerId: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (product: UnifiedProduct, qty?: number) => void;
  removeItem: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
  /**
   * Call this whenever the signed-in identity is (re)established — on
   * login and on session re-verification. Logout intentionally does NOT
   * clear the cart (see services/signOut.ts) so a user who logs back in
   * gets their items back; this is what stops a *different* account that
   * logs in on the same browser afterward from inheriting them instead.
   */
  reconcileOwner: (identity: string | null) => void;
}

export const useUnifiedCartStore = create<UnifiedCartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      ownerId: null,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (product, qty = 1) => {
        const existing = get().lines.find((l) => l.productId === product.id);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.productId === product.id ? { ...l, qty: l.qty + qty } : l
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
              price: product.price,
              currency: product.currency,
              imageUrl: product.imageUrl,
              qty,
            },
          ],
        });
      },

      removeItem: (productId) => {
        set({ lines: get().lines.filter((l) => l.productId !== productId) });
      },

      setQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.productId === productId ? { ...l, qty } : l
          ),
        });
      },

      clear: () => set({ lines: [] }),

      reconcileOwner: (identity) => {
        // No signed-in identity (guest browsing, or a logout in
        // progress) — nothing to reconcile against.
        if (!identity) return;

        const { ownerId } = get();

        // First time this cart has ever been tagged — either a cart
        // that predates this field, or a genuine guest cart. Adopt the
        // logging-in account as its owner without wiping it.
        if (ownerId === null) {
          set({ ownerId: identity });
          return;
        }

        // A different account just logged in on this browser/device —
        // this cart isn't theirs, so it must not carry over.
        if (ownerId !== identity) {
          set({ lines: [], ownerId: identity });
        }
      },
    }),
    {
      name: 'snabbb-unified-shop-cart',
      // isOpen is UI-only — no reason to restore a stale drawer-open state
      // across page loads.
      partialize: (state) => ({ lines: state.lines, ownerId: state.ownerId }),
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
