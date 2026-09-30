import React, { useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { useUnifiedProducts, unifiedProductsQueryOptions } from '../hooks/useUnifiedProducts';
import { BRANDS, type ShopBrand, type SortOption, type UnifiedProduct } from '../types';
import BrandFilterBar from './BrandFilterBar';
import AttributeFilterBar from './AttributeFilterBar';
import ShopBannerSlider from './ShopBannerSlider';
import ProductCard from './ProductCard';
import ProductPreviewModal from './ProductPreviewModal';
import ProductDetailPage from './ProductDetailPage';

const ALL_BRAND_TABS: (ShopBrand | 'all')[] = ['all', ...BRANDS.map((b) => b.id)];

// Products per page. Sent explicitly (rather than relying on the backend's
// own default) so the "how many pages" math below and the request always
// agree; must stay <= the backend's MAX_PAGE_SIZE (96).
const PAGE_SIZE = 48;

/** Page numbers to render, with null standing in for a "…" gap. */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Relevance',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  name_asc: 'Name: A to Z',
};

const ProductGrid: React.FC = () => {
  const [brand, setBrand] = useState<ShopBrand | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [attributeValueIds, setAttributeValueIds] = useState<number[]>([]);
  // Which product's quick-view popup (ProductPreviewModal) is open, if any.
  const [previewProduct, setPreviewProduct] = useState<UnifiedProduct | null>(null);
  // Which product's full-page details (ProductDetailPage) are open, if any —
  // this app has no react-router, so this is just view-state on the parent.
  const [detailProduct, setDetailProduct] = useState<UnifiedProduct | null>(null);

  // Debounce the text search only — brand/sort/attribute changes should
  // feel instant.
  const debouncedSetSearch = useMemo(() => debounce(setSearch, 300), []);

  // Page number is stored alongside the filters it belongs to, so changing
  // brand/sort/search/attributes falls back to page 1 in the very same
  // render — no effect, and no flash of "page 3 of the new filter".
  const filterKey = JSON.stringify([brand, sort, search, attributeValueIds]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const goToPage = (p: number) => {
    setPageState({ key: filterKey, page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { data, isLoading, isError, isPlaceholderData } = useUnifiedProducts({
    brand,
    sort,
    search,
    attributeValueIds,
    page,
    pageSize: PAGE_SIZE,
  });

  const products = data?.products ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const attributes = data?.attributes ?? [];

  // Switching shops can switch what's even filterable (Kaneiko's handpieces
  // don't share MR.BUR bur attributes like SHANK/DIAMETER), so a selection
  // from the old brand could silently over-filter — or just dangle — under
  // the new one. Clearing it here matches mrbur.shop's own filters, which
  // are scoped to whatever catalog you're actually looking at.
  useEffect(() => {
    setAttributeValueIds([]);
  }, [brand]);

  // Warm every brand tab's cache up front (on mount, and again whenever
  // search/sort/attribute filters change) so switching brands swaps the
  // grid's key to data that's already sitting in react-query's cache.
  // Without this, the brand-switch transition below could animate in
  // before its fetch resolves — a skeleton, or the previous brand's
  // products, popping to the real list mid-transition, which is the
  // "looks weird" this avoids.
  const queryClient = useQueryClient();
  //
  // PERF: only start warming the *other* tabs once the active tab's own
  // request has actually resolved. Firing all three (All / MR.BUR /
  // Kaneiko) at the same instant made Odoo run three catalog queries in
  // parallel, tying up its workers so the tab the shopper is actually
  // looking at (and every other Odoo request) queued behind them.
  const activeReady = !isLoading && !isPlaceholderData && !!data;
  useEffect(() => {
    if (!activeReady) return;
    ALL_BRAND_TABS.forEach((tab) => {
      if (tab === brand) return; // already fetched by useUnifiedProducts above
      queryClient.prefetchQuery(
        unifiedProductsQueryOptions({
          brand: tab,
          sort,
          search,
          attributeValueIds,
          page: 1,
          pageSize: PAGE_SIZE,
        })
      );
    });
  }, [queryClient, activeReady, brand, sort, search, attributeValueIds]);

  return (
    <div className="flex flex-col gap-4">
      {detailProduct ? (
        <ProductDetailPage product={detailProduct} onBack={() => setDetailProduct(null)} />
      ) : (
        <>
      <ShopBannerSlider brand={brand} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSetSearch(e.target.value);
            }}
            placeholder="Search products across all shops"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-tiffany-500 focus:outline-none focus:ring-1 focus:ring-tiffany-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-[13px] text-slate-700 focus:border-tiffany-500 focus:outline-none focus:ring-1 focus:ring-tiffany-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BrandFilterBar value={brand} onChange={setBrand} />

      <AttributeFilterBar
        attributes={attributes}
        value={attributeValueIds}
        onChange={setAttributeValueIds}
      />

      {/* Keyed by brand (not search/sort) so switching shops — the one
          filter that swaps out the whole catalog — gets a visible
          transition, while typing or re-sorting stays instant. popLayout
          lets the incoming brand's content take over the grid's height
          immediately instead of waiting for the outgoing one to fully
          fade out first. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={brand}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {isLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          )}

          {isError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
              Couldn&apos;t load products right now. Please try again shortly.
            </p>
          )}

          {!isLoading && !isError && products.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-[13px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              No products match your search.
            </p>
          )}

          {!isLoading && !isError && products.length > 0 && (
            <div
              className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 transition-opacity ${
                isPlaceholderData ? 'opacity-60' : ''
              }`}
            >
              {products.map((product) => (
                <ProductCard
                  key={`${product.brand}-${product.id}`}
                  product={product}
                  onSelect={setPreviewProduct}
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && totalPages > 1 && (
            <nav
              aria-label="Product pages"
              className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageWindow(page, totalPages).map((p, i) =>
                p === null ? (
                  <span key={`gap-${i}`} className="px-1 text-[13px] text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`h-9 min-w-9 rounded-xl border px-2.5 text-[13px] font-medium ${
                      p === page
                        ? 'border-tiffany-500 bg-tiffany-500 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-tiffany-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}

          {!isLoading && !isError && (data?.total ?? 0) > 0 && (
            <p className="mt-2 text-center text-[12px] text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, data?.total ?? 0)} of {data?.total}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
        </>
      )}

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onViewDetails={(p) => {
          setDetailProduct(p);
          setPreviewProduct(null);
        }}
      />
    </div>
  );
};

export default ProductGrid;
