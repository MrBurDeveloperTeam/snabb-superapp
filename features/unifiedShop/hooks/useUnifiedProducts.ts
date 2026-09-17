import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../api/unifiedShopApi';
import type { ProductQuery } from '../types';

// Centralised so ProductGrid.tsx's prefetch-every-brand-tab effect builds
// the exact same queryKey/queryFn as the hook below — prefetching with a
// key that doesn't match byte-for-byte would just populate a cache entry
// nothing ever reads, silently defeating the whole point of warming it.
export function unifiedProductsQueryOptions(query: ProductQuery) {
  return {
    queryKey: ['unified-shop', 'products', query] as const,
    queryFn: () => fetchProducts(query),
    // Product list is fine to sit stale for a bit — avoids a refetch on
    // every keystroke while the debounce below is settling, and keeps a
    // prefetched brand tab from being treated as stale the moment you
    // switch to it.
    staleTime: 30_000,
  };
}

export function useUnifiedProducts(query: ProductQuery) {
  return useQuery({
    ...unifiedProductsQueryOptions(query),
    placeholderData: (previous) => previous,
  });
}
