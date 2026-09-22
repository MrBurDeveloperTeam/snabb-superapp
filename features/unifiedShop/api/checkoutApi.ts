import type {
  AddressFormValues,
  CheckoutCountry,
  CheckoutStateResponse,
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
const BASE = '/api/unified-shop/checkout';

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
export function buildLinesParam(lines: { productId: number; qty: number }[]): string {
  return lines.map((l) => `${l.productId}:${l.qty}`).join(',');
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
  const qs = linesParam ? `?lines=${encodeURIComponent(linesParam)}` : '';
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
 * `saleOrderId` says which company order this selection is for — a cart
 * spanning more than one company can have more than one delivery method
 * to pick (each company rates its own order independently), so the
 * backend needs to know which one a given carrier_id applies to. See
 * checkout.py's checkout_delivery_method (mrbur repo).
 */
export function selectDeliveryMethod(
  saleOrderId: number,
  carrierId: number
): Promise<{ ok: boolean; sale_order_id: number; selected_carrier_id: number; amount_delivery: number; amount_total: number }> {
  return call(`/delivery-method`, {
    method: 'POST',
    body: JSON.stringify({ sale_order_id: saleOrderId, carrier_id: carrierId }),
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

export function confirmCheckout(): Promise<{ ok: boolean; ready_for_payment?: boolean }> {
  return call(`/confirm`, { method: 'POST' });
}
