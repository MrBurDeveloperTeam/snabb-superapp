import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ClaimableReward, CreditWalletState } from '../../types';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

interface OrderSummaryProps {
  itemCount: number;
  currency: string;
  amountSubtotal: number;
  amountDelivery: number;
  amountTax: number;
  amountTotal: number;
  rewards: ClaimableReward[];
  credit: CreditWalletState | undefined;
  claimingRewardId: number | null;
  rewardError: string | null;
  onClaimReward: (reward: ClaimableReward) => void;
  onApplyCode: (code: string) => void;
  applyingCode: boolean;
  creditToggling: boolean;
  onToggleCredit: (useCredit: boolean) => void;
  confirmDisabled: boolean;
  confirming: boolean;
  confirmError: string | null;
  onConfirm: () => void;
  onBackToCart: () => void;
}

/**
 * Right-hand order summary — subtotal/delivery/taxes/total, a discount
 * code field, the "Snabbb reward ready to claim" card and the "Pay with
 * Snabbb Credit" toggle, and the Confirm button. Mirrors the layout of
 * mrbur.odoo.com's own /shop/checkout sidebar (reward picker +
 * snabbb_credit_checkout_switch), rebuilt natively here against
 * /api/unified-shop/checkout/* instead of those widgets' own
 * session-cookie routes.
 */
const OrderSummary: React.FC<OrderSummaryProps> = ({
  itemCount,
  currency,
  amountSubtotal,
  amountDelivery,
  amountTax,
  amountTotal,
  rewards,
  credit,
  claimingRewardId,
  rewardError,
  onClaimReward,
  onApplyCode,
  applyingCode,
  creditToggling,
  onToggleCredit,
  confirmDisabled,
  confirming,
  confirmError,
  onConfirm,
  onBackToCart,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [codeInput, setCodeInput] = useState('');

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-left">
          <span className="block text-[15px] font-bold text-slate-900 dark:text-white">Order summary</span>
          <span className="block text-[12px] text-slate-400">
            {itemCount} item{itemCount === 1 ? '' : 's'} — {formatPrice(amountSubtotal, currency)}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500 dark:text-slate-400">Delivery</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {formatPrice(amountDelivery, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {formatPrice(amountSubtotal, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500 dark:text-slate-400">Taxes</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {formatPrice(amountTax, currency)}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
            <span className="text-[14px] font-bold text-slate-900 dark:text-white">Total</span>
            <span className="text-[17px] font-bold text-slate-900 dark:text-white">
              {formatPrice(amountTotal, currency)}
            </span>
          </div>
        </div>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!codeInput.trim()) return;
          onApplyCode(codeInput.trim());
        }}
      >
        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="Gift card or discount code…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800 outline-none focus:border-tiffany-500 focus:ring-1 focus:ring-tiffany-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={applyingCode || !codeInput.trim()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-[12px] font-bold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          {applyingCode ? 'Applying…' : 'Apply'}
        </button>
      </form>

      {rewardError && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {rewardError}
        </p>
      )}

      {rewards.map((reward) => (
        <div
          key={reward.id}
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30"
        >
          <p className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">
            Snabbb reward ready to claim
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {reward.benefit_summary || 'Free redemption'}
          </p>
          <p className="text-[12px] text-emerald-800 dark:text-emerald-200">
            {reward.reward_name} · Code {reward.code_masked}
          </p>
          <button
            type="button"
            onClick={() => onClaimReward(reward)}
            disabled={claimingRewardId === reward.id}
            className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {claimingRewardId === reward.id ? 'Claiming…' : 'Claim'}
          </button>
        </div>
      ))}

      {confirmError && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {confirmError}
        </p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled || confirming}
        className="mt-4 w-full rounded-xl bg-tiffany-500 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-tiffany-600 disabled:opacity-50 disabled:hover:bg-tiffany-500"
      >
        {confirming ? 'Preparing payment…' : 'Confirm'}
      </button>

      {credit && (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
            Pay with Snabbb Credit
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            Use your available Snabbb Credit for this order.
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              100 Snabbb Credit = 1.00 order currency
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={credit.use_credit}
              disabled={creditToggling}
              onClick={() => onToggleCredit(!credit.use_credit)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                credit.use_credit ? 'bg-tiffany-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  credit.use_credit ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Available balance: <span className="font-semibold text-slate-600 dark:text-slate-300">{credit.formatted_balance} Snabbb Credit</span>
          </p>
          {credit.use_credit && credit.redeemed_credits > 0 && (
            <p className="mt-1 text-[11px] text-tiffany-600 dark:text-tiffany-400">
              Redeeming {credit.redeemed_credits.toLocaleString()} credits ({formatPrice(credit.redeemed_amount, currency)})
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-300">
        <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        or
        <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>

      <button
        type="button"
        onClick={onBackToCart}
        className="mt-3 w-full text-center text-[12px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← Back to cart
      </button>
    </div>
  );
};

export default OrderSummary;
