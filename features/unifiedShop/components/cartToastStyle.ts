import type React from 'react';

/**
 * Inline style for any toast that can appear while CartDrawer is open (or is
 * about to open) — "Added to cart", checkout success/failure. sonner's
 * Toaster is a single app-wide instance (see App.tsx) positioned top-right,
 * which is exactly where CartDrawer's `max-w-sm` (384px) panel slides in, so
 * without this the toast renders on top of the drawer's own header instead
 * of beside it.
 *
 * `right` here is applied as an inline style on sonner's toast <li>, which
 * beats its default `right: 0` (a stylesheet rule) regardless of order. That
 * default `right: 0` is relative to the Toaster container's own box, which
 * is itself already offset 24px from the viewport edge — so this value adds
 * to that 24px rather than replacing it. 384px (drawer) + 24px (existing
 * offset) + a clear margin rounds to 26rem (416px), landing the toast well
 * before — i.e. to the left of — the drawer's left edge instead of under it.
 */
export const CART_TOAST_STYLE: React.CSSProperties = { right: '26rem' };
