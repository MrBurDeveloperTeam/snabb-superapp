import type { ShopBrand } from '../types';

/**
 * Colors reuse the same brand accents already assigned to these shops in
 * constants.ts (app-1 "Mr.Bur" uses #4338ca/#0891b2; the commented-out
 * "Kaneiko" entry used #a21caf) so a badge here reads as the same brand a
 * user already sees on the app gallery tile.
 */
export const BRAND_DISPLAY: Record<
  ShopBrand,
  { label: string; dot: string; badgeClass: string }
> = {
  mrbur: {
    label: 'MR.BUR',
    dot: '#0891b2',
    badgeClass:
      'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-400/20',
  },
  kaneiko: {
    label: 'Kaneiko',
    dot: '#a21caf',
    badgeClass:
      'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-600/20 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:ring-fuchsia-400/20',
  },
};
