import type { ProductAttribute, ProductCategory, UnifiedProduct } from '../types';

/**
 * Demo/dev fallback data — used only when /api/unified-shop/products isn't
 * deployed yet (see api/unifiedShopApi.ts). The Kaneiko names here are based
 * on real product names pulled from the live MR.BUR catalog on 2026-09-15
 * (they're already sold as a "DENTAL HANDPIECE" sub-category on mrbur.shop
 * today); the MR.BUR-branded items are placeholder names standing in for a
 * generic bur catalog until the real endpoint is wired up. Names are kept
 * brand-prefix-free — the brand badge on each ProductCard already shows
 * which shop it's from, so repeating it in the title is redundant.
 */
export const MOCK_CATEGORIES: ProductCategory[] = [
  { id: 1, name: 'Dental Burs', brand: 'mrbur' },
  { id: 2, name: 'Polishing & Finishing', brand: 'mrbur' },
  { id: 3, name: 'Endodontic Files', brand: 'mrbur' },
  { id: 147, name: 'Dental Handpieces', brand: 'kaneiko' },
];

// Stand-in for the SHANK / SHAPE & NAME / DIAMETER dropdown filters on
// mrbur.shop (see AttributeFilterBar.tsx) — the mock products above aren't
// actually tagged with these, so selecting a value here is a no-op against
// mockQueryProducts; it's only here so the filter bar has something to
// render and the real backend's response shape can be demoed end-to-end.
export const MOCK_ATTRIBUTES: ProductAttribute[] = [
  {
    id: 17,
    name: 'SHANK',
    values: [
      { id: 23, name: 'FG FRICTION GRIP' },
      { id: 24, name: 'RA RIGHT ANGLE' },
      { id: 25, name: 'HP STRAIGHT HANDPIECE' },
    ],
  },
  {
    id: 30,
    name: 'DIAMETER',
    values: [
      { id: 160, name: '1' },
      { id: 161, name: '1.2' },
      { id: 166, name: '0.8' },
    ],
  },
];

export const MOCK_PRODUCTS: UnifiedProduct[] = [
  {
    id: 100001,
    name: 'Tungsten Carbide Finishing Bur — FG Shank (Pack of 5)',
    brand: 'mrbur',
    sku: 'TC-FIN-FG5',
    price: 24.9,
    currency: 'USD',
    categoryId: 1,
    categoryName: 'Dental Burs',
    inStock: true,
    description: 'Fine-grit tungsten carbide finishing bur, FG shank, pack of 5.',
  },
  {
    id: 100002,
    name: 'Diamond Round Bur Set — Coarse/Medium/Fine',
    brand: 'mrbur',
    sku: 'DIA-RND-SET',
    price: 39.0,
    compareAtPrice: 45.0,
    currency: 'USD',
    categoryId: 1,
    categoryName: 'Dental Burs',
    inStock: true,
  },
  {
    id: 100003,
    name: 'Composite Polishing Kit',
    brand: 'mrbur',
    sku: 'POL-COMP-KIT',
    price: 32.5,
    currency: 'USD',
    categoryId: 2,
    categoryName: 'Polishing & Finishing',
    inStock: true,
  },
  {
    id: 100004,
    name: 'NiTi Rotary File System — 21mm',
    brand: 'mrbur',
    sku: 'NITI-21MM',
    price: 58.0,
    currency: 'USD',
    categoryId: 3,
    categoryName: 'Endodontic Files',
    inStock: false,
  },
  {
    id: 6805,
    name: '1:1 Low Speed Contra Angle Handpiece (External Water Pipeline)',
    brand: 'kaneiko',
    sku: 'MODEL CX',
    price: 189.0,
    currency: 'USD',
    categoryId: 147,
    categoryName: 'Dental Handpieces',
    inStock: true,
  },
  {
    id: 6803,
    name: '1:1 Low Speed Contra Angle Handpiece (Internal Water Pipeline)',
    brand: 'kaneiko',
    sku: 'MODEL C',
    price: 199.0,
    currency: 'USD',
    categoryId: 147,
    categoryName: 'Dental Handpieces',
    inStock: true,
  },
  {
    id: 6812,
    name: '1:1 Low Speed Straight Handpiece (External Water Pipeline)',
    brand: 'kaneiko',
    sku: 'MODEL SX',
    price: 175.0,
    currency: 'USD',
    categoryId: 147,
    categoryName: 'Dental Handpieces',
    inStock: true,
  },
  {
    id: 6810,
    name: '1:1 Low Speed Straight Handpiece (Internal Water Pipeline)',
    brand: 'kaneiko',
    sku: 'MODEL S',
    price: 182.0,
    currency: 'USD',
    categoryId: 147,
    categoryName: 'Dental Handpieces',
    inStock: true,
  },
];

export function mockQueryProducts(query: {
  search?: string;
  brand?: 'mrbur' | 'kaneiko' | 'all';
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  // Accepted for shape-compatibility with the real endpoint but not
  // applied — see the MOCK_ATTRIBUTES comment above.
  attributeValueIds?: number[];
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'name_asc';
}) {
  let results = [...MOCK_PRODUCTS];

  if (query.brand && query.brand !== 'all') {
    results = results.filter((p) => p.brand === query.brand);
  }
  if (query.categoryId) {
    results = results.filter((p) => p.categoryId === query.categoryId);
  }
  if (query.minPrice != null) {
    results = results.filter((p) => p.price >= query.minPrice!);
  }
  if (query.maxPrice != null) {
    results = results.filter((p) => p.price <= query.maxPrice!);
  }
  if (query.search) {
    const needle = query.search.trim().toLowerCase();
    if (needle) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.sku?.toLowerCase().includes(needle)
      );
    }
  }

  switch (query.sort) {
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'name_asc':
      results.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }

  return {
    products: results,
    total: results.length,
    categories: MOCK_CATEGORIES,
    attributes: MOCK_ATTRIBUTES,
  };
}
