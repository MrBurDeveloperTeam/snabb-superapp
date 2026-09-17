import { getAuthUser } from '@/utils/authStorage';
import type { CartLine } from '../types';

/**
 * Route added in the mrbur repo (unified_shop_api/controllers/main.py,
 * `checkout_handoff`). Browser-facing, auth='user' — it rebuilds this cart
 * as a real website order on whichever Odoo storefront domain the shopper
 * lands on, then redirects to that domain's own /shop/checkout. From there
 * it's website_sale's own checkout flow, unchanged — address, shipping,
 * payment, all handled by Odoo itself.
 */
const CHECKOUT_HANDOFF_PATH = '/unified-shop/checkout-handoff';

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
 * Hands off checkout to Odoo's real /shop/checkout for the given cart
 * lines. Mirrors the same SSO exchange AppCard.tsx already uses to launch
 * the "shop" app (a token from useCreateAppLink's /v1/sso/app_link call,
 * rewritten into app.snabbb.com's /api/sso/odoo-exchange URL, which
 * resolves the shopper's regional mrbur.shop domain from company_code)
 * — but additionally asks it to land the shopper on
 * `checkout_handoff` instead of the storefront homepage.
 *
 * Param name note (confirmed against the Worker's own source): the
 * /api/sso/odoo-exchange handler reads this destination as `next`, not
 * `redirect` — it then forwards it as `next` again to the regional
 * domain's own /sso/token?token=...&next=... hop. Sending `redirect=`
 * here (as this used to do) is silently ignored by the Worker, which
 * falls back to `next`'s own default of "/". `next` is what's used below.
 *
 * Residual caveat: /sso/token's own handling of `next` on a *successful*
 * login lives in an Odoo module not available to this frontend, so this
 * repo can't independently confirm it re-forwards `next` all the way
 * through. If it doesn't, the shopper still ends up fully logged in on
 * their regional storefront — just on its homepage rather than
 * /shop/checkout with this cart pre-filled. `checkout_handoff`'s
 * auth='user' + Odoo's own /web/login?redirect=... fallback is what makes
 * this degrade gracefully rather than break either way.
 */
export async function handOffToOdooCheckout(
  lines: CartLine[],
  createAppLink: CreateAppLinkFn
): Promise<void> {
  if (lines.length === 0) {
    throw new CheckoutHandoffError('Your cart is empty.');
  }

  const user = getAuthUser();
  if (!user) {
    throw new CheckoutHandoffError('Please log in to check out.');
  }

  const redirectPath = `${CHECKOUT_HANDOFF_PATH}?lines=${encodeURIComponent(
    buildLinesParam(lines)
  )}`;

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

  // Mirrors AppCard.tsx's shop-launch rewrite exactly, plus a best-effort
  // `next` forward — see the caveat in this function's doc comment.
  // NOTE: must be `next`, not `redirect` — that's the param name the
  // Worker's /api/sso/odoo-exchange handler actually reads (confirmed
  // against its source; see doc comment above).
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

  // Full-page navigation in the current tab: unlike launching another app
  // from the gallery (which opens in a new tab), checkout is the thing the
  // shopper is trying to do right now.
  window.location.href = targetUrl;
}
