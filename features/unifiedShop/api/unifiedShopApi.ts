import type { ProductQuery, ProductsResponse } from '../types';
import { mockQueryProducts } from '../data/mockProducts';

/**
 * Same-origin path, matching how the rest of this app talks to Odoo (e.g.
 * themeStore.ts's `/api/user/theme`) — whatever proxies `/api/*` on
 * app.snabbb.com to Odoo today handles this the same way. Nothing here talks
 * to mrbur.odoo.com / an Odoo *.shop domain directly.
 *
 * This endpoint doesn't exist in Odoo/the Worker yet — that's the Phase 1
 * backend work (a new `unified_shop_api` Odoo module + a Worker route). Until
 * it's deployed, every call below falls back to local mock data on a 404 so
 * this feature is fully demoable without the backend.
 */
const BASE = 'https://app.snabbb.com/api/unified-shop';

let warnedAboutMockFallback = false;
function warnMockFallbackOnce(context: string) {
  if (warnedAboutMockFallback) return;
  warnedAboutMockFallback = true;
  // eslint-disable-next-line no-console
  console.info(
    `[unified-shop] ${BASE} isn't deployed yet — using local mock data ` +
      `(first hit: ${context}). This will switch to live data automatically ` +
      `once the backend endpoint exists.`
  );
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse | null> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 404) return null; // treat as "not deployed yet"
  if (!res.ok) {
    throw new Error(`unified-shop API error (${res.status}) on ${path}`);
  }
  return res.json();
}

export async function fetchProducts(query: ProductQuery): Promise<ProductsResponse> {
  try {
    const live = await postJson<ProductsResponse>('/products', query);
    if (live) return live;
  } catch (err) {
    // Network-level failure (backend unreachable, dev server with no proxy
    // configured, etc.) — fall through to mock data rather than breaking the
    // page, but still surface it via console so it's not silently swallowed.
    console.warn('[unified-shop] /products request failed, using mock data:', err);
  }

  warnMockFallbackOnce('/products');
  return mockQueryProducts({
    search: query.search,
    brand: query.brand,
    categoryId: query.categoryId,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    attributeValueIds: query.attributeValueIds,
    sort: query.sort,
  });
}

// Checkout no longer goes through this JSON API — it hands off to Odoo's
// real checkout via a full-page SSO redirect instead. See
// features/unifiedShop/api/checkoutHandoff.ts.
