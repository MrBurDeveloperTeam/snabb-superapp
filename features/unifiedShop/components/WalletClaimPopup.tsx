import React, { useEffect, useState } from 'react';
import { Gift, Check } from 'lucide-react';
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim this item. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wallet item received"
      className="fixed inset-0 z-[90] flex overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div
        className={`m-auto w-full rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900 ${
          items.some((i) => i.image_url) ? 'max-w-[852px]' : 'max-w-lg'
        }`}
      >
        {!items.some((i) => i.image_url) && (
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-tiffany-100 text-tiffany-600 dark:bg-tiffany-900/50 dark:text-tiffany-300">
            <Gift size={28} />
          </div>
        )}
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          {items.length > 1 ? 'You received new wallet items!' : 'You received a wallet item!'}
        </h3>

        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const done = claimed.has(item.id);
            const notes = [
              item.min_order ? `Min. order ${item.min_order}` : '',
              item.valid_until ? `Valid until ${item.valid_until}` : '',
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-dashed border-tiffany-300 bg-tiffany-50/60 text-left dark:border-tiffany-800 dark:bg-tiffany-900/30"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="mx-auto block aspect-square w-full object-cover lg:h-[800px] lg:w-[800px] lg:max-w-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    {item.name}
                  </div>
                  {notes && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{notes}</div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={done || busyId === item.id}
                  onClick={() => claim(item)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-[12px] font-bold text-white transition disabled:opacity-60 ${
                    done ? 'bg-emerald-500' : 'bg-tiffany-500 hover:bg-tiffany-600'
                  }`}
                >
                  {done ? (
                    <>
                      <Check size={14} /> Claimed
                    </>
                  ) : (
                    'Claim'
                  )}
                </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

        <p className="mb-1 mt-4 text-[11px] text-slate-500 dark:text-slate-400">
          Claimed items are kept in My Wallet. Apply them from your cart at checkout.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="text-[12px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default WalletClaimPopup;
