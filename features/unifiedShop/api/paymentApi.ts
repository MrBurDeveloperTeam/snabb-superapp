import { CheckoutApiError } from './checkoutApi';
import type { PaymentInitResponse, PaymentMethodsResponse, PaymentStatusResponse } from '../types';

/**
 * Same convention as checkoutApi.ts's BASE — a relative path so a
 * same-origin request carries the forwarded session cookie (see
 * checkout.py's module docstring in the mrbur repo), whether that's
 * app.snabbb.com in production or vite's dev proxy locally (see
 * vite.config.ts) — just one path segment deeper, `/checkout/payment/*`
 * instead of `/checkout/*`. Matches checkout.py's exact routes
 * (`/api/unified-shop/checkout/payment/methods|init|status`, mrbur repo).
 *
 * Cloudflare Worker note: if the Worker forwards `/api/unified-shop/
 * checkout/*` by a path-*prefix* match, these three new routes are already
 * covered. If it instead allowlists exact paths one at a time (which is
 * what produced the original "SSO Gateways Active" issue for the Delivery
 * step), these three — /payment/methods, /payment/init, /payment/status —
 * need adding to that allowlist the same way the Delivery step's routes
 * were.
 */
const BASE = '/api/unified-shop/checkout/payment';

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

/** Available payment providers for the current order, plus the earn-credits
 *  banner figures (order._compute_snabbb_rewards()) and totals. Call this
 *  once when PaymentPage mounts — /confirm should already have been called
 *  by CheckoutPage before navigating here, but this re-validates readiness
 *  server-side too (same _ready_for_payment_error check). */
export function fetchPaymentMethods(): Promise<PaymentMethodsResponse> {
  return call('/methods', { method: 'GET' });
}

/** Creates the payment.transaction and returns whatever the provider's own
 *  _get_specific_rendering_values() produced — for Stripe, a client_secret
 *  + publishable_key for Stripe.js/Elements to use client-side. Nothing
 *  about a card ever passes through this call or its response. */
export function initPayment(providerId: number, tokenize: boolean): Promise<PaymentInitResponse> {
  return call('/init', {
    method: 'POST',
    body: JSON.stringify({ provider_id: providerId, tokenize }),
  });
}

/** Polls the real payment.transaction state — this never sets it (that's
 *  still Stripe's webhook -> payment.transaction._set_done()/_set_error(),
 *  untouched by this feature), it only reads it, so it's safe to call
 *  repeatedly while waiting for the webhook to land. */
export function fetchPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
  return call(`/status?reference=${encodeURIComponent(reference)}`, { method: 'GET' });
}
