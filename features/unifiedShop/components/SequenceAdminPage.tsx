import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUp, ArrowDown, ChevronsUp, Download, GripVertical, Search, Save, Upload } from 'lucide-react';
import type { ShopBrand } from '../types';
import { fetchSequenceProducts, saveSequence, type SequenceProduct } from '../api/sequenceAdminApi';
import { CART_TOAST_STYLE } from './cartToastStyle';
import { exportSequenceToExcel, importSequenceFromExcel } from '../utils/sequenceExcel';

const BRANDS: { id: ShopBrand; label: string }[] = [
  { id: 'mrbur', label: 'MR.BUR' },
  { id: 'kaneiko', label: 'Kaneiko' },
];

interface Props {
  onBack: () => void;
}

const SequenceAdminPage: React.FC<Props> = ({ onBack }) => {
  const queryClient = useQueryClient();
  const [brand, setBrand] = useState<ShopBrand>('mrbur');
  const [items, setItems] = useState<SequenceProduct[]>([]);
  const [original, setOriginal] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSequenceProducts(brand)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setOriginal(rows.map((r) => r.id));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load products.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [brand]);

  const dirty = useMemo(
    () => items.length !== original.length || items.some((p, i) => p.id !== original[i]),
    [items, original]
  );

  const move = (id: number, toIndex: number) => {
    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === id);
      if (from < 0) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item);
      return next;
    });
  };

  const switchBrand = (next: ShopBrand) => {
    if (next === brand) return;
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setQuery('');
    setBrand(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSequence(items.map((p) => p.id));
      setOriginal(items.map((p) => p.id));
      queryClient.invalidateQueries({ queryKey: ['snabbb-shop', 'products'] });
      toast.success('Product order saved', { style: CART_TOAST_STYLE });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.', { style: CART_TOAST_STYLE });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (items.length === 0) return;
    setExcelBusy(true);
    try {
      await exportSequenceToExcel(brand, items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not export.', { style: CART_TOAST_STYLE });
    } finally {
      setExcelBusy(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    setExcelBusy(true);
    try {
      const result = await importSequenceFromExcel(file, items);
      const byId = new Map(items.map((p) => [p.id, p]));
      setItems(result.orderedIds.map((id) => byId.get(id)!).filter(Boolean));
      const notes = [
        result.unknownRows ? `${result.unknownRows} unknown row(s) skipped` : '',
        result.duplicateRows ? `${result.duplicateRows} duplicate row(s) ignored` : '',
        result.missingFromFile ? `${result.missingFromFile} product(s) not in file moved to the end` : '',
      ].filter(Boolean);
      toast.success(
        `Imported order for ${result.matched} product(s). Press "Save order" to apply.` +
          (notes.length ? ` (${notes.join('; ')})` : ''),
        { style: CART_TOAST_STYLE, duration: 8000 }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not import.', { style: CART_TOAST_STYLE });
    } finally {
      setExcelBusy(false);
    }
  };

  const q = query.trim().toLowerCase();
  const filtering = q.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
            onBack();
          }}
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-tiffany-600"
        >
          <ArrowLeft size={15} /> Back to shop
        </button>
        <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleImportFile}
        />
        <button
          onClick={handleExport}
          disabled={loading || items.length === 0 || excelBusy}
          title="Download this brand's current order as an Excel file"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Download size={14} /> Export
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || items.length === 0 || excelBusy}
          title="Load an order from an Excel file (not saved until you press Save order)"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <Upload size={14} /> Import
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-tiffany-500 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-tiffany-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={14} /> {saving ? 'Saving…' : 'Save order'}
        </button>
        </div>
      </div>

      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Arrange products</h1>
      <p className="mb-4 text-[13px] text-slate-500 dark:text-slate-400">
        Drag products (or use the arrows) to choose which show first in the shop. Each brand has its own order.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {BRANDS.map((b) => (
          <button
            key={b.id}
            onClick={() => switchBrand(b.id)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
              brand === b.id
                ? 'bg-tiffany-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {b.label}
          </button>
        ))}
        <div className="relative ml-auto min-w-[180px] flex-1 sm:flex-none sm:w-60">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or SKU"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-[13px] outline-none focus:border-tiffany-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {filtering && (
        <p className="mb-2 text-[12px] text-slate-400">Clear the search to drag-reorder; arrows still work while filtering.</p>
      )}

      {loading ? (
        <div className="py-12 text-center text-[13px] text-slate-400">Loading products…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-600 dark:border-red-900 dark:bg-red-950/40">
          {error}
        </div>
      ) : (
        <ol className="space-y-1.5">
          {items.map((p, index) => {
            if (filtering && !`${p.name} ${p.sku}`.toLowerCase().includes(q)) return null;
            return (
              <li
                key={p.id}
                draggable={!filtering}
                onDragStart={() => setDragId(p.id)}
                onDragOver={(e) => {
                  if (dragId === null) return;
                  e.preventDefault();
                  setOverId(p.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId !== null && dragId !== p.id) move(dragId, index);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={`flex items-center gap-3 rounded-lg border bg-white p-2 dark:bg-slate-900 ${
                  overId === p.id && dragId !== p.id
                    ? 'border-tiffany-400 ring-1 ring-tiffany-300'
                    : 'border-slate-200 dark:border-slate-800'
                } ${dragId === p.id ? 'opacity-40' : ''}`}
              >
                <GripVertical size={16} className={filtering ? 'text-slate-200' : 'cursor-grab text-slate-400'} />
                <span className="w-7 text-center text-[12px] font-semibold tabular-nums text-slate-400">{index + 1}</span>
                <img
                  src={p.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 flex-none rounded-md bg-slate-100 object-cover dark:bg-slate-800"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{p.name}</div>
                  {p.sku && <div className="truncate text-[11px] text-slate-400">{p.sku}</div>}
                </div>
                <div className="flex flex-none items-center gap-0.5">
                  <button title="Move to top" disabled={index === 0} onClick={() => move(p.id, 0)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-tiffany-600 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ChevronsUp size={15} />
                  </button>
                  <button title="Move up" disabled={index === 0} onClick={() => move(p.id, index - 1)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-tiffany-600 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowUp size={15} />
                  </button>
                  <button title="Move down" disabled={index === items.length - 1} onClick={() => move(p.id, index + 1)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-tiffany-600 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowDown size={15} />
                  </button>
                </div>
              </li>
            );
          })}
          {items.length === 0 && <li className="py-8 text-center text-[13px] text-slate-400">No products for this brand.</li>}
        </ol>
      )}
    </div>
  );
};

export default SequenceAdminPage;
