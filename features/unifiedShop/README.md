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
api/paymentApi.ts                       /api/unified-shop/checkout/payment/* client — see "Payment" below
api/checkoutHandoff.ts                  handOffToOdooPayment() — SSO hop to Odoo's /shop/payment, now only used for non-Stripe providers
store/unifiedCartStore.ts               Zustand cart (persisted to localStorage, same pattern as themeStore.ts)
hooks/useUnifiedProducts.ts             react-query wrapper around fetchProducts()
hooks/useCheckoutState.ts               react-query wrapper around checkoutApi.ts
components/UnifiedShopApp.tsx           top-level screen — 'shop' / 'checkout' / 'payment' view state
components/ProductGrid.tsx              search box, sort, brand filter, product grid
components/ProductCard.tsx              single product tile
components/CartDrawer.tsx               slide-over cart + checkout button (switches UnifiedShopApp's view)
components/BrandFilterBar.tsx           All / MR.BUR / Kaneiko pill filter
components/brandMeta.ts                 brand colors/labels (matches constants.ts's existing brand accents)
components/checkout/CheckoutPage.tsx    native Delivery step — address, delivery method, billing, order summary
components/checkout/AddressFormModal.tsx  add/edit delivery or billing address
components/checkout/DeliveryMethodList.tsx  radio list of rated carriers
components/checkout/OrderSummary.tsx    totals, reward claim card, Snabbb Credit toggle, Confirm
components/checkout/PaymentPage.tsx     native Payment step — provider picker, Stripe Elements card form, earn-credits banner, Pay now
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
can be (and is) called again on every refetch.

**One order the shopper sees, one `sale.order` per company underneath.**
As of 2026-09-22, `/checkout/state` can return more than one `sale.order`
grouped under a single `unified.shop.order` (`order_group_id` /
`order_group_name` in the response) — see `unified_shop_api/controllers/
checkout.py`'s own module docstring in the `mrbur` repo for the full
design. This is a direct consequence of an Odoo constraint, not a design
preference: a `sale.order` (and its invoice) belongs to exactly one
company, so once a brand shown here is a real `res.company` with its own
products, a cart mixing two companies' products becomes two
`sale.order`s — each invoiced, and eventually e-invoiced, separately —
while this page still shows one combined total and one Pay Now. The
response's new `companies` array carries that breakdown (one entry per
company: its own lines, subtotal, delivery methods, and eventual invoice
numbers); `CheckoutPage.tsx` renders one delivery-method list per company
and `OrderSummary.tsx` groups line items under a "Sold & invoiced by
&lt;company&gt;" header once there's more than one entry.

**This is a no-op in production today.** Kaneiko still has no
company/website of its own in Odoo (`company_id = False` on every
product — "brand" here is still just a display grouping, see the note at
the top of this README), so `companies` always comes back with exactly
one entry and every component above renders identically to how it did
before this change — no visible "Sold by" header, one delivery-method
list, unchanged layout. The split only activates the day a second brand
in this catalog becomes a real company.

Reward claim and Snabbb Credit toggle don't reimplement any wallet/reward
logic — `unified_shop_api/controllers/checkout.py`'s `reward-claim` and
`credit-toggle` routes call the exact same `sale.order` methods
`/snabbb/reward/claim` and `/snabbb_credit/shop/toggle` already use
(`_snabbb_claim_product_giveaway`, `_snabbb_apply_claimed_rewards`,
`_apply_snabbb_credit_redemption`), just returning JSON instead of
redirecting a full page. See that controller's module docstring for the
full reasoning.

Confirm now advances to this app's own native **Payment** step (see below)
instead of leaving `app.snabbb.com` — see git history / the old
`handOffToOdooPayment()`-right-after-Confirm behavior in
`api/checkoutHandoff.ts` for what this replaced.

**Caveat worth knowing**: `delivery.carrier.rate_shipment` / `set_delivery_line`
(used by `checkout.py`'s delivery-method routes) and the `website_published`
+ `company_id` carrier domain are the stock `delivery` module APIs this
relies on — worth a quick sanity check against however
`mrbur_hide_free_shipping` already filters carriers elsewhere in this
repo, in case mrbur.shop scopes carriers by something this domain doesn't
account for.

## Payment

As of 2026-09-18, Payment is also a native step (`components/checkout/
PaymentPage.tsx`), reached from CheckoutPage's Confirm button — matching
mrbur.odoo.com's own `/shop/payment` (provider picker, inline Card fields
with "Secured by Stripe", order summary, an earn-credits banner, "Pay with
Snabbb Credit", Pay now), rendered by this app instead of Odoo's
server-side template, backed by `api/paymentApi.ts` calling
`/api/unified-shop/checkout/payment/*` (same forwarded-session-cookie auth
as everything else in this folder).

**Only Card (Stripe) is genuinely native.** Every other enabled provider
(2c2p, doku, ...) is an inherently hosted, redirect-only page in Odoo no
matter who renders the picker in front of it — so selecting one of those
and clicking Pay now still uses the existing SSO hand-off,
`api/checkoutHandoff.ts`'s `handOffToOdooPayment()` (same mechanism
described in the old version of this section — SSO exchange via
`useCreateAppLink` → `/api/sso/odoo-exchange` → Odoo's `/shop/payment`,
landing on a real first-party Odoo-domain session so that provider's own
integration can run). This is genuinely unavoidable for a redirect-based
provider, not a shortcut — there's no card data to keep on this domain in
the first place for those.

**Card handling never touches this codebase.** `PaymentPage.tsx` loads
Stripe.js directly from `js.stripe.com` at runtime (a plain `<script>` tag,
not an npm dependency — bundling/self-hosting Stripe.js isn't allowed under
Stripe's own PCI SAQ-A eligibility rules) and mounts Stripe's own Payment
Element. Card numbers are typed into Stripe's iframe and never reach this
frontend's state, this backend, or the wire between them — only a
`payment_intent`/`client_secret` pair does, which is meaningless without
Stripe's own key to act on it.

Backend-side, `unified_shop_api/controllers/checkout.py` gained three
routes:

```
GET  /api/unified-shop/checkout/payment/methods
  -> { providers: [{id, code, name, image_url, state, inline}],
       earn_credits, earn_game_credits, amount_total, currency }

POST /api/unified-shop/checkout/payment/init
  body: { provider_id, tokenize?: bool }
  -> { reference, provider_code, processing_values: {...} }

GET  /api/unified-shop/checkout/payment/status?reference=<tx reference>
  -> { state, is_done, is_error, state_message, sale_order_state, sale_order_name }
```

None of these reimplement payment logic — `payment/init` calls Odoo's own
documented, stable `payment.transaction.create()` + `_get_processing_values()`
entry point (the same one `/shop/payment/transaction/<order_id>` uses
internally) rather than hand-rolling transaction creation, and
`payment/status` only *reads* `payment.transaction.state` — confirming a
payment (webhook handling, SO re-confirmation, Snabbb credit awarding) is
still entirely `payment.transaction._set_done()`/`_set_error()`, i.e.
`snabbb_credit/models/payment_transaction.py`'s existing override, firing
from Stripe's webhook exactly as it does today. See `checkout.py`'s own
module docstring above these routes for the full reasoning, including the
one honestly-flagged caveat: the exact required `payment.transaction.create()`
vals are the stable public API, but this instance's installed
`payment`/`payment_stripe` module version wasn't visible from this repo to
verify byte-for-byte — worth a real sandbox test (a Stripe test card
through `/payment/init`) before relying on it, and if it 500s the Odoo
error log will name the exact field to adjust.

**3DS / bank-authentication redirects** are handled with
`stripe.confirmPayment({ redirect: 'if_required' })`, so most cards never
leave `app.snabbb.com` at all; when a bank truly requires an extra
authentication step, Stripe does a full-page redirect and back via a
`return_url` pointing at this same page with `?stripe_return=1&
tx_ref=<reference>` — `UnifiedShopApp.tsx`'s `readStripeResume()` picks
that back up on mount (component state doesn't survive a full navigation)
and resumes straight into the `payment` view's "confirming your payment…"
polling instead of losing the shopper back at the product grid or starting
a second transaction.

**Two caveats worth knowing**, same flavor as the Delivery step's own:
whether the Cloudflare Worker forwards `/api/unified-shop/checkout/payment/*`
the same way it forwards `/api/unified-shop/checkout/*` hasn't been
independently confirmed — if it allowlists exact paths rather than a
prefix, these three new routes need adding the same way the original
Delivery-step routes did (see `api/paymentApi.ts`'s own doc comment). And
whether `/api/sso/odoo-exchange` forwards `next` all the way through to
Odoo still isn't independently confirmed either — relevant only to the
non-Stripe-provider fallback above, same as before.
