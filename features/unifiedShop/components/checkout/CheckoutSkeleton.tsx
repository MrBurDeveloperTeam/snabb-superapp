import React from 'react';
import type { CartLine } from '../../types';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />
);

interface CheckoutSkeletonProps {
  /** The shopper's local cart — already in memory, so it can render now. */
  lines: CartLine[];
  onBackToShop: () => void;
  onReviewOrder?: () => void;
}

/**
 * Shown the instant the Delivery step opens, while GET /checkout/state is
 * still in flight (it can take a couple of seconds: Odoo syncs the order,
 * re-runs promotions and rates delivery). The page layout and the cart
 * items come from the local cart store immediately; only what genuinely
 * needs the server — addresses, delivery methods, rewards, totals — shows
 * placeholders. The real page replaces this the moment the state arrives.
 */
const CheckoutSkeleton: React.FC<CheckoutSkeletonProps> = ({ lines, onBackToShop, onReviewOrder }) => {
  const currency = lines[0]?.currency ?? 'MYR';
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const estSubtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4" aria-busy="true" aria-live="polite">
      <nav className="mb-5 flex items-center gap-2 text-[13px] font-semibold text-slate-400">
        <button
          type="button"
          onClick={onReviewOrder ?? onBackToShop}
          className="text-tiffany-600 hover:underline dark:text-tiffany-400"
        >
          Review Order
        </button>
        <span>›</span>
        <span className="text-slate-900 dark:text-white">Delivery</span>
        <span>›</span>
        <span className="text-slate-300 dark:text-slate-600">Payment</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Delivery address
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-slate-200 p-4 dark:border-slate-700">
                <Bar className="h-3.5 w-32" />
                <Bar className="mt-3 h-3 w-48" />
                <Bar className="mt-2 h-3 w-40" />
                <Bar className="mt-2 h-3 w-24" />
              </div>
              <div className="min-h-[96px] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Choose a delivery method
            </h2>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <Bar className="h-3.5 w-40" />
              <Bar className="h-3.5 w-16" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Billing address
            </h2>
            <Bar className="h-4 w-56" />
          </section>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[15px] font-bold text-slate-900 dark:text-white">Order summary</p>
            <p className="mb-4 text-[12px] text-slate-400">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>

            {lines.length > 0 && (
              <div className="mb-3 flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                {lines.map((line) => (
                  <div key={`${line.productId}:${line.unitId ?? 0}`} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                      {line.imageUrl && (
                        <img src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                      {line.qty} x {line.name}
                    </p>
                    <span className="shrink-0 text-[12px] font-bold text-slate-900 dark:text-white">
                      {formatPrice(line.price * line.qty, line.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate-500 dark:text-slate-400">Subtotal (before discounts)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {formatPrice(estSubtotal, currency)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[13px]">
              <span className="text-slate-500 dark:text-slate-400">Delivery</span>
              <Bar className="h-3.5 w-14" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[15px] font-bold text-slate-900 dark:text-white">Total</span>
              <Bar className="h-5 w-24" />
            </div>

            <button
              type="button"
              disabled
              className="mt-5 w-full cursor-not-allowed rounded-xl bg-tiffany-500/40 py-3 text-[14px] font-bold text-white"
            >
              Confirm
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">Loading delivery options and rewards…</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSkeleton;
