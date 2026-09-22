/**
 * Unified Shop — shared types.
 *
 * `brand` is deliberately a plain string union rather than something tied to
 * res.company: as of 2026-09-15, Kaneiko has no company/website of its own in
 * Odoo — "Kaneiko" today is just a product-name/category tag inside MR.BUR's
 * own catalog (company_id = False, shared across MR.BUR's websites). So for
 * now `brand` is a *display* grouping the backend derives (from category /
 * name / a real brand field once one exists), not a hard multi-company split.
 * Keeping it as its own field (rather than assuming brand === company) means
 * this doesn't need to change if/when Kaneiko (or a future brand) gets a real
 * company + website of its own.
 */
export type ShopBrand = 'mrbur' | 'kaneiko';

export interface BrandMeta {
  id: ShopBrand;
  label: string;
}

export const BRANDS: BrandMeta[] = [
  { id: 'mrbur', label: 'MR.BUR' },
  { id: 'kaneiko', label: 'Kaneiko' },
];

export interface UnifiedProduct {
  id: number;
  name: string;
  brand: ShopBrand;
  sku?: string;
  price: number;
  /** Strikethrough "was" price, if any. */
  compareAtPrice?: number;
  currency: string;
  imageUrl?: string;
  categoryId?: number;
  categoryName?: string;
  /** Link back to the product's page on its origin site (mrbur.shop, etc). */
  websiteUrl?: string;
  /** Display label for the product's configured sale unit (e.g. "Box (10)") — a single value, not a list of choices; see ProductPreviewModal's doc comment. */
  unit?: string;
  inStock: boolean;
  description?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  brand: ShopBrand;
}

/**
 * One filterable product attribute (e.g. "SHANK", "DIAMETER") and the
 * values currently available for it — mirrors the dropdown filter bar on
 * mrbur.shop (attribute_dropdown_SHANK / SHAPE & NAME / DIAMETER). The
 * backend recomputes `values` from whatever's still selectable given the
 * *other* filters already applied (brand, search, other attributes), the
 * same progressive-narrowing behavior mrbur.shop's own dropdowns have —
 * it isn't a fixed, site-wide list.
 */
export interface ProductAttributeValue {
  id: number;
  name: string;
}

export interface ProductAttribute {
  id: number;
  name: string;
  values: ProductAttributeValue[];
}

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'name_asc';

export interface ProductQuery {
  search?: string;
  brand?: ShopBrand | 'all';
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Flat list of selected product.attribute.value ids, any attribute mixed together — the backend groups them by attribute (OR within one, AND across different ones). */
  attributeValueIds?: number[];
  page?: number;
  pageSize?: number;
  sort?: SortOption;
}

export interface ProductsResponse {
  products: UnifiedProduct[];
  total: number;
  categories: ProductCategory[];
  attributes: ProductAttribute[];
}

export interface CartLine {
  productId: number;
  brand: ShopBrand;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
  qty: number;
}

// Kaneiko isn't a separate res.company/website in Odoo today, but as of
// 2026-09-22 a cart mixing "mrbur" and "kaneiko" tagged products DOES
// split into separate sale.orders/invoices behind the scenes — see
// CompanyCheckoutBreakdown below. That split stays invisible in the
// checkout UI itself ("unified checkout UX", same date) — one address,
// one item list, one delivery method, one total — so it's purely a
// backend/invoicing detail this frontend renders nowhere by default.
//
// The Delivery step itself (address, delivery method, billing toggle,
// reward claim, Snabbb Credit toggle) IS a JSON request/response round
// trip against /api/unified-shop/checkout/* — see api/checkoutApi.ts and
// components/checkout/. Only the final Confirm step is still a full-page
// SSO hand-off, straight to Odoo's own /shop/payment (see
// api/checkoutHandoff.ts's handOffToOdooPayment) — building a native
// payment step is out of scope here.

/** One address on the order — delivery or billing. */
export interface CheckoutAddress {
  id: number;
  name: string;
  street: string;
  street2: string;
  city: string;
  zip: string;
  state_id: number | false;
  state_name: string;
  country_id: number | false;
  country_name: string;
  phone: string;
  email: string;
}

