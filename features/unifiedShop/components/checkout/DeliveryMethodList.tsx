import React from 'react';
import type { DeliveryMethod } from '../../types';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

interface DeliveryMethodListProps {
  methods: DeliveryMethod[];
  selectedId: number | false;
  currency: string;
  disabled: boolean;
  onSelect: (carrierId: number) => void;
}

const DeliveryMethodList: React.FC<DeliveryMethodListProps> = ({
  methods,
  selectedId,
  currency,
  disabled,
  onSelect,
}) => {
  if (methods.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-[13px] text-slate-400 dark:border-slate-700">
        No delivery methods are available for this address yet — add a delivery address above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {methods.map((method) => {
        const checked = selectedId === method.id;
        return (
          <label
            key={method.id}
            className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              checked
                ? 'border-tiffany-500 bg-tiffany-50/60 dark:border-tiffany-400 dark:bg-tiffany-950/20'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
            } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="delivery-method"
                className="h-4 w-4 accent-tiffany-500"
                checked={checked}
                disabled={disabled}
                onChange={() => onSelect(method.id)}
              />
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {method.name}
                </span>
                {method.delivery_message && (
                  <span className="text-[11px] text-slate-400">{method.delivery_message}</span>
                )}
              </span>
            </span>
            <span className="text-[13px] font-bold text-slate-900 dark:text-white">
              {formatPrice(method.price, currency)}
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default DeliveryMethodList;
