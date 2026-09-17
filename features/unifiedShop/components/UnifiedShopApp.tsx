import React from 'react';
import ProductGrid from './ProductGrid';
import CartDrawer from './CartDrawer';

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

/**
 * Top-level Unified Shop screen: browse + search + filter across brands,
 * with a persistent cart.
 *
 * Rendered by App.tsx as a real page at the `/unified-shop` route (its own
 * lightweight `path`-state router — see the `isUnifiedShopRoute` wiring
 * there). Unlike most of the other `isTutorialRoute`-style pages, Unified
 * Shop does NOT swap out the gallery's own header: App.tsx renders its
 * normal top header (logo, cart icon, theme toggle, profile menu) here too,
 * with Unified Shop's own cart trigger and "Back to App Gallery" entry
 * folded into it, so the page owns everything below that shared header —
 * just its own in-flow page space, not a `fixed inset-0` overlay. (This
 * used to be exactly that overlay, and before that had its own bespoke
 * header — kept only as history here in case the git blame on this file is
 * ever useful.)
 */
const UnifiedShopApp: React.FC<UnifiedShopAppProps> = () => {
  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
      // Same mesh-gradient background the rest of the app paints on <body>
      // (see index.html's --mesh-bg / index.css's .dark override of it) —
      // reused here via the CSS variable so this page matches exactly, in
      // both themes, instead of a flat color.
      style={{ backgroundImage: 'var(--mesh-bg)', backgroundAttachment: 'fixed' }}
    >
      <main className="mx-auto max-w-6xl px-4 py-4">
        <ProductGrid />
      </main>

      <CartDrawer />
    </div>
  );
};

export default UnifiedShopApp;
