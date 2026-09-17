# Unified Shop feature

A self-contained React feature that browses, searches/filters, and carts
products from MR.BUR and Kaneiko in one screen, meant to live inside
`snabbb-apps-gallery` (app.snabbb.com). It doesn't touch any existing file in
that repo — everything needed is in this folder. Drop it in at
`features/unifiedShop/` and wire it in with the snippets below.

## Why it looks the way it does

- **Kaneiko isn't a separate shop in Odoo today.** As of 2026-09-15, company
  39 ("KANEIKO INTERNATIONAL CO., LTD") has zero websites and zero products.
  "Kaneiko" currently exists as a product-name/category tag *inside* MR.BUR's
  own catalog (76 SKUs, `company_id = False`, already sold on mrbur.shop under
  a "DENTAL HANDPIECE" category). So `brand` here is a **display grouping**,
  not a hard multi-company split — that keeps this component correct today
  and still correct later if Kaneiko gets its own company/website.
- **Routed, but not through `react-router-dom` `<Routes>`.** `App.tsx` is
  one big component with its own lightweight router baked in: a `path`
  string state (seeded from `window.location.pathname`, kept in sync with
  the back/forward buttons via `popstate`), a `navigate(url)` helper that
  does `history.pushState` + `setPath`, and `path === '/some-route'` checks
  gating what renders (see `/tutorial-video`, `/profile-settings`, etc.).
  `UnifiedShopApp` is mounted at `/shop` through that same mechanism — a
  real, bookmarkable, back-button-able page, not a boolean-toggled overlay
  (that's still how `AppGalleryVirtualPet`/`isVirtualPetOpen` works, and how
  this used to work too).
- **Same-origin API calls only.** `api/unifiedShopApi.ts` calls
  `/api/unified-shop/*`, matching how `themeStore.ts` calls
  `/api/user/theme` — same-origin, proxied to Odoo by whatever already
  handles `/api/*` on app.snabbb.com. Nothing here calls an Odoo `*.shop`
  domain directly (that would hit CORS).
- **No new dependencies.** Everything used (`zustand`, `@tanstack/react-query`,
  `lucide-react`, `sonner`, `lodash`) is already in `package.json`.

## What's here

```
types.ts                        shared types
data/mockProducts.ts            demo data (real Kaneiko product names, placeholder MR.BUR ones)
api/unifiedShopApi.ts           fetchProducts() — see "Backend contract" below
api/checkoutHandoff.ts          handOffToOdooCheckout() — SSO redirect into Odoo's real checkout, see "Checkout" below
store/unifiedCartStore.ts       Zustand cart (persisted to localStorage, same pattern as themeStore.ts)
hooks/useUnifiedProducts.ts     react-query wrapper around fetchProducts()
components/UnifiedShopApp.tsx   top-level screen (header, cart button, grid)
components/ProductGrid.tsx      search box, sort, brand filter, product grid
components/ProductCard.tsx      single product tile
components/CartDrawer.tsx       slide-over cart + checkout button
components/BrandFilterBar.tsx   All / MR.BUR / Kaneiko pill filter
components/brandMeta.ts         brand colors/labels (matches constants.ts's existing brand accents)
```

It's already wired into `App.tsx` / `AppCard.tsx` / `constants.ts` (the
`unified-shop` tile in the "Shops" section calls `navigate('/shop')`; App.tsx
renders `UnifiedShopApp` when `path === '/shop'`, hiding the gallery's own
header/footer/floating widgets for that route the same way it already does
for `/tutorial-video`) and themed to match the rest of the gallery (tiffany
palette, shared mesh background, matching header).

`unifiedShopApi.ts` calls the real endpoint first and silently falls back to
`data/mockProducts.ts` on a 404, so this stays fully demoable even before
the backend below is deployed.

## Backend contract

`fetchProducts` expects:

```
POST /api/unified-shop/products
  body: { search?, brand?: 'mrbur'|'kaneiko'|'all', categoryId?, minPrice?, maxPrice?, page?, pageSize?, sort? }
  200 -> { products: UnifiedProduct[], total: number, categories: ProductCategory[] }
  404 -> (not deployed yet — frontend falls back to mock data)
```

Exact field shapes are in `types.ts`.

**`/products` has a real implementation**: the `unified_shop_api` Odoo
module, in the `mrbur` addons repo (not this one) at
`unified_shop_api/`. It's a public, read-only `product.template` search over
published/sellable products, with brand ('mrbur' vs 'kaneiko') resolved by a
name/category heuristic since Kaneiko has no company of its own. See that
module's own `README.md` for the exact behavior and — importantly — a few
decisions it flags for review before going live (price visibility for
signed-out visitors in particular). It isn't installed/deployed anywhere
yet, so `fetchProducts()` still falls back to mock data until it is; once
it's installed on whichever Odoo instance `snabbb-apps-gallery`'s `/api/*`
proxy targets, this switches to live data with no frontend change.

## Checkout

Checkout doesn't POST cart lines to a JSON endpoint and doesn't build an
order in the frontend's own name — it hands off to Odoo's real
`/shop/checkout` (the same flow mrbur.shop's own storefront uses), the same
way one real order per cart, not one per brand: Kaneiko has no
company/website of its own in Odoo, so a cart mixing "mrbur" and "kaneiko"
tagged products is one `sale.order`, same as any other mixed-category cart
on mrbur.shop today.

`components/CartDrawer.tsx`'s Checkout button calls
`api/checkoutHandoff.ts`'s `handOffToOdooCheckout()`, which:

1. Encodes the cart as `productTemplateId:qty,productTemplateId:qty,...`.
2. Reuses the same SSO exchange `AppCard.tsx` already uses to launch the
   "shop" app tile (`useCreateAppLink` → `/v1/sso/app_link` →
   `app.snabbb.com/api/sso/odoo-exchange`), asking it to land on
   `/unified-shop/checkout-handoff?lines=...` instead of the storefront
   homepage.
3. Full-page-navigates the browser there (`window.location.href`, not a new
   tab — this *is* the thing the shopper is trying to do).

`unified_shop_api/controllers/main.py`'s `checkout_handoff` route (Odoo
side, `auth='user'`) rebuilds those lines into a real website cart via
`website_sale`'s own `_cart_update`, then redirects to `/shop/checkout` —
from that point on it's stock Odoo checkout: address, shipping, payment, all
unchanged.

**One caveat worth knowing**: whether the Cloudflare Worker behind
`/api/sso/odoo-exchange` actually forwards the `redirect` param all the way
through to Odoo hasn't been independently confirmed (the Worker's source
isn't available from this repo). If it doesn't, the shopper still lands
fully logged in on their regional mrbur.shop storefront — just its homepage,
not `/shop/checkout` with this cart pre-filled. The `checkout_handoff`
route's `auth='user'` plus Odoo's own `/web/login?redirect=...` fallback is
what keeps this degrading gracefully rather than breaking outright if that
passthrough turns out not to be wired up.
