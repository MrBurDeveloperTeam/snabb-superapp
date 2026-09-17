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

// Checkout is a hand-off to Odoo's real checkout (a full-page SSO redirect
// — see features/unifiedShop/api/checkoutHandoff.ts), not a JSON
// request/response round-trip, so there are no Checkout* types here.
// Kaneiko also isn't a separate res.company/website in Odoo today — a cart
// mixing "mrbur" and "kaneiko" tagged products is one real order, not one
// per brand — so there's no per-brand order-split shape to model either.
