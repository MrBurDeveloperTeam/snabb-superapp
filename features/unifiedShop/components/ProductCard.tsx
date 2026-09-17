import React, { useState } from 'react';
import { ShoppingCart, ImageOff, Loader2 } from 'lucide-react';
import type { UnifiedProduct } from '../types';
import { BRAND_DISPLAY } from './brandMeta';
import { useUnifiedCartStore } from '../store/unifiedCartStore';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

interface ProductCardProps {
  product: UnifiedProduct;
  /** Opens the mrbur.shop-style quick-view popup (ProductPreviewModal) for this product. */
  onSelect?: (product: UnifiedProduct) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const addItem = useUnifiedCartStore((s) => s.addItem);
  const meta = BRAND_DISPLAY[product.brand];
  // Tracks the <img> itself, not any app-level loading state — starts false
  // on every mount so a freshly-rendered card (initial grid render, or a
  // brand switch remounting cards) shows the spinner until its own image
  // has actually finished downloading, even if the browser serves it from
  // cache (onLoad still fires for a cached image, just quickly).
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={() => onSelect?.(product)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(product);
              }
            }
          : undefined
      }
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        {product.imageUrl && !imageError ? (
          <>
            <img
              src={product.imageUrl}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`h-full w-full object-cover transition-[opacity,transform] duration-200 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-600" />
              </div>
            )}
          </>
        ) : (
          <ImageOff className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        )}

        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badgeClass}`}
        >
          {meta.label}
        </span>

        {!product.inStock && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800/90 text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-100 line-clamp-2">
          {product.name}
        </h3>

        {product.sku && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{product.sku}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold text-slate-900 dark:text-white">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-[12px] text-slate-400 line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={(e) => {
              // The card itself opens the preview popup on click — adding
              // to cart directly is a separate, faster action that
              // shouldn't also pop that open.
              e.stopPropagation();
              addItem(product);
            }}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-tiffany-500 text-white transition-transform hover:scale-105 hover:bg-tiffany-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-tiffany-500"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
