import React, { useState } from 'react';
import ProductGrid from './ProductGrid';
import CartDrawer from './CartDrawer';
import CheckoutPage from './checkout/CheckoutPage';

export interface UnifiedShopAppProps {
  /**
   * Returns to the app gallery — App.tsx wires this to `navigate('/')`.
   * Kept for backwards compatibility (and as an escape hatch for a future
   * caller that doesn't render the shared header), but the shared header's
   * brand mark and its "Back to App Gallery" menu entry already cover this
   * in the normal App.tsx flow, so nothing in this component calls it now.
   */
  onBack?: () => void;
}

type UnifiedShopView = 'shop' | 'checkout';

/**
 * Top-level Unified Shop screen: browse + search + filter across brands,
 * with a persistent cart, plus (since checkoutHandoff.ts stopped being the
 * first thing the Checkout button does) an in-app "Delivery" checkout step.
 *
 * `view` is local, component-level state rather than another branch of
 * App.tsx's own path-state router — CartDrawer's Checkout button just
 * flips it to 'checkout' and CheckoutPage's "Back to cart"/breadcrumb
 * flips it back, all without leaving the `/unified-shop` route or
 * touching App.tsx. That keeps this feature exactly as self-contained as
 * the rest of it (see this folder's README) — App.tsx still only ever
 * mounts <UnifiedShopApp />, nothing about this view change reaches it.
 *
 * Rendered by App.tsx as a real page at the `/unified-shop` route (its own
 * lightweight `path`-state router — see the `isUnifiedShopRoute` wiring
 * there). Unlike most of the other `isTutorialRoute`-style pages, Unified
 * Shop does NOT swap out the gallery's own header: App.tsx renders its
 * normal top header (logo, cart icon, theme toggle, profile menu) here too,
 * with Unified Shop's own cart trigger and "Back to App Gallery" entry
 * folded into it, so the page owns everything below that shared header —
 * just its own in-flow page space, not a `fixed inset-0` overlay.
 */
const UnifiedShopApp: React.FC<UnifiedShopAppProps> = () => {
  const [view, setView] = useState<UnifiedShopView>('shop');

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
      // Same mesh-gradient background the rest of the app paints on <body>
      // (see index.html's --mesh-bg / index.css's .dark override of it) —
      // reused here via the CSS variable so this page matches exactly, in
      // both themes, instead of a flat color.
      style={{ backgroundImage: 'var(--mesh-bg)', backgroundAttachment: 'fixed' }}
    >
      {view === 'checkout' ? (
        <main className="py-4">
          <CheckoutPage onBackToShop={() => setView('shop')} />
        </main>
      ) : (
        <>
          <main className="mx-auto max-w-6xl px-4 py-4">
            <ProductGrid />
          </main>
          <CartDrawer onCheckout={() => setView('checkout')} />
        </>
      )}
    </div>
  );
};

export default UnifiedShopApp;
