---
name: App.Snabbb
---

# Product design context

App.Snabbb is a product interface for signed-in customers managing apps, purchases, and account records. Preserve the existing gallery and profile menu rather than introducing a separate visual identity for account pages.

## Runtime ownership

Existing runtime tokens remain canonical (model B): `index.html` owns the Tailwind tiffany palette, Plus Jakarta Sans, and mesh background; `index.css` and `store/themeStore.ts` own dark-mode behavior. This document describes those sources rather than generating a second palette.

## Colors and typography

Tiffany 700 (#089a98) is the primary invoice action; slate 900 (#0f172a) is primary text, slate 500 (#64748b) secondary text, white (#ffffff) the light card surface, and slate 200 (#e2e8f0) its border. Dark surfaces use slate 900 and borders slate 800. Use existing Plus Jakarta Sans for headings and body, bold invoice references, and tabular numbers for monetary values. Currency and dates use the browser locale; do not combine currencies into one summary amount.

## Layout and components

The shared header owns account navigation. Account content uses a centered max-w-6xl container, natural document scrolling, 16/24px horizontal gutters, rounded-2xl bordered panels, and quiet shadows. The invoice table is the page's primary content; its grouped reference/brand cell is the visual anchor. Avoid marketing heroes, decorative statistics, and new typefaces.

Use native semantic buttons, links, tables, headings, and navigation. Preserve the profile menu's icon/label/subtitle/chevron structure. Invoices use server pagination (20 documents), with page state in the URL. On narrow screens hide secondary columns while retaining date and status in the reference cell; allow table-local horizontal scrolling. Loading, empty, error, and sign-in states share a stable panel. All actions need keyboard focus, hover, and disabled states. Loading motion respects reduced motion.

## Invoice behavior and ownership

`features/invoices/invoiceApi.ts` owns fetching; `MyInvoicesPage.tsx` owns the read-only list. No shared table primitive exists in this app, so use a native table. Requests are cancelable, time-limited, and never persisted. Account identity changes remount the page. The backend derives commercial-account ownership from the authenticated Odoo session, matching checkout payment-status ownership. Only posted customer invoices/credit notes appear; draft/canceled entries and vendor bills do not. PDFs open in a new tab. See `docs/my-invoices.md` for deployment and verification.