/** A partner's saved address (parent partner itself, or a delivery/invoice child contact). */
export interface SavedAddress extends CheckoutAddress {
  type: 'delivery' | 'invoice' | 'other' | 'contact';
}

/** One product line on the real Odoo order (delivery lines are excluded — see amount_delivery). */
export interface CheckoutLine {
  id: number;
  product_template_id: number | false;
  name: string;
  qty: number;
  price_unit: number;
  price_subtotal: number;
  image_url: string | false;
  /**
   * Which company's own sale.order/invoice this line will land on — see
   * unified_shop_api's checkout.py `_resolve_line_company` in the mrbur
   * repo. Always the same single company across every line today
   * (Kaneiko has no company of its own yet), which is exactly why this
   * is optional rather than assumed present everywhere.
   */
  company_id?: number;
  company_name?: string;
  /**
   * Which brand this line's order was split on (2026-09-22) — see
   * checkout.py's `_resolve_line_brand`/`_order_brand` in the mrbur repo.
   * This, not company_id above, is what actually differs between an
   * MR.BUR and a Kaneiko line today, since both currently share MR.BUR's
   * own company_id.
   */
  brand?: ShopBrand;
}

/**
 * One brand/company's own slice of a Unified Shop checkout — its own
 * sale.order, its own eventual invoice. See unified_shop_api's
 * `unified.shop.order` model (mrbur repo) for why a cart can now
 * genuinely span more than one of these: Odoo ties a sale.order (and its
 * invoice) to exactly one company, so "one order, several brands"
 * becomes one `CompanyCheckoutBreakdown` per brand behind a single
 * combined total — see CheckoutStateResponse.companies.
 *
 * As of 2026-09-22 ("unified checkout UX"), this is a backend/invoicing
 * detail only — the checkout UI itself never renders a "Sold by"
 * grouping from `companies` any more (see CheckoutStateResponse's own
 * doc comment for where the flat, unified fields live instead). Every
 * entry's company_id/company_name can be identical (MR.BUR) while
 * differing by `brand` (Kaneiko has no company of its own), so anything
 * that still needs to key off an entry should use `sale_order_id`, not
 * company_id.
 */
export interface CompanyCheckoutBreakdown {
  company_id: number;
  company_name: string;
  /** Which brand this order is for — see CheckoutLine.brand's own doc comment. */
  brand?: ShopBrand;
  sale_order_id: number;
  sale_order_name: string;
  lines: CheckoutLine[];
  amount_subtotal: number;
  amount_tax: number;
  amount_delivery: number;
  amount_total: number;
  /** Populated only after this company's own invoice has been created — empty right up through Confirm/Pay now. */
  invoice_ids: number[];
  invoice_numbers: string[];
}

/** One available shipping option, with its computed rate for this order/address. */
export interface DeliveryMethod {
  id: number;
  name: string;
  price: number;
  delivery_message: string;
}

/** Snabbb Credit wallet state for the current order (see snabbb_credit module). */
export interface CreditWalletState {
  balance: number;
  formatted_balance: string;
  use_credit: boolean;
  redeemed_credits: number;
  redeemed_amount: number;
}

/** One reward the shopper can claim on this cart (see snabbb_discount_loyalty_reward_api). */
export interface ClaimableReward {
  id: number;
  code: string;
  code_masked: string;
  reward_name: string;
  benefit_summary: string;
  valid_until: string;
}

export interface CheckoutCountry {
  id: number;
  name: string;
  code: string;
}

