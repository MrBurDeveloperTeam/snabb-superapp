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
types.ts                                shared types (product + checkout)
data/mockProducts.ts                    demo data (real Kaneiko product names, placeholder MR.BUR ones)
api/unifiedShopApi.ts                   fetchProducts() — see "Backend contract" below
api/checkoutApi.ts                      /api/unified-shop/checkout/* client — see "Checkout" below
api/checkoutHandoff.ts                  handOffToOdooPayment() — final SSO hop to Odoo's /shop/payment
store/unifiedCartStore.ts               Zustand cart (persisted to localStorage, same pattern as themeStore.ts)
hooks/useUnifiedProducts.ts             react-query wrapper around fetchProducts()
hooks/useCheckoutState.ts               react-query wrapper around checkoutApi.ts
components/UnifiedShopApp.tsx           top-level screen — 'shop' vs 'checkout' view state
components/ProductGrid.tsx              search box, sort, brand filter, product grid
components/ProductCard.tsx              single product tile
components/CartDrawer.tsx               slide-over cart + checkout button (switches UnifiedShopApp's view)
components/BrandFilterBar.tsx           All / MR.BUR / Kaneiko pill filter
components/brandMeta.ts                 brand colors/labels (matches constants.ts's existing brand accents)
components/checkout/CheckoutPage.tsx    native Delivery step — address, delivery method, billing, order summary
components/checkout/AddressFormModal.tsx  add/edit delivery or billing address
components/checkout/DeliveryMethodList.tsx  radio list of rated carriers
components/checkout/OrderSummary.tsx    totals, reward claim card, Snabbb Credit toggle, Confirm
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

As of 2026-09-18, Checkout is a native step inside this app, not an
immediate hand-off to Odoo's own `/shop/checkout` template (that was the
original design — see git history / `handOffToOdooCheckout` in
`api/checkoutHandoff.ts` for what this replaced). Clicking Checkout in
`components/CartDrawer.tsx` just flips `UnifiedShopApp`'s own `view` state
to `'checkout'`, rendering `components/checkout/CheckoutPage.tsx` in place
of the product grid — no network call yet, no navigation away from
`app.snabbb.com`.

That page — address cards, a delivery-method radio list, a "same as
delivery address" billing toggle, and an order summary with a reward-claim
card and a "Pay with Snabbb Credit" toggle — is meant to look and behave
like mrbur.odoo.com's own `/shop/checkout` (reward picker and credit
switch included), just rendered by this app instead of Odoo's server-side
template. It's backed by `api/checkoutApi.ts`, calling
`/api/unified-shop/checkout/*` — same-origin, same convention as
`api/unifiedShopApi.ts`'s `/api/unified-shop/products` and
`store/themeStore.ts`'s `/api/user/theme`. **Auth for these routes is the
same forwarded-session-cookie mechanism `/api/user/theme` already proves
works** (see that route's own module, `snabbb_user_theme`, whose README
shows the Cloudflare Worker forwarding the browser's `session_id` cookie
for every `/api/*` route) — no separate SSO hop or API key needed just to
load or edit the Delivery step.

`GET /api/unified-shop/checkout/state` also takes the cart lines the very
first time the page opens (`?lines=productTemplateId:qty,...`, built by
`checkoutApi.ts`'s `buildLinesParam`) and syncs them onto a real
`sale.order` via `website_sale`'s own `_cart_update` — idempotently, unlike
the old `checkout_handoff` route's additive-only version, since this one
can be (and is) called again on every refetch. One real order per cart,
not one per brand: Kaneiko has no company/website of its own in Odoo, so a
cart mixing "mrbur" and "kaneiko" tagged products is one `sale.order`, same
as any other mixed-category cart on mrbur.shop.

Reward claim and Snabbb Credit toggle don't reimplement any wallet/reward
logic — `unified_shop_api/controllers/checkout.py`'s `reward-claim` and
`credit-toggle` routes call the exact same `sale.order` methods
`/snabbb/reward/claim` and `/snabbb_credit/shop/toggle` already use
(`_snabbb_claim_product_giveaway`, `_snabbb_apply_claimed_rewards`,
`_apply_snabbb_credit_redemption`), just returning JSON instead of
redirecting a full page. See that controller's module docstring for the
full reasoning.

**Only the final Confirm button still leaves this app.** Building a native
payment step (the actual acquirer integrations — 2c2p, Stripe, etc.) is out
of scope here; by the time Confirm is clicked the order already has its
lines, delivery address, billing address and delivery method set via
`/api/unified-shop/checkout/*`, so `api/checkoutHandoff.ts`'s
`handOffToOdooPayment()`:

1. Reuses the same SSO exchange `AppCard.tsx`/the old `handOffToOdooCheckout`
   already used (`useCreateAppLink` → `/v1/sso/app_link` →
   `app.snabbb.com/api/sso/odoo-exchange`), asking it to land on
   `/unified-shop/checkout-confirm` instead of the storefront homepage.
2. Full-page-navigates the browser there (`window.location.href`, not a new
   tab — this *is* the thing the shopper is trying to do).

`unified_shop_api/controllers/main.py`'s `checkout_confirm_handoff` route
(Odoo side, `auth='user'`) does **not** rebuild the cart from a `lines`
param the way the old `checkout_handoff` route does — the order's already
right, from the same Odoo session, via the JSON calls above — it just
redirects to `/shop/payment`. (`checkout_handoff` itself is left in place
for backward compatibility, but nothing in this feature calls it anymore;
calling it after the new flow has already built the order would double
every line's quantity, since it's additive-only.)

**Two caveats worth knowing**, same as before: whether the Cloudflare
Worker behind `/api/sso/odoo-exchange` forwards the `next` param all the
way through to Odoo hasn't been independently confirmed (the Worker's
source isn't available from this repo) — if it doesn't, the shopper still
lands fully logged in on their regional mrbur.shop storefront, just its
homepage rather than `/shop/payment`. And `delivery.carrier.rate_shipment`
/ `set_delivery_line` (used by `checkout.py`'s delivery-method routes) and
the `website_published` + `company_id` carrier domain are the stock
`delivery` module APIs this relies on — worth a quick sanity check against
however `mrbur_hide_free_shipping` already filters carriers elsewhere in
this repo, in case mrbur.shop scopes carriers by something this domain
doesn't account for.
