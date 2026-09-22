import type { ProductQuery, ProductsResponse } from '../types';
import { mockQueryProducts } from '../data/mockProducts';

/**
 * Relative path, matching how the rest of this app talks to Odoo (e.g.
 * themeStore.ts's `/api/user/theme`) and checkoutApi.ts/paymentApi.ts's own
 * BASE constants — matches unified_shop_api's own route
 * (`/api/unified-shop/products`, mrbur repo) exactly.
 *
 * Kept relative rather than a hardcoded `https://app.snabbb.com/...` origin
 * so it resolves the same way in production (app.snabbb.com serves this app
 * itself) and in local/LAN dev, where vite's dev proxy forwards `/api/*` to
 * the real Odoo backend (see vite.config.ts) and a same-origin request
 * carries the browser's real Odoo session cookie — a hardcoded absolute
 * origin would bypass both.
 */
const BASE = '/api/unified-shop';

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
