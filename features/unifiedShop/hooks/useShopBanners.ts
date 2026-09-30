import { useQuery } from '@tanstack/react-query';
import { fetchShopBanners } from '../api/bannersApi';
import type { ShopBrand } from '../types';

export function useShopBanners(brand: ShopBrand | 'all') {
  return useQuery({
    queryKey: ['snabbb-shop', 'banners', brand] as const,
    queryFn: () => fetchShopBanners(brand),
    // Banners change rarely; keep them across brand-tab switches and avoid
    // refetching on every focus.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
