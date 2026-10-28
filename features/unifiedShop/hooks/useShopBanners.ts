import { useQuery } from '@tanstack/react-query';
import { fetchShopBanners } from '../api/bannersApi';
import type { ShopBanner, ShopBrand } from '../types';

// Last-seen banners are remembered per brand so a repeat visit can start
// downloading the first image immediately instead of waiting for the banner
// list request (list -> image was a two-step chain that dominated LCP).
const cacheKey = (brand: string) => `snabbb-shop:banners:${brand}`;

function readCached(brand: string): ShopBanner[] | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(brand));
    return raw ? (JSON.parse(raw) as ShopBanner[]) : undefined;
  } catch {
    return undefined;
  }
}

function writeCached(brand: string, banners: ShopBanner[]) {
  try {
    localStorage.setItem(cacheKey(brand), JSON.stringify(banners));
  } catch {
    /* storage unavailable — fine */
  }
}

export function useShopBanners(brand: ShopBrand | 'all') {
  return useQuery({
    queryKey: ['snabbb-shop', 'banners', brand] as const,
    queryFn: async () => {
      const banners = await fetchShopBanners(brand);
      writeCached(brand, banners);
      return banners;
    },
    initialData: () => readCached(brand),
    initialDataUpdatedAt: 0, // treat cached data as stale -> still refetch in background
    // Banners change rarely; keep them across brand-tab switches and avoid
    // refetching on every focus.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
