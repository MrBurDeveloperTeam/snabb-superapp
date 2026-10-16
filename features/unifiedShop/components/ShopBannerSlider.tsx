import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShopBanners } from '../hooks/useShopBanners';
import type { ShopBrand } from '../types';

const AUTOPLAY_MS = 5000;
const SWIPE_PX = 40;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Sliding banner shown above the product catalog. Images come from the Odoo
 * Smart Banner module (Website > Smart Banners), so marketing manages them
 * there — including which websites/customers see which banner.
 * Renders nothing when there are no banners (or the request failed).
 */
const ShopBannerSlider: React.FC<{ brand: ShopBrand | 'all' }> = ({ brand }) => {
  const { data: banners = [] } = useShopBanners(brand);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = banners.length;

  // The banner set changes with the brand tab — never point past its end.
  useEffect(() => {
    setIndex(0);
  }, [brand, count]);

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-slate-100 shadow-sm dark:bg-slate-800"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        setPaused(false);
        if (start == null || count < 2) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) >= SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div
        className="flex items-start transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner, i) => {
          const image = (
            <img
              src={banner.imageUrl}
              alt={banner.altText}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
              className="block h-auto w-full select-none"
            />
          );
          return (
            <div
              key={banner.id}
              className="w-full shrink-0"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              {banner.linkUrl ? (
                <a
                  href={banner.linkUrl}
                  target={banner.openNewTab ? '_blank' : undefined}
                  rel={banner.openNewTab ? 'noopener noreferrer' : undefined}
                  tabIndex={i === index ? 0 : -1}
                >
                  {image}
                </a>
              ) : (
                image
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow backdrop-blur transition hover:bg-white sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow backdrop-blur transition hover:bg-white sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/60 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ShopBannerSlider;
