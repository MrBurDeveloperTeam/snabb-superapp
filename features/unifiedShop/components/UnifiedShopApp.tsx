import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { RESERVED_REWARDS_QUERY_KEY } from '../hooks/useReservedRewards';
import { claimReward } from '../api/checkoutApi';
import { CART_TOAST_STYLE } from './cartToastStyle';
import ProductGrid from './ProductGrid';
import CartDrawer from './CartDrawer';
import WalletClaimPopup from './WalletClaimPopup';
import CheckoutPage from './checkout/CheckoutPage';
import PaymentPage from './checkout/PaymentPage';
import SequenceAdminPage from './SequenceAdminPage';
import { ListOrdered } from 'lucide-react';
import { useUnifiedCartStore } from '../store/unifiedCartStore';

export interface UnifiedShopAppProps {
  /**
   * Returns to the app gallery — App.tsx wires this to `navigate('/')`.
   * Kept for backwards compatibility (and as an escape hatch for a future
   * caller that doesn't render the shared header), but the shared header's
   * brand mark and its "Back to App Gallery" menu entry already cover this
   * in the normal App.tsx flow, so nothing in this component calls it now.
   */
  onBack?: () => void;
  /** Forwarded to CartDrawer — see its isLoggedIn prop doc comment. */
  isLoggedIn: boolean;
  /** Shows the "Arrange products" entry (accountType === 'admin'; Odoo re-checks server-side). */
  isAdmin?: boolean;
}

type UnifiedShopView = 'shop' | 'checkout' | 'payment' | 'sequence';

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
/**
 * Deep links from reward.snabbb.com:
 *   /snabbb-shop?claim_reward=<code>  claim that redeemed reward into the cart, then open checkout
 *   /snabbb-shop?open=checkout        open checkout directly (reward already reserved in the cart)
 */
function readRewardDeepLink(): { claimCode: string | null; openCheckout: boolean } {
  try {
    const params = new URLSearchParams(window.location.search);
    const claimCode = params.get('claim_reward')?.trim() || null;
    return { claimCode, openCheckout: params.get('open') === 'checkout' };
  } catch {
    return { claimCode: null, openCheckout: false };
  }
}

function clearRewardDeepLink() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('claim_reward');
    url.searchParams.delete('open');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // ignore — a leftover query string is harmless
  }
}

const UnifiedShopApp: React.FC<UnifiedShopAppProps> = ({ isLoggedIn, isAdmin = false }) => {
  const [resume] = useState(readStripeResume);
  const [deepLink] = useState(readRewardDeepLink);
  const [view, setView] = useState<UnifiedShopView>(
    window.location.pathname === '/snabbb-shop/admin/sequence' ? 'sequence' : resume.view
  );
  const [claimingFromLink, setClaimingFromLink] = useState(Boolean(deepLink.claimCode));
  const handledDeepLink = useRef(false);
  const queryClient = useQueryClient();

  // Breadcrumb "Review Order": back to the shop with the cart drawer open.
  const reviewOrder = () => {
    setView('shop');
    useUnifiedCartStore.getState().open();
  };

  // Wait until the shopper is signed in (the claim needs their Odoo session),
  // then claim once and land them in checkout with the reward applied.
  useEffect(() => {
    if (handledDeepLink.current) return;
    if (!deepLink.claimCode && !deepLink.openCheckout) return;
    if (!isLoggedIn) return;
    handledDeepLink.current = true;

    const finish = () => {
      queryClient.invalidateQueries({ queryKey: RESERVED_REWARDS_QUERY_KEY });
      clearRewardDeepLink();
      setClaimingFromLink(false);
      setView('checkout');
    };

    if (!deepLink.claimCode) {
      finish();
      return;
    }

    claimReward(deepLink.claimCode)
      .then(() => toast.success('Reward added to your cart!', { style: CART_TOAST_STYLE }))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Could not claim this reward.', {
          style: CART_TOAST_STYLE,
        })
      )
      .finally(finish);
  }, [isLoggedIn, deepLink, queryClient]);

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
      // Same mesh-gradient background the rest of the app paints on <body>
      // (see index.html's --mesh-bg / index.css's .dark override of it) —
      // reused here via the CSS variable so this page matches exactly, in
      // both themes, instead of a flat color.
      style={{ backgroundImage: 'var(--mesh-bg)', backgroundAttachment: 'fixed' }}
    >
      {claimingFromLink ? (
        <main className="py-16 text-center text-[13px] text-slate-400">
          {isLoggedIn ? 'Adding your reward to your cart…' : 'Please log in to claim your reward.'}
        </main>
      ) : view === 'sequence' && isAdmin ? (
        <SequenceAdminPage
          onBack={() => {
            if (window.location.pathname !== '/snabbb-shop') window.history.replaceState(null, '', '/snabbb-shop');
            setView('shop');
          }}
        />
      ) : view === 'checkout' ? (
        <main className="py-4">
          <CheckoutPage onBackToShop={() => setView('shop')} onReviewOrder={reviewOrder} onProceedToPayment={() => setView('payment')} />
        </main>
      ) : view === 'payment' ? (
        <main className="py-4">
          <PaymentPage
            onBack={() => setView('checkout')}
            onBackToShop={() => setView('shop')}
            onReviewOrder={reviewOrder}
            resumeReference={resume.view === 'payment' ? resume.reference : null}
          />
        </main>
      ) : (
        <>
          <main className="mx-auto max-w-6xl px-4 py-4">
            {isAdmin && (
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setView('sequence')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-tiffany-300 bg-white px-3 py-1.5 text-[12px] font-medium text-tiffany-700 hover:bg-tiffany-50 dark:bg-slate-900 dark:text-tiffany-300"
                >
                  <ListOrdered size={14} /> Arrange products
                </button>
              </div>
            )}
            <ProductGrid />
          </main>
          <CartDrawer onCheckout={() => setView('checkout')} isLoggedIn={isLoggedIn} />
          <WalletClaimPopup isLoggedIn={isLoggedIn} />
        </>
      )}
    </div>
  );
};

export default UnifiedShopApp;