/** Response shape of GET /api/unified-shop/checkout/state. */
export interface CheckoutStateResponse {
  ok: boolean;
  authenticated: boolean;
  cart_empty?: boolean;
  /** Customer-facing order number (unified.shop.order, e.g. "USH000123") — replaces the old single `order_id`, since one checkout can now be more than one sale.order. */
  order_group_id?: number;
  order_group_name?: string;
  currency?: string;
  /** Every line across every company, each tagged with company_id/company_name — see CheckoutLine. Prefer `companies` below when rendering a per-seller breakdown; this flat list is for the simple "N items" summary. */
  lines?: CheckoutLine[];
  amount_subtotal?: number;
  amount_tax?: number;
  amount_delivery?: number;
  amount_total?: number;
  /**
   * One entry per brand/company represented in the cart — a backend/
   * invoicing detail only as of 2026-09-22 ("unified checkout UX"). The
   * checkout UI itself renders the flat, unified `lines`/
   * `delivery_methods`/`selected_carrier_id` fields below, never a
   * "Sold by <company>" grouping from this array — see this interface's
   * own note on those fields.
   */
  companies?: CompanyCheckoutBreakdown[];
  delivery_address?: CheckoutAddress | null;
  billing_address?: CheckoutAddress | null;
  billing_same_as_delivery?: boolean;
  saved_addresses?: SavedAddress[];
  /**
   * ONE delivery-method list / selection for the whole cart (2026-09-22,
   * "unified checkout UX" — un-deprecated: these briefly moved to
   * `companies[].delivery_methods`/`companies[].selected_carrier_id`
   * during the brand-split work, but the shopper only ever sees and
   * picks one delivery method total, rated against the primary/MR.BUR
   * order — see checkout.py's `_ready_for_payment_error` and
   * `checkout_delivery_method` in the mrbur repo).
   */
  delivery_methods?: DeliveryMethod[];
  selected_carrier_id?: number | false;
  credit?: CreditWalletState;
  rewards?: ClaimableReward[];
}

/** Editable fields in the add/edit address form — mirrors checkout.py's `address` POST body. */
export interface AddressFormValues {
  id?: number;
  name: string;
  street: string;
  street2?: string;
  city: string;
  zip: string;
  state_id?: number | false;
  country_id: number | false;
  phone?: string;
  email?: string;
}

// ---------------------------------------------------------------------
// Native "Payment" step (components/checkout/PaymentPage.tsx) — see that
// file's doc comment and api/paymentApi.ts for how these are used.
// ---------------------------------------------------------------------

/** One payment.provider available for this order (GET /payment/methods). */
export interface PaymentProvider {
  id: number;
  code: string;
  name: string;
  image_url: string | false;
  state: string;
  /** Only true for Stripe today — the only provider with a native inline
   *  form here (Stripe Elements). Every other provider is a hosted
   *  redirect page regardless, so the frontend falls back to the existing
   *  SSO hand-off for those. */
  inline: boolean;
  /** Stripe only — see checkout.py's _provider_json (mrbur repo) for why
   *  this rides along here instead of in payment/init's processing_values
   *  (Stripe.js needs it client-side before it can even construct the
   *  stripe(...) instance). Used by PaymentPage.tsx's Stripe Elements
   *  mount. */
  stripe_publishable_key?: string;
}

export interface PaymentMethodsResponse {
  ok: boolean;
  providers: PaymentProvider[];
  earn_credits: number;
  earn_game_credits: number;
  amount_total: number;
  currency: string;
}

/** processing_values is Odoo's own payment.transaction._get_processing_values()
 *  output (provider-specific: `client_secret` + `publishable_key` for
 *  Stripe, `webPaymentUrl` for 2c2p, etc) — deliberately untyped beyond
 *  that since its shape is entirely provider-defined. */
export interface PaymentInitResponse {
  ok: boolean;
  reference: string;
  provider_code: string;
  processing_values: Record<string, string | number | boolean | null>;
}

/** One company's own order/invoice, as reflected in a payment/status poll. */
export interface PaymentStatusCompany {
  company_id: number;
  company_name: string;
  /** See CheckoutLine.brand's own doc comment — same 2026-09-22 brand split. */
  brand?: ShopBrand;
  sale_order_id: number;
  sale_order_state: string;
  sale_order_name: string;
  invoice_ids: number[];
  invoice_numbers: string[];
}

export interface PaymentStatusResponse {
  ok: boolean;
  state: string;
  is_done: boolean;
  is_error: boolean;
  state_message: string;
  order_group_id?: number | false;
  order_group_name?: string | false;
  /** One entry per company order the payment.transaction covered — see checkout.py's payment/status route (mrbur repo). Always length 1 today. */
  companies: PaymentStatusCompany[];
}
