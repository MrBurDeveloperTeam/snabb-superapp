import React, { useEffect, useState } from 'react';
import { ChevronLeft, Minus, Plus, ShoppingCart, ExternalLink, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import type { UnifiedProduct } from '../types';
import { useUnifiedCartStore } from '../store/unifiedCartStore';
import { BRAND_DISPLAY } from './brandMeta';
import { CART_TOAST_STYLE } from './cartToastStyle';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

interface ProductDetailPageProps {
  product: UnifiedProduct;
  onBack: () => void;
}

/**
 * Full in-app product details page — mirrors mrbur.shop's own product page
 * (back link, image, title, price, a real +/- qty stepper, unit, Add to
 * Cart) for the "View Full Details" action inside ProductPreviewModal.
 *
 * Deliberately does NOT reproduce two things from the mrbur.shop reference
 * screenshot:
 *  - A multi-thumbnail image strip: UnifiedProduct only carries one
 *    `imageUrl`, no thumbnail array, so faking extra thumbnails would mean
 *    showing images that aren't actually this product.
 *  - The "Terms and Conditions" / "30-day money-back guarantee" / "Shipping:
 *    2-3 Business Days" static copy: the Unified Shop's checkout isn't wired
 *    to a live backend yet (see unifiedShopApi.ts's checkout()), so printing
 *    concrete guarantee/shipping claims here would misrepresent what
 *    actually happens when someone "orders" today.
 *
 * Rendered by ProductGrid in place of the search/filter/grid block when a
 * product is selected — this app has no react-router, so "navigating" here
 * is just parent state swapping (see ProductGrid's `detailProduct` state).
 */
const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ product, onBack }) => {
  const addItem = useUnifiedCartStore((s) => s.addItem);
  const openCart = useUnifiedCartStore((s) => s.open);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [product.id]);

  // Land at the top of the page, not wherever the grid had scrolled to.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  const meta = BRAND_DISPLAY[product.brand];

  const handleAddToCart = () => {
    addItem(product, qty);
    toast.success(`Added ${qty} × ${product.name} to cart`, { style: CART_TOAST_STYLE });
    openCart();
  };

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 sm:w-80">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badgeClass}`}>
              {meta.label}
            </span>
            {product.sku && <span className="text-[11px] text-slate-400">{product.sku}</span>}
            {!product.inStock && (
              <span className="rounded-full bg-slate-800/90 px-2 py-0.5 text-[11px] font-bold text-white">
                Out of stock
              </span>
            )}
          </div>

          <h1 className="text-[22px] font-bold leading-snug text-slate-900 dark:text-white">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-bold text-slate-900 dark:text-white">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-[14px] text-slate-400 line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>

          {product.unit && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Unit
              </label>
              <div className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {product.unit}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Qty
            </label>
            <div className="flex w-fit items-center rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-12 border-x border-slate-200 bg-transparent py-2 text-center text-[13px] text-slate-800 focus:outline-none dark:border-slate-700 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              disabled={!product.inStock}
              onClick={handleAddToCart}
              className="flex items-center gap-1.5 rounded-xl bg-tiffany-500 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-tiffany-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>

            {product.websiteUrl && (
              <a
                href={product.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on mrbur.shop
              </a>
            )}
          </div>

          {product.description && (
            <div className="pt-3">
              <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Description
              </h2>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
