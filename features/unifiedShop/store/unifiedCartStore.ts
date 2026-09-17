import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, UnifiedProduct } from '../types';

interface UnifiedCartStore {
  lines: CartLine[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (product: UnifiedProduct, qty?: number) => void;
  removeItem: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
}

export const useUnifiedCartStore = create<UnifiedCartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,

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
    }),
    {
      name: 'snabbb-unified-shop-cart',
      // isOpen is UI-only — no reason to restore a stale drawer-open state
      // across page loads.
      partialize: (state) => ({ lines: state.lines }),
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
