import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, ExternalLink, Share2 } from 'lucide-react';
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

interface ProductPreviewModalProps {
  /** null/undefined renders nothing — ProductGrid keeps this as its "which product is open" state. */
  product: UnifiedProduct | null | undefined;
  onClose: () => void;
  /** "View Full Details" opens the in-app ProductDetailPage for this product (ProductGrid's `detailProduct` state) instead of leaving the app. */
  onViewDetails: (product: UnifiedProduct) => void;
}

/**
 * Quick-view popup shown when a shopper clicks a product card — mirrors
 * mrbur.shop's own "Product Preview" modal (image, price, unit, qty, then
 * Add to Cart / View Full Details / Share) so browsing the Unified Shop
 * feels like the same shop rather than a stripped-down copy of it.
 *
 * Portaled straight into document.body, same reasoning as
 * AttributeFilterBar's dropdown: CartDrawer sits at z-[70]/[80] above this
 * page's own sticky z-50 header (see UnifiedShopApp) — nesting this modal
 * inside the product grid would put it below both. z-[90]/[100] here clears
 * everything else in the feature.
 *
 * "Unit" is shown read-only, not as a real dropdown: despite the
 * select-styled box on mrbur.shop's own popup, the underlying Odoo field
 * (product.template.x_default_sale_uom) is a single value per product, not
 * a list of selectable pack sizes with their own prices — nothing in this
 * catalog has more than one option there today. Rendering it as a fake,
 * does-nothing dropdown would be worse than a plain label.
 */
const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({ product, onClose, onViewDetails }) => {
  const addItem = useUnifiedCartStore((s) => s.addItem);
  const openCart = useUnifiedCartStore((s) => s.open);
  const [qty, setQty] = useState(1);

  // Fresh qty each time a different product opens, not carried over from
  // whatever was last typed for a previous one.
  useEffect(() => {
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return undefined;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  const meta = BRAND_DISPLAY[product.brand];

  const handleAddToCart = () => {
    addItem(product, qty);
    toast.success(`Added ${qty} × ${product.name} to cart`, { style: CART_TOAST_STYLE });
    onClose();
    openCart();
  };

  const handleViewDetails = () => {
    onViewDetails(product);
    onClose();
  };

  const handleShare = async () => {
    const url = product.websiteUrl || window.location.href;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: product.name, url });
        return;
      } catch {
        // User cancelled the native share sheet, or it errored — fall
        // through to the clipboard instead of treating this as a failure.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Product preview"
        onClick={(e) => e.stopPropagation()}
        className="z-[100] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Product Preview</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 sm:flex-row">
          <div className="flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800 sm:w-64">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[12px] text-slate-400">No image</span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badgeClass}`}>
                {meta.label}
              </span>
              {product.sku && <span className="text-[11px] text-slate-400">{product.sku}</span>}
            </div>

            <h3 className="text-[17px] font-bold leading-snug text-slate-900 dark:text-white">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-bold text-slate-900 dark:text-white">
                {formatPrice(product.price, product.currency)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-[13px] text-slate-400 line-through">
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
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 focus:border-tiffany-500 focus:outline-none focus:ring-1 focus:ring-tiffany-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {!product.inStock && (
              <p className="text-[12px] font-medium text-red-500">Out of stock</p>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                disabled={!product.inStock}
                onClick={handleAddToCart}
                className="flex items-center gap-1.5 rounded-xl bg-tiffany-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-tiffany-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>

              <button
                type="button"
                onClick={handleViewDetails}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Full Details
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductPreviewModal;
