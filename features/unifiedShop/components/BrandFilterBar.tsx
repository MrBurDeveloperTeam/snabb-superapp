import React from 'react';
import { motion } from 'framer-motion';
import { BRANDS, type ShopBrand } from '../types';
import { BRAND_DISPLAY } from './brandMeta';

interface BrandFilterBarProps {
  value: ShopBrand | 'all';
  onChange: (brand: ShopBrand | 'all') => void;
  counts?: Partial<Record<ShopBrand | 'all', number>>;
}

// Shared layoutId across pills — framer-motion animates this single
// background sliding/resizing to whichever pill becomes active, instead of
// it just popping into place. Same spring feel as the rest of the gallery
// (see AppCard.tsx's motion usage).
const ACTIVE_PILL_LAYOUT_ID = 'unified-shop-brand-filter-active-pill';

const pillBase =
  'relative px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors';

const BrandFilterBar: React.FC<BrandFilterBarProps> = ({ value, onChange, counts }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`${pillBase} ${
          value === 'all'
            ? 'text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
      >
        {value === 'all' && (
          <motion.span
            layoutId={ACTIVE_PILL_LAYOUT_ID}
            className="absolute inset-0 rounded-full bg-tiffany-500"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative">
          All Shops{counts?.all != null ? ` (${counts.all})` : ''}
        </span>
      </button>

      {BRANDS.map((brand) => {
        const meta = BRAND_DISPLAY[brand.id];
        const active = value === brand.id;
        return (
          <button
            key={brand.id}
            type="button"
            onClick={() => onChange(brand.id)}
            className={`${pillBase} flex items-center gap-1.5 ${
              active
                ? 'text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {active && (
              <motion.span
                layoutId={ACTIVE_PILL_LAYOUT_ID}
                className="absolute inset-0 rounded-full bg-tiffany-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span
              className="relative inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: active ? '#fff' : meta.dot }}
            />
            <span className="relative">
              {meta.label}
              {counts?.[brand.id] != null ? ` (${counts[brand.id]})` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default BrandFilterBar;
