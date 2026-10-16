import React from 'react';

interface UnitSelectProps {
  options: { id: number; name: string }[];
  value: number | undefined;
  onChange: (id: number) => void;
  fallbackLabel?: string;
  loading?: boolean;
}

/** Real <select> when a product has several units, plain label otherwise. */
const UnitSelect: React.FC<UnitSelectProps> = ({ options, value, onChange, fallbackLabel, loading }) => {
  if (options.length < 2) {
    if (!fallbackLabel) return null;
    return (
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Unit</label>
        <div className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {fallbackLabel}
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Unit</label>
      <select
        value={value}
        disabled={loading}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-tiffany-500 focus:outline-none focus:ring-1 focus:ring-tiffany-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default UnitSelect;
