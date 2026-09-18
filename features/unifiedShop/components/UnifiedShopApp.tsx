import React, { useState } from 'react';
import ProductGrid from './ProductGrid';
import CartDrawer from './CartDrawer';
import CheckoutPage from './checkout/CheckoutPage';
import PaymentPage from './checkout/PaymentPage';

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

type UnifiedShopView = 'shop' | 'checkout' | 'payment';

/**
 * Stripe's own 3DS/bank-authentication redirect (see PaymentPage.tsx's
 * `stripe.confirmPayment` call) is a full-page navigation away and back —
 * component state doesn't survive that, only the URL does. `return_url` is
 * set to this same page with `?stripe_return=1&tx_ref=<reference>`, so this
 * reads that back off the URL on mount and jumps straight into the
 * `payment` view with the reference to resume, instead of losing the
 * shopper back at the product grid or making them start payment over (and
 * create a second transaction).
 */
function readStripeResume(): { view: UnifiedShopView; reference: string | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_return') === '1') {
      return { view: 'payment', reference: params.get('tx_ref') };
    }
  } catch {
    // window.location unavailable in some edge environment — fall through
  }
  return { view: 'shop', reference: null };
}

/**
 * Top-level Unified Shop screen: browse + search + filter across brands,
 * with a persistent cart, plus (since checkoutHandoff.ts stopped being the
 * first thing the Checkout button does) in-app "Delivery" and "Payment"
 * checkout steps.
 *
 * `view` is local, component-level state rather than another branch of
 * App.tsx's own path-state router — CartDrawer's Checkout button just
 * flips it to 'checkout', CheckoutPage's Confirm flips it to 'payment', and
 * each step's own back link/breadcrumb flips it back, all without leaving
 * the `/unified-shop` route or touching App.tsx. That keeps this feature
 * exactly as self-contained as the rest of it (see this folder's README) —
 * App.tsx still only ever mounts <UnifiedShopApp />, nothing about this
 * view change reaches it. The one exception is Stripe's own redirect for
 * 3DS/bank authentication (see readStripeResume above), which is a real
 * full-page navigation this component has to detect on mount rather than
 * a `view` transition triggered by a click.
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
  const [resume] = useState(readStripeResume);
  const [view, setView] = useState<UnifiedShopView>(resume.view);

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
          <CheckoutPage onBackToShop={() => setView('shop')} onProceedToPayment={() => setView('payment')} />
        </main>
      ) : view === 'payment' ? (
        <main className="py-4">
          <PaymentPage
            onBack={() => setView('checkout')}
            onBackToShop={() => setView('shop')}
            resumeReference={resume.view === 'payment' ? resume.reference : null}
          />
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
