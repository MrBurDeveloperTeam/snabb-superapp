import type {
  AddressFormValues,
  CheckoutCountry,
  CheckoutStateResponse,
  WalletState,
} from '../types';

/**
 * Relative path, same convention as unifiedShopApi.ts's `/api/unified-
 * shop/products` and themeStore.ts's `/api/user/theme` — matches
 * unified_shop_api/controllers/checkout.py's exact route
 * (`/api/unified-shop/checkout/*`, mrbur repo) exactly.
 *
 * This MUST stay relative, not a hardcoded `https://app.snabbb.com/...`
 * origin: in production the app is served from app.snabbb.com itself, so a
 * relative path resolves identically there, but hardcoding that origin
 * makes every call cross-origin during local/LAN dev (`npm run dev`),
 * which drops the browser's real Odoo session cookie and vite's dev proxy
 * both — that's what caused `/unified-shop` to show "Please log in to
 * continue to checkout" locally even while logged in. See
 * checkout.py's module docstring in the mrbur repo for why forwarding the
 * cookie on a same-origin request is what makes auth work here at all.
 */
const BASE = '/api/snabbb-shop/checkout';

export class CheckoutApiError extends Error {
  body: unknown;
  constructor(message: string, body?: unknown) {
    super(message);
    this.name = 'CheckoutApiError';
    this.body = body;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  let body: Record<string, unknown> | null = null;
  try {
    body = await res.json();
  } catch {
    // No/invalid JSON body — handled by the ok-check below.
  }

  if (!res.ok || body?.ok === false) {
    const message =
      (typeof body?.error === 'string' && body.error) ||
      `Request to ${path} failed (${res.status}).`;
    throw new CheckoutApiError(message, body);
  }

  return body as T;
}

/** Matches unified_shop_api's checkout.py `_sync_lines_to_order` param format. */
export function buildLinesParam(lines: { productId: number; qty: number; unitId?: number }[]): string {
  return lines.map((l) => `${l.productId}:${l.qty}${l.unitId ? `:${l.unitId}` : ''}`).join(',');
}

export interface UomPrices {
  ok: boolean;
  defaultId: number;
  currency: string;
  uoms: { id: number; name: string; price: number }[];
}

/** Units a product can be bought in, with the pricelist price of ONE of each. */
export function fetchUomPrices(templateId: number): Promise<UomPrices> {
  return call<UomPrices>(`/uom-prices/${templateId}`, { method: 'GET' });
}

/**
 * Fetches the current Delivery-step state. Pass `linesParam` (from
 * buildLinesParam) the first time the checkout view opens, or whenever the
 * local cart has changed since the last fetch, so the real Odoo order
 * stays in sync with the frontend cart — the backend applies it
 * idempotently (see _sync_lines_to_order's doc comment), so it's safe to
 * omit on subsequent refetches (e.g. after saving an address).
 */
export function fetchCheckoutState(linesParam?: string): Promise<CheckoutStateResponse> {
  // '' is meaningful: the local cart has no products, so the server order must be emptied of them too.
  const qs = linesParam !== undefined ? `?lines=${encodeURIComponent(linesParam)}` : '';
  return call<CheckoutStateResponse>(`/state${qs}`, { method: 'GET' });
}

export function fetchCountries(): Promise<{ ok: boolean; countries: CheckoutCountry[] }> {
  return call(`/countries`, { method: 'GET' });
}

export function fetchStates(
  countryId: number
): Promise<{ ok: boolean; states: { id: number; name: string }[] }> {
  return call(`/states?country_id=${encodeURIComponent(String(countryId))}`, { method: 'GET' });
}

export function saveAddress(
  type: 'delivery' | 'billing',
  address: AddressFormValues
): Promise<CheckoutStateResponse> {
  return call(`/address`, {
    method: 'POST',
    body: JSON.stringify({ type, address }),
  });
}

export function setBillingSameAsDelivery(sameAsDelivery: boolean): Promise<CheckoutStateResponse> {
  return call(`/address`, {
    method: 'POST',
    body: JSON.stringify({ type: 'billing', same_as_delivery: sameAsDelivery }),
  });
}

/**
 * One flat delivery choice for the whole cart (2026-09-22, "unified
 * checkout UX") — the backend always rates and charges this against the
 * primary/MR.BUR order itself, so there's no order to disambiguate here
 * any more. See checkout.py's checkout_delivery_method (mrbur repo).
 */
export function selectDeliveryMethod(
  carrierId: number
): Promise<{ ok: boolean; selected_carrier_id: number; amount_delivery: number; amount_total: number }> {
  return call(`/delivery-method`, {
    method: 'POST',
    body: JSON.stringify({ carrier_id: carrierId }),
  });
}

export function toggleSnabbbCredit(useCredit: boolean): Promise<{
  ok: boolean;
  use_credit: boolean;
  balance: number;
  formatted_balance: string;
  redeemed_credits: number;
  redeemed_amount: number;
  amount_total: number;
}> {
  return call(`/credit-toggle`, {
    method: 'POST',
    body: JSON.stringify({ use_credit: useCredit }),
  });
}

export function claimReward(
  code: string
): Promise<{ ok: boolean; amount_subtotal: number; amount_total: number }> {
  return call(`/reward-claim`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/** Claims a native Odoo reward (the Claim cards on /shop/cart). */
export function claimPromoReward(
  rewardId: number,
  couponId: number
): Promise<{ ok: boolean; amount_subtotal: number; amount_total: number }> {
  return call(`/promo-reward-claim`, {
    method: 'POST',
    body: JSON.stringify({ reward_id: rewardId, coupon_id: couponId }),
  });
}

/** Takes a reserved reward out of the cart; it goes back to the shopper's active rewards. */
export function releaseReward(code: string): Promise<{ ok: boolean }> {
  return call(`/reward-release`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/** Removes a discount that was applied by typing a code, identified by its order line id. */
export function releaseDiscountLine(lineId: number): Promise<{ ok: boolean }> {
  return call(`/reward-release`, {
    method: 'POST',
    body: JSON.stringify({ line_id: lineId }),
  });
}

export function confirmCheckout(): Promise<{ ok: boolean; ready_for_payment?: boolean }> {
  return call(`/confirm`, { method: 'POST' });
}

/** Applies a mrbur_wallet item (fixed / percentage discount, free shipping) to the cart. */
export function applyWalletItem(
  itemId: number
): Promise<{ ok: boolean; amount_subtotal: number; amount_total: number }> {
  return call(`/wallet-apply`, {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}

/** Takes a wallet item off the cart; it goes back to the shopper's wallet. */
export function removeWalletItem(
  itemId: number
): Promise<{ ok: boolean; amount_subtotal: number; amount_total: number }> {
  return call(`/wallet-remove`, {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}

/**
 * Just the cart drawer's wallet block, without the heavy order sync that
 * fetchCheckoutState does - so the "My wallet" card can appear straight away.
 */
export function fetchWalletCart(): Promise<{ ok: boolean; wallet: WalletState | null }> {
  return call(`/wallet-cart`, { method: 'GET' });
}

/**
 * Whether a wallet item still needs claiming. Newer backends send `unclaimed`;
 * older ones only say so in the reason text ('Claim "X" first to reveal ...'),
 * so fall back to that and the Claim button works either way.
 */
export function isWalletItemUnclaimed(item: { unclaimed?: boolean; reason: string }): boolean {
  return item.unclaimed ?? /^Claim ".*" first/.test(item.reason);
}

/** A wallet item the shopper has been issued but has not acknowledged yet. */
export interface WalletPopupItem {
  id: number;
  name: string;
  /** Ready-to-show text: "Save MYR 40.46", "15% off (up to MYR 50.00)", "Free shipping". */
  label: string;
  min_order: string | false;
  valid_until: string | false;
  /** Same-origin URL of the item's popup image (uploaded in Odoo), or false when it has none. */
  image_url?: string | false;
}

/**
 * Wallet items to show in the "you received a wallet item" popup. Works with
 * no cart, and returns an empty list when logged out (never throws for that).
 */
export function fetchUnclaimedWalletItems(): Promise<{ ok: boolean; items: WalletPopupItem[] }> {
  return call(`/wallet-unclaimed`, { method: 'GET' });
}

/** Acknowledges ("claims") a wallet item; it stays Available in the wallet. */
export function claimWalletItem(itemId: number): Promise<{ ok: boolean }> {
  return call(`/wallet-claim`, {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}
