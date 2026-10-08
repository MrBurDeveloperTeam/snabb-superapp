import React, { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { claimReward, releaseReward } from '../api/checkoutApi';
import { CART_TOAST_STYLE } from './cartToastStyle';
import { X, Minus, Plus, Trash2, Gift } from 'lucide-react';
import { useUnifiedCartStore } from '../store/unifiedCartStore';
import { BRAND_DISPLAY } from './brandMeta';
import {
  useCartDiscountSummary,
  usePrefetchCheckoutState,
  useRemoveCartDiscount,
  useCartWallet,
  useCartWalletActions,
} from '../hooks/useCheckoutState';
import {
  RESERVED_REWARDS_QUERY_KEY,
  useAvailableRewards,
  useReservedRewards,
  type ReservedReward,
} from '../hooks/useReservedRewards';

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
  const allAvailableRewards = useAvailableRewards();
  const availableRewards = isLoggedIn ? allAvailableRewards : [];
  const queryClient = useQueryClient();
  const [removingCode, setRemovingCode] = useState<string | null>(null);

  // Warm up checkout while the drawer is open: ~1s after the last quantity
  // edit, start the server-side order sync so it's (mostly) done by the time
  // the shopper presses Checkout. See usePrefetchCheckoutState.
  // Paused while a reward is being added/removed: both requests rewrite the
  // same Odoo order, and running them at once makes each wait on the other's
  // database locks (the slow reward-claim + slow state calls seen together).
  // It resumes (and re-syncs, since the order just changed) when that ends.
  usePrefetchCheckoutState(
    isOpen && isLoggedIn && removingCode === null,
    lines.map((l) => ({ productId: l.productId, qty: l.qty, unitId: l.unitId }))
  );
  // Discounts the server has applied (typed promo code, automatic promos,
  // free shipping). The drawer's lines are the local cart and don't include them.
  const discountSummary = useCartDiscountSummary(
    isOpen && isLoggedIn,
    lines.map((l) => ({ productId: l.productId, qty: l.qty, unitId: l.unitId }))
  );

  const removeCartDiscount = useRemoveCartDiscount(
    lines.map((l) => ({ productId: l.productId, qty: l.qty, unitId: l.unitId }))
  );
  const [removingDiscountId, setRemovingDiscountId] = useState<number | string | null>(null);

  // mrbur_wallet items (fixed / percentage discount, free shipping) the shopper owns.
  const walletLines = lines.map((l) => ({ productId: l.productId, qty: l.qty, unitId: l.unitId }));
  const wallet = useCartWallet(isOpen && isLoggedIn, walletLines);
  const walletActions = useCartWalletActions(walletLines);
  const [walletBusyId, setWalletBusyId] = useState<number | null>(null);
  const handleWallet = async (itemId: number, mode: 'apply' | 'remove') => {
    setWalletBusyId(itemId);
    try {
      if (mode === 'apply') {
        await walletActions.apply(itemId);
        toast.success('Wallet item applied!', { style: CART_TOAST_STYLE });
      } else {
        await walletActions.remove(itemId);
        toast.success('Wallet item removed — it is back in your wallet.', { style: CART_TOAST_STYLE });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your wallet item.', {
        style: CART_TOAST_STYLE,
      });
    } finally {
      setWalletBusyId(null);
    }
  };
  const handleRemoveDiscount = async (id: number | string) => {
    if (typeof id !== 'number') return;
    setRemovingDiscountId(id);
    try {
      await removeCartDiscount(id);
      toast.success('Discount removed.', { style: CART_TOAST_STYLE });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove this discount.', {
        style: CART_TOAST_STYLE,
      });
    } finally {
      setRemovingDiscountId(null);
    }
  };

  // Flip a reward's state in the cached list right away, so the drawer shows
  // the result the moment the claim/release request succeeds instead of also
  // waiting for the rewards list to be re-downloaded (a second slow call).
  const markRewardState = (code: string, state: ReservedReward['state']) => {
    queryClient.setQueriesData<ReservedReward[]>({ queryKey: RESERVED_REWARDS_QUERY_KEY }, (old) =>
      old ? old.map((r) => (r.code === code ? { ...r, state } : r)) : old
    );
  };

  const handleAddReward = async (code: string) => {
    setRemovingCode(code);
    try {
      await claimReward(code);
      markRewardState(code, 'reserved');
      // Confirm against the server in the background — don't make the
      // shopper wait for it.
      void queryClient.invalidateQueries({ queryKey: RESERVED_REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['snabbb-shop', 'checkout', 'state'] });
      toast.success('Reward added to your cart!', { style: CART_TOAST_STYLE });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add this reward.', { style: CART_TOAST_STYLE });
    } finally {
      setRemovingCode(null);
    }
  };

  const handleRemoveReward = async (code: string) => {
    setRemovingCode(code);
    try {
      await releaseReward(code);
      markRewardState(code, 'active');
      void queryClient.invalidateQueries({ queryKey: RESERVED_REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['snabbb-shop', 'checkout', 'state'] });
      toast.success('Reward removed — you can add it back under Available rewards.', { style: CART_TOAST_STYLE });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove this reward.', { style: CART_TOAST_STYLE });
    } finally {
      setRemovingCode(null);
    }
  };

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
                    <div className="flex items-center justify-between">
                      <span className="w-fit rounded-full bg-tiffany-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Reward
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveReward(reward.code)}
                        disabled={removingCode === reward.code}
                        aria-label={`Remove ${reward.name} from cart`}
                        title="Don't use this reward in this order"
                        className="text-slate-300 transition hover:text-red-500 disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                    key={`${line.productId}:${line.unitId ?? 0}`}
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
                      {line.unitName && (
                        <p className="text-[11px] text-slate-400">{line.unitName}</p>
                      )}

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.qty - 1, line.unitId)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.qty + 1, line.unitId)}
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
                      onClick={() => removeItem(line.productId, line.unitId)}
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

          {availableRewards.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Available rewards
              </h3>
              <ul className="flex flex-col gap-3">
                {availableRewards.map((reward) => (
                  <li
                    key={`available-${reward.id || reward.code}`}
                    className="flex gap-3 rounded-xl border border-dashed border-tiffany-300 p-2.5 dark:border-tiffany-800"
                  >
                    <RewardThumb src={reward.imageUrl} alt={reward.name} />
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-[12px] font-semibold leading-snug text-slate-800 line-clamp-2 dark:text-slate-100">
                        {reward.name}
                      </p>
                      {reward.benefitSummary && (
                        <p className="text-[11px] leading-snug text-slate-500 line-clamp-2 dark:text-slate-400">
                          {reward.benefitSummary}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddReward(reward.code)}
                        disabled={removingCode === reward.code}
                        className="mt-auto w-fit rounded-full bg-tiffany-500 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-tiffany-600 disabled:opacity-50"
                      >
                        {removingCode === reward.code ? 'Adding…' : 'Add to cart'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {wallet && (
            <div className="mt-5">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                My wallet
              </h3>
              <ul className="flex flex-col gap-3">
                {wallet.applied.map((item) => (
                  <li
                    key={`wallet-applied-${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        -{formatPrice(item.amount, currency)} applied
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleWallet(item.id, 'remove')}
                      disabled={walletBusyId === item.id}
                      className="shrink-0 text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {walletBusyId === item.id ? 'Removing…' : 'Remove'}
                    </button>
                  </li>
                ))}
                {wallet.available.map((item) => (
                  <li
                    key={`wallet-available-${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 p-2.5 dark:border-amber-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Save {formatPrice(item.amount, currency)}
                        {item.valid_until ? ` · valid until ${item.valid_until}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleWallet(item.id, 'apply')}
                      disabled={walletBusyId === item.id}
                      className="shrink-0 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                    >
                      {walletBusyId === item.id ? 'Applying…' : 'Apply'}
                    </button>
                  </li>
                ))}
                {wallet.unavailable.map((item) => (
                  <li key={`wallet-unavailable-${item.id}`} className="rounded-xl border border-slate-100 p-2.5 opacity-70 dark:border-slate-800">
                    <p className="truncate text-[12px] font-semibold text-slate-600 dark:text-slate-300">{item.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {itemCount > 0 && (
          <div className="border-t border-slate-100 px-4 py-3.5 dark:border-slate-800">
            {discountSummary && (
              <ul className="mb-2 space-y-1">
                {discountSummary.discounts.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="truncate font-medium text-emerald-700 dark:text-emerald-400">
                      {d.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatPrice(d.amount, currency)}
                      </span>
                      {d.removable && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDiscount(d.id)}
                          disabled={removingDiscountId === d.id}
                          aria-label={`Remove ${d.name}`}
                          className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-slate-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {discountSummary ? 'Total after discounts' : 'Total'}
              </span>
              <span className="text-[17px] font-bold text-slate-900 dark:text-white">
                {lines.length > 0
                  ? formatPrice(discountSummary ? discountSummary.totalAfterDiscounts : grandTotal, currency)
                  : 'Free'}
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
