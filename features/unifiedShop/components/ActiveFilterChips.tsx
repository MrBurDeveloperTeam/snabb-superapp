import React, { useRef } from 'react';
import { X } from 'lucide-react';
import type { ProductAttribute } from '../types';

interface ActiveFilterChipsProps {
  /** Attributes returned with the current product list (they narrow as filters are applied). */
  attributes: ProductAttribute[];
  /** Flat list of selected product.attribute.value ids across all attributes. */
  value: number[];
  onChange: (valueIds: number[]) => void;
}

/**
 * Row of removable chips for the attribute values currently applied, shown
 * directly below AttributeFilterBar — the same "active filter" chips
 * mrbur.shop renders under its own dropdown bar (one pill per value with an
 * ✕, plus a Clear button with a count).
 *
 * Labels are remembered in a ref as attributes come in: the backend narrows
 * `attributes` as other filters are applied, so a selected value can drop out
 * of the list while it is still active — without the memory, its chip would
 * lose its name (or vanish) even though the filter is still on.
 */
const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ attributes, value, onChange }) => {
  const labels = useRef<Map<number, string>>(new Map());
  for (const attr of attributes) {
    for (const v of attr.values) labels.current.set(v.id, v.name);
  }

  if (value.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(value.filter((v) => v !== id))}
          aria-label={`Remove filter ${labels.current.get(id) ?? id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-tiffany-500 bg-tiffany-50 px-3 py-1.5 text-[13px] font-medium text-tiffany-700 transition-colors hover:bg-tiffany-100 dark:border-tiffany-500 dark:bg-tiffany-950/40 dark:text-tiffany-300 dark:hover:bg-tiffany-950/70"
        >
          <span>{labels.current.get(id) ?? `#${id}`}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange([])}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Clear
        <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
          {value.length}
        </span>
      </button>
    </div>
  );
};

export default ActiveFilterChips;
