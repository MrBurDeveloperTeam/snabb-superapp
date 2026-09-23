# My Invoice

Profile menu → My Invoice → `/my-invoices`. Lists issued customer invoices and credit notes, including brand-separated records. Each row links to an authenticated PDF view and download. No payment or invoice creation occurs on this page.

## Required deployment

- Frontend: `App.tsx`, `features/invoices/*`.
- Worker: the `/api/my/invoices` and `/api/my/invoices/<id>/pdf` proxy handlers in `worker.js`. Preserve binary bodies and private/no-store responses.
- Odoo mrbur: `unified_shop_api/controllers/invoices.py` and its import in `controllers/__init__.py`. Restart/update the module with the previously merged order-group code. Module must expose `sale.order.unified_shop_brand`.
- Local Vite already proxies `/api` to the configured staging Odoo instance. That instance must have the invoice controller installed and the browser must have a valid session for it.

## API and privacy

GET `/api/my/invoices?page=1` returns `{ok, invoices, page, page_size:20, total}`. Invalid pages clamp to the valid range. Both list and PDF routes use the logged-in partner's commercial account, matching unified checkout's payment-status ownership boundary. Client-supplied partner IDs are ignored. Only posted `out_invoice` and `out_refund` moves are eligible. Unauthenticated requests return 401; unavailable or foreign PDFs return 404. Account data is never stored in localStorage or a shared query cache.

GET `/api/my/invoices/<id>/pdf` displays the issued PDF (or renders the configured invoice report when no attachment exists); `?download=1` requests attachment disposition.

## Acceptance checks

Use two independent customer accounts: confirm each sees only its own commercial-account documents, direct foreign PDF access is 404, logged-out requests are 401, draft/vendor records are absent, and pagination handles more than 20 documents. Verify mixed-brand invoices appear individually, balances/currencies match Odoo, and PDF view/download work. Test empty, error/retry, timeout, narrow layout, dark theme, keyboard, refresh, and browser history. Browser fixtures verify UI states but do not prove production auth/report rendering.

## Local verification (2026-09-23)

- Production Vite build passed; invoice components passed targeted TypeScript checks.
- Four backend controller contract tests passed (mock Odoo environment; no live database).
- Proxy tests passed for session forwarding, binary PDF preservation, no-store, expired-session redirect, and method restrictions.
- Browser fixture checks passed for list, document URL, pagination/history, desktop/mobile/dark, loading, empty, error/retry, 401, guest no-fetch, and keyboard behavior. Vite's unrelated HMR socket warning is excluded.
- Scoped premium UI static audit passed.
- Full repository TypeScript checking remains blocked by pre-existing duplicate payment-page and Supabase/Deno errors.
- Live customer authorization and report rendering require deployment and an authenticated Odoo test session; these are not proven by fixtures.

Run `python3 tests/invoices/backend.py /path/to/mrbur/unified_shop_api/controllers/invoices.py`, `node tests/invoices/proxy.cjs`, and, with Vite on port 3011 and Playwright available, `node tests/invoices/browser.cjs`. `PLAYWRIGHT_MODULE` can point to a bundled Playwright package.
