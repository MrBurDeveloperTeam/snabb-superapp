import { getAuthUser } from '@/utils/authStorage';
import type { CartLine } from '../types';

/**
 * Two routes added in the mrbur repo
 * (unified_shop_api/controllers/main.py). Both are browser-facing,
 * auth='user' — they run after the SSO exchange below has landed the
 * browser on Odoo's own domain with a real first-party session.
 *
 * - checkout_handoff: legacy entry point — rebuilds the cart from a
 *   `lines` param and redirects to Odoo's own /shop/checkout template.
 *   No longer used by CartDrawer (see handOffToOdooPayment below), kept
 *   for backward compatibility.
 * - checkout_confirm_handoff: used by the native Delivery step
 *   (components/checkout/CheckoutPage.tsx). By the time this fires, the
 *   order (lines, delivery address, billing address, delivery method)
 *   has already been built via /api/unified-shop/checkout/* — this route
 *   does NOT rebuild it, it only needs to give the browser a real
 *   Odoo-domain session so /shop/payment's own payment-acquirer
 *   integrations work, then redirects straight there.
 */
const CHECKOUT_HANDOFF_PATH = '/unified-shop/checkout-handoff';
const CHECKOUT_CONFIRM_PATH = '/unified-shop/checkout-confirm';

export class CheckoutHandoffError extends Error {}

function buildLinesParam(lines: CartLine[]): string {
  return lines.map((l) => `${l.productId}:${l.qty}`).join(',');
}

type CreateAppLinkFn = (args: {
  app: string;
  email: string;
  name: string;
  redirect?: string;
}) => Promise<any>;

/**
 * Shared SSO exchange + full-page redirect, used by both hand-off
 * functions below. Mirrors the SSO exchange AppCard.tsx already uses to
 * launch the "shop" app tile (a token from useCreateAppLink's
 * /v1/sso/app_link call, rewritten into app.snabbb.com's own
 * /api/sso/odoo-exchange URL, which resolves the shopper's regional
 * mrbur.shop domain from company_code) — but additionally asks it to land
 * the shopper on `redirectPath` instead of the storefront homepage.
 *
 * Param name note (confirmed against the Worker's own source): the
 * /api/sso/odoo-exchange handler reads this destination as `next`, not
 * `redirect` — sending `redirect=` here is silently ignored, falling back
 * to `next`'s own default of "/". `next` is what's used below.
 *
 * Residual caveat, same as before: /sso/token's own handling of `next` on
 * a *successful* login lives in an Odoo module not available to this
 * frontend, so this repo can't independently confirm it re-forwards
 * `next` all the way through. If it doesn't, the shopper still ends up
 * fully logged in on their regional storefront — just on its homepage
 * rather than `redirectPath`. Both Odoo-side routes' `auth='user'` plus
 * Odoo's own `/web/login?redirect=...` fallback keep this degrading
 * gracefully rather than breaking outright either way.
 */
async function ssoRedirect(
  redirectPath: string,
  createAppLink: CreateAppLinkFn
): Promise<void> {
  const user = getAuthUser();
  if (!user) {
    throw new CheckoutHandoffError('Please log in to check out.');
  }

  const res = await createAppLink({
    app: 'shop',
    email: user.username,
    name: user.name,
    redirect: redirectPath,
  });

  // Same shape /v1/sso/app_link returns when an admin has blocked this
  // account from the shop app (see AppCard.tsx's handling of it).
  if (res?.result?.ok === false) {
    throw new CheckoutHandoffError(
      res.result.reason || "Couldn't reach checkout. Please try again."
    );
  }

  let targetUrl: string | undefined = res?.result?.url;
  if (!targetUrl) {
    throw new CheckoutHandoffError('No checkout link was returned.');
  }

  try {
    const ssoUrl = new URL(targetUrl);
    const token = ssoUrl.searchParams.get('token');
    const companyCode = ssoUrl.searchParams.get('company_code') || 'INT';
    if (token) {
      targetUrl =
        `https://app.snabbb.com/api/sso/odoo-exchange?token=${encodeURIComponent(token)}` +
        `&company_code=${encodeURIComponent(companyCode)}` +
        `&next=${encodeURIComponent(redirectPath)}`;
    }
  } catch {
    // targetUrl wasn't a parseable absolute URL — fall through and use it
    // as-is rather than failing the whole hand-off over the rewrite step.
  }

  // Full-page navigation in the current tab: not a new tab — this *is* the
  // thing the shopper is trying to do right now.
  window.location.href = targetUrl;
}

/**
 * Legacy hand-off: builds the cart from `lines` and lands on Odoo's own
 * /shop/checkout template. No longer called by CartDrawer (checkout is
 * now the in-app Delivery step, see UnifiedShopApp/CheckoutPage) — kept
 * for any other caller that still wants the old "leave app.snabbb.com
 * immediately" behavior.
 */
export async function handOffToOdooCheckout(
  lines: CartLine[],
  createAppLink: CreateAppLinkFn
): Promise<void> {
  if (lines.length === 0) {
    throw new CheckoutHandoffError('Your cart is empty.');
  }
  const redirectPath = `${CHECKOUT_HANDOFF_PATH}?lines=${encodeURIComponent(
    buildLinesParam(lines)
  )}`;
  await ssoRedirect(redirectPath, createAppLink);
}

/**
 * As of 2026-09-18 this is no longer called right after Confirm —
 * CheckoutPage's Confirm now advances in-app to
 * components/checkout/PaymentPage.tsx (a native Payment step) instead of
 * hopping off to Odoo's own /shop/payment immediately. This function is
 * still used, just one screen later: PaymentPage calls it when the
 * shopper picks any payment provider other than Card/Stripe (2c2p, doku,
 * ...) — those are inherently hosted, redirect-only pages in Odoo no
 * matter who renders the picker in front of them, so there's no native
 * version of this hand-off to build for them. By the time it's called, the
 * order (lines, delivery address, billing address, delivery method) is
 * already built server-side via /api/unified-shop/checkout/*, so this just
 * needs to land the browser on Odoo's own domain, with a real session, at
 * /shop/payment.
 */
export async function handOffToOdooPayment(createAppLink: CreateAppLinkFn): Promise<void> {
  await ssoRedirect(CHECKOUT_CONFIRM_PATH, createAppLink);
}
