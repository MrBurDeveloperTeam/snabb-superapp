import React from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useUnifiedCartCount, useUnifiedCartStore } from '../store/unifiedCartStore';
import ProductGrid from './ProductGrid';
import CartDrawer from './CartDrawer';

export interface UnifiedShopAppProps {
  /** Returns to the app gallery — App.tsx wires this to `navigate('/')`. */
  onBack: () => void;
}

/**
 * Top-level Unified Shop screen: browse + search + filter across brands,
 * with a persistent cart.
 *
 * Rendered by App.tsx as a real page at the `/shop` route (its own
 * lightweight `path`-state router — see the `isUnifiedShopRoute` /
 * `navigate('/shop')` wiring there), not as an overlay: App.tsx swaps this
 * in for the gallery's own header/footer/floating widgets the same way it
 * already does for `/tutorial-video` and friends, so this component owns
 * normal in-flow page space rather than a `fixed inset-0` layer on top of
 * everything. (It used to be exactly that overlay, toggled by an
 * `isOpen`/`onClose` pair — kept only as history here in case the git blame
 * on this file is ever useful.)
 */
const UnifiedShopApp: React.FC<UnifiedShopAppProps> = ({ onBack }) => {
  const cartCount = useUnifiedCartCount();
  const openCart = useUnifiedCartStore((s) => s.open);

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
      // Same mesh-gradient background the rest of the app paints on <body>
      // (see index.html's --mesh-bg / index.css's .dark override of it) —
      // reused here via the CSS variable so this page matches exactly, in
      // both themes, instead of a flat color.
      style={{ backgroundImage: 'var(--mesh-bg)', backgroundAttachment: 'fixed' }}
    >
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/50 bg-white/80 px-4 py-3 backdrop-blur-2xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] dark:border-slate-800/50 dark:bg-slate-950/80">
        <div>
          <h1 className="text-[16px] font-black text-slate-900 dark:text-white">
            Shop
          </h1>
          <p className="text-[11px] text-tiffany-700 dark:text-tiffany-400">
            MR.BUR &amp; Kaneiko, in one place
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Open cart"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Back to app gallery"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
        <ProductGrid />
      </main>

      <CartDrawer />
    </div>
  );
};

export default UnifiedShopApp;
