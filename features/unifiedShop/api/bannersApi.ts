import type { ShopBanner, ShopBrand } from '../types';
import { getActiveCompanyFromOdooSession } from '../../../services/getCompanies';

/** Same relative base as unifiedShopApi.ts — the Worker proxies it to Odoo. */
const BASE = '/api/snabbb-shop';

/**
 * Smart Banners are assigned per website in Odoo (Website > Smart Banners >
 * Websites): MR.BUR banners on "MMY", "MSG", ...; Kaneiko banners on the
 * matching "KMY", "KSG", ... sites (the same letter swap for the leading "M").
 * The shopper's company code from the odoo_session is the MR.BUR website
 * name, except the international company ("INT"), whose website is "MINT".
 */
function websiteNamesFor(brand: ShopBrand | 'all'): string[] {
  const code = getActiveCompanyFromOdooSession()?.companyCode;
  if (!code) return []; // Odoo falls back to the website the request lands on
  const mrbur = code === 'INT' ? 'MINT' : code;
  const kaneiko = `K${mrbur.slice(1)}`;
  if (brand === 'mrbur') return [mrbur];
  if (brand === 'kaneiko') return [kaneiko];
  return [mrbur, kaneiko];
}

interface RawBanner {
  id: number;
  name?: string;
  image_url?: string;
  alt_text?: string;
  url?: string;
  open_new_tab?: boolean;
}

/**
 * Banners for the shop slider. Never throws: a banner is decoration, so any
 * failure (endpoint not deployed yet, network error) just means no slider.
 */
export async function fetchShopBanners(brand: ShopBrand | 'all'): Promise<ShopBanner[]> {
  try {
    const res = await fetch(`${BASE}/banners`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websites: websiteNamesFor(brand) }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows: RawBanner[] = Array.isArray(data?.banners) ? data.banners : [];
    return rows
      .filter((b) => b?.image_url)
      .map((b) => ({
        id: b.id,
        name: b.name || '',
        imageUrl: b.image_url as string,
        altText: b.alt_text || b.name || 'Banner',
        linkUrl: b.url && b.url !== '#' ? b.url : '',
        openNewTab: !!b.open_new_tab,
      }));
  } catch (err) {
    console.warn('[snabbb-shop] /banners request failed:', err);
    return [];
  }
}
