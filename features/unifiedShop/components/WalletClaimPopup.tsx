import React, { useEffect, useState } from 'react';
import { Gift, Check, X } from 'lucide-react';
import {
  claimWalletItem,
  fetchUnclaimedWalletItems,
  type WalletPopupItem,
} from '../api/checkoutApi';

/**
 * "You received a wallet item" popup for /snabbb-shop.
 *
 * Shown once per browser session, right after a logged-in shopper opens the
 * shop, when they hold wallet items (mrbur_wallet) they have not claimed yet.
 * "Claim" only acknowledges the item (the backend stamps claimed_date): it
 * stays Available in My Wallet and is applied from the cart as usual.
 *
 * Backend: unified_shop_api `GET /wallet-unclaimed`, `POST /wallet-claim`
 * (see api/checkoutApi.ts). Mounted by UnifiedShopApp's shop view.
 */

const DISMISS_KEY = 'snabbb_wallet_popup_dismissed';

const readDismissed = () => {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const writeDismissed = (value: boolean) => {
  try {
    if (value) window.sessionStorage.setItem(DISMISS_KEY, '1');
    else window.sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    // storage blocked: the popup may show again on reload, harmless
  }
};

interface WalletClaimPopupProps {
  isLoggedIn: boolean;
}

const WalletClaimPopup: React.FC<WalletClaimPopupProps> = ({ isLoggedIn }) => {
  const [items, setItems] = useState<WalletPopupItem[]>([]);
  const [claimed, setClaimed] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      // Logged out: forget the dismissal so the next login gets the popup again.
      writeDismissed(false);
      setOpen(false);
      return;
    }
    if (readDismissed()) return;

    let cancelled = false;
    fetchUnclaimedWalletItems()
      .then((res) => {
        if (cancelled || !res.items?.length) return;
        setItems(res.items);
        setClaimed(new Set());
        setIdx(0);
        setError('');
        setOpen(true);
      })
      .catch(() => {
        // a popup must never get in the way of shopping
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Close automatically once every item has been claimed.
  useEffect(() => {
    if (!open || !items.length || claimed.size !== items.length) return;
    const t = setTimeout(() => setOpen(false), 700);
    return () => clearTimeout(t);
  }, [open, items, claimed]);

  if (!open) return null;

  const dismiss = () => {
    writeDismissed(true);
    setOpen(false);
  };

  const claim = async (item: WalletPopupItem) => {
    setBusyId(item.id);
    setError('');
    try {
      await claimWalletItem(item.id);
      setClaimed((prev) => new Set(prev).add(item.id));
      // Several items: move on to the next unclaimed one after a short beat.
      const nextIdx = items.findIndex((i) => i.id !== item.id && !claimed.has(i.id));
      if (nextIdx >= 0) setTimeout(() => setIdx(nextIdx), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim this item. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const hasImage = items.some((i) => i.image_url);
  const heading = items.length > 1 ? `You receive new items · ${Math.min(idx, items.length - 1) + 1} of ${items.length}` : 'You receive an item';
  const current = items[Math.min(idx, items.length - 1)];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-[90] flex overflow-y-auto bg-slate-900/55 px-3 pb-4 pt-[84px] backdrop-blur-sm sm:px-4 sm:py-[72px]"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div
        className={`relative m-auto flex max-h-[calc(100dvh-100px)] w-full flex-col overflow-hidden rounded-3xl sm:max-h-none bg-white text-center shadow-[0_24px_80px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 ${
          hasImage ? 'max-w-[800px] sm:h-[min(800px,calc(100vh-144px))] sm:min-h-[480px]' : 'max-w-md'
        }`}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 sm:right-4 sm:top-4 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md ring-1 ring-black/5 transition hover:bg-white hover:text-slate-900"
        >
          <X size={18} />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {[current].map((item) => {
            const done = claimed.has(item.id);
            const chips = [
              item.min_order ? `Min. order ${item.min_order}` : '',
              item.valid_until ? `Valid until ${item.valid_until}` : '',
            ].filter(Boolean);
            return (
              <section
                key={item.id}
                className="flex min-h-0 flex-1 flex-col sm:min-h-full"
              >
                {item.image_url ? (
                  <div className="relative aspect-square max-h-[46dvh] w-full shrink-0 bg-slate-100 sm:aspect-auto sm:max-h-none sm:min-h-[160px] sm:flex-1 sm:shrink dark:bg-slate-800">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="mx-auto mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-tiffany-50 text-tiffany-600 dark:bg-tiffany-900/40 dark:text-tiffany-300">
                    <Gift size={26} />
                  </div>
                )}

                <div className="shrink-0 px-5 pb-1 pt-5 sm:px-10 sm:pb-2 sm:pt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tiffany-600 dark:text-tiffany-300">
                    {heading}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold sm:text-2xl leading-tight text-slate-900 dark:text-slate-50">
                    {item.name}
                  </h3>
                  {chips.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {chips.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={done || busyId === item.id}
                    onClick={() => claim(item)}
                    className={`mt-4 inline-flex h-12 w-full sm:mt-5 sm:h-14 items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-tiffany-200 disabled:opacity-70 ${
                      done ? 'bg-emerald-500' : 'bg-tiffany-600 hover:bg-tiffany-700'
                    }`}
                  >
                    {done ? (
                      <>
                        <Check size={20} /> Claimed
                      </>
                    ) : busyId === item.id ? (
                      'Claiming…'
                    ) : (
                      'Claim'
                    )}
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-10 sm:pb-6">
          {items.length > 1 && (
            <div className="mb-3 flex items-center justify-center gap-2">
              {items.map((it, n) => (
                <button
                  key={it.id}
                  type="button"
                  aria-label={`Show ${it.name}`}
                  onClick={() => setIdx(n)}
                  className={`h-2.5 rounded-full transition-all ${
                    n === Math.min(idx, items.length - 1)
                      ? 'w-6 bg-tiffany-600'
                      : claimed.has(it.id)
                        ? 'w-2.5 bg-emerald-400'
                        : 'w-2.5 bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          )}
          {error && <p className="mb-2 text-[12px] text-red-500">{error}</p>}
          <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            Claimed items are kept in My Wallet. Apply them from your cart at checkout.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 text-[13px] font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletClaimPopup;
