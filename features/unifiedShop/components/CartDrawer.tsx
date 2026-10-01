import React, { useState } from 'react';
import { X, Minus, Plus, Trash2, Gift } from 'lucide-react';
import { useUnifiedCartStore } from '../store/unifiedCartStore';
import { BRAND_DISPLAY } from './brandMeta';
import { useReservedRewards } from '../hooks/useReservedRewards';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

interface CartDrawerProps {
  /**
   * Switches UnifiedShopApp's own `view` state to the native Delivery
   * checkout step (components/checkout/CheckoutPage.tsx) — an in-app view
   * change, not a network call, so there's no loading state on this
   * button anymore. Building the real Odoo order (and hopping to Odoo's
   * own domain) now happens further down that page, at Confirm — see
   * checkoutHandoff.ts's doc comments for why checkout moved off this
   * button.
   */
  onCheckout: () => void;
  /**
   * The cart stays in localStorage across logout so a returning user gets
   * their items back (see unifiedCartStore's reconcileOwner), but that
   * means a signed-out visitor on the same browser could otherwise see
   * whoever last shopped there. Rather than not persisting the cart, this
   * drawer just doesn't *display* its contents while signed out — the
   * data is untouched underneath and reappears once reconcileOwner
   * confirms who's logged in.
   */
  isLoggedIn: boolean;
}

/** Reward thumbnail: the product image, falling back to a gift icon if it's missing or fails to load. */
const RewardThumb: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-tiffany-100 text-tiffany-600 dark:bg-tiffany-900/50 dark:text-tiffany-300">
        <Gift className="h-6 w-6" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-lg bg-slate-50 object-cover dark:bg-slate-800"
    />
  );
};

const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckout, isLoggedIn }) => {
  const isOpen = useUnifiedCartStore((s) => s.isOpen);
  const close = useUnifiedCartStore((s) => s.close);
  const storedLines = useUnifiedCartStore((s) => s.lines);
  const setQty = useUnifiedCartStore((s) => s.setQty);
  const removeItem = useUnifiedCartStore((s) => s.removeItem);

  // See isLoggedIn's doc comment above — the underlying cart is left
  // alone, only what's rendered is gated.
  const lines = isLoggedIn ? storedLines : [];

  // Redeemed rewards Odoo has already put in this shopper's cart (free lines).
  const reservedRewards = useReservedRewards();
  const rewards = isLoggedIn ? reservedRewards : [];
  const itemCount = lines.length + rewards.length;

  const currency = lines[0]?.currency ?? 'USD';
  const grandTotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  const handleCheckout = () => {
    if (itemCount === 0) return;
    close();
    onCheckout();
  };

  return (
    <>
      {isOpen && (
        <div
          // z-[70]/[80] below: Unified Shop is a real page now (see
          // UnifiedShopApp), not an overlay, so this drawer just needs to
          // clear its own page's sticky z-50 header plus any normal page
          // content — 70/80 leaves comfortable headroom above both.
          className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[1px]"
          onClick={close}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-200 dark:bg-slate-900 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
            Your Cart {itemCount > 0 && `(${itemCount})`}
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {itemCount === 0 ? (
            <p className="mt-10 text-center text-[13px] text-slate-400">
              {isLoggedIn ? 'Your cart is empty.' : 'Log in to see your cart.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rewards.map((reward) => (
                <li
                  key={`reward-${reward.id || reward.code}`}
                  className="flex gap-3 rounded-xl border border-tiffany-200 bg-tiffany-50/60 p-2.5 dark:border-tiffany-900 dark:bg-tiffany-900/30"
                >
                  <RewardThumb src={reward.imageUrl} alt={reward.name} />
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="w-fit rounded-full bg-tiffany-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Reward
                    </span>
                    <p className="text-[12px] font-semibold leading-snug text-slate-800 line-clamp-2 dark:text-slate-100">
                      {reward.name}
                    </p>
                    {reward.benefitSummary && (
                      <p className="text-[11px] leading-snug text-slate-500 line-clamp-2 dark:text-slate-400">
                        {reward.benefitSummary}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Qty 1</span>
                      <span className="text-[13px] font-bold text-tiffany-600 dark:text-tiffany-300">Free</span>
                    </div>
                  </div>
                </li>
              ))}
              {lines.map((line) => {
                const meta = BRAND_DISPLAY[line.brand];
                return (
                  <li
                    key={line.productId}
                    className="flex gap-3 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800"
                  >
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-50 dark:bg-slate-800" >
                      {line.imageUrl && (
                        <img
                          src={line.imageUrl}
                          alt={line.name}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      <span
                        className={`w-fit rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <p className="text-[12px] font-semibold leading-snug text-slate-800 line-clamp-2 dark:text-slate-100">
                        {line.name}
                      </p>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.qty - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.qty + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                          {formatPrice(line.price * line.qty, line.currency)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(line.productId)}
                      className="self-start text-slate-300 hover:text-red-500"
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {itemCount > 0 && (
          <div className="border-t border-slate-100 px-4 py-3.5 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                Total
              </span>
              <span className="text-[17px] font-bold text-slate-900 dark:text-white">
                {lines.length > 0 ? formatPrice(grandTotal, currency) : 'Free'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="w-full rounded-xl bg-tiffany-500 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-tiffany-600"
            >
              Checkout
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
