import React, { useState, useRef, useEffect } from 'react';
import { Controller, Control } from 'react-hook-form';

interface DOBPickerProps {
  control: Control<any>;
  name?: string;
  labelClasses?: string;
  inputClasses?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i); // currentYear down to currentYear-99

export const DOBPicker: React.FC<DOBPickerProps> = ({
  control,
  name = 'dob',
  labelClasses = '',
  inputClasses = '',
  onChange,
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [tempDay, setTempDay] = useState<number | null>(null);
  const [tempMonth, setTempMonth] = useState<number | null>(null); // 1-12
  const [tempYear, setTempYear] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function formatDisplay(day: number | null, month: number | null, year: number | null) {
    if (!day || !month || !year) return '';
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    return `${d}/${m}/${year}`;
  }

  function toISOValue(day: number | null, month: number | null, year: number | null) {
    if (!day || !month || !year) return '';
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  function parseISO(val: string) {
    if (!val) return { day: null, month: null, year: null };
    const [y, m, d] = val.split('-').map(Number);
    return { day: d || null, month: m || null, year: y || null };
  }

  const daysInMonth = tempMonth && tempYear ? getDaysInMonth(tempMonth, tempYear) : 31;
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const parsed = parseISO(field.value || '');
        const displayDay = tempDay ?? parsed.day;
        const displayMonth = tempMonth ?? parsed.month;
        const displayYear = tempYear ?? parsed.year;

        const handleConfirm = () => {
          if (!displayDay || !displayMonth || !displayYear) return;
          const iso = toISOValue(displayDay, displayMonth, displayYear);
          field.onChange(iso);
          if (onChange) {
            const syntheticEvent = {
              target: { value: iso },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
          setOpen(false);
          setTempDay(null);
          setTempMonth(null);
          setTempYear(null);
        };

        const handleOpen = () => {
          // Pre-populate temp from current field value
          const p = parseISO(field.value || '');
          setTempDay(p.day);
          setTempMonth(p.month);
          setTempYear(p.year);
          setOpen(true);
        };

        const handleClear = (e: React.MouseEvent) => {
          e.stopPropagation();
          field.onChange('');
          setTempDay(null);
          setTempMonth(null);
          setTempYear(null);
        };

        return (
          <div className="relative group" ref={ref}>
            {/* Trigger */}
            <div
              className={`${inputClasses} flex items-center cursor-pointer select-none`}
              onClick={handleOpen}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
            >
              <i className="fa-regular fa-calendar text-slate-300 mr-3" />
              <span className={displayDay && displayMonth && displayYear ? 'text-slate-800' : 'text-slate-400'}>
                {displayDay && displayMonth && displayYear
                  ? formatDisplay(displayDay, displayMonth, displayYear)
                  : 'dd/mm/yyyy'}
              </span>
              {field.value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-auto text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              )}
            </div>

            {/* Hidden real input for form validation */}
            <input
              type="hidden"
              value={field.value || ''}
              required={required}
            />

            {/* Dropdown */}
            {open && (
              <div className="absolute z-50 top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-4 w-[300px]">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Date of Birth</p>

                <div className="flex gap-2 mb-4">
                  {/* Day */}
                  <div className="flex flex-col flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Day</label>
                    <select
                      value={displayDay ?? ''}
                      onChange={(e) => setTempDay(Number(e.target.value))}
                      className="border border-slate-200 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-tiffany-500/30 focus:border-tiffany-400 bg-slate-50"
                    >
                      <option value="">--</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div className="flex flex-col flex-[2]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Month</label>
                    <select
                      value={displayMonth ?? ''}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        setTempMonth(m);
                        // Clamp day if needed
                        const maxDay = getDaysInMonth(m, displayYear ?? currentYear);
                        if (displayDay && displayDay > maxDay) setTempDay(maxDay);
                      }}
                      className="border border-slate-200 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-tiffany-500/30 focus:border-tiffany-400 bg-slate-50"
                    >
                      <option value="">--</option>
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div className="flex flex-col flex-[1.5]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Year</label>
                    <select
                      value={displayYear ?? ''}
                      onChange={(e) => setTempYear(Number(e.target.value))}
                      className="border border-slate-200 rounded-xl px-2 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-tiffany-500/30 focus:border-tiffany-400 bg-slate-50"
                    >
                      <option value="">----</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                {displayDay && displayMonth && displayYear && (
                  <div className="bg-slate-50 rounded-xl px-3 py-2 mb-3 text-center">
                    <span className="text-sm font-bold text-slate-700">
                      {String(displayDay).padStart(2, '0')} {MONTHS[(displayMonth ?? 1) - 1]} {displayYear}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!displayDay || !displayMonth || !displayYear}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-tiffany-600 text-white text-sm font-bold hover:bg-tiffany-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
  );
};
