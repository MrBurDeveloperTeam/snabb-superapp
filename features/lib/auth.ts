// src/lib/auth.ts
import { jsonRpcCall, EnsureUserResult, AppLinkResult, proxyApi, odooApi } from "./rpcClient";

export type LoggedInUser = {
  email: string;
  name: string;
  company_id: number;
  portal: boolean;
  external_user_id: string;
};

// Choose which client to use:
// - Recommended: proxyApi (your backend)
// - Quick test: odooApi (direct to Odoo)
const client = (import.meta.env.VITE_USE_DIRECT_ODOO === "true") ? odooApi : proxyApi;

const LS_KEY = "gallery_user";

export function getStoredUser(): LoggedInUser | null {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoggedInUser;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(LS_KEY);
}

/**
 * "Login" for App Gallery:
 * - Calls Odoo ensure/provision endpoint (idempotent)
 * - Stores a lightweight gallery session locally (example)
 *
 * Endpoint: POST /api/v1/users (JSON-RPC) with X-SSO-API-KEY header
 */
export async function loginWithOdoo(params: {
  email: string;
  name: string;
  password?: string;
  company_id: number;
  portal?: boolean;
}): Promise<LoggedInUser> {
  const result = await jsonRpcCall<EnsureUserResult>(odooApi, "/api/v1/users", {
    email: params.email,
    name: params.name,
    password: params.password,   // optional per doc
    company_id: params.company_id,
    portal: params.portal ?? true,
  });

  if (!result.ok) throw new Error("Login failed: ok=false");

  const user: LoggedInUser = {
    email: params.email,
    name: params.name,
    company_id: params.company_id,
    portal: params.portal ?? true,
    external_user_id: result.external_user_id,
  };

  localStorage.setItem(LS_KEY, JSON.stringify(user));
  return user;
}

/**
 * Launch mini app:
 * - Calls Odoo to get a signed redirect URL for the target app_code
 * - Redirect browser to result.url
 *
 * Endpoint: POST /api/v1/sso/app_link (JSON-RPC)
 */
export async function launchMiniApp(app_code: string): Promise<void> {
  const user = getStoredUser();
  if (!user) throw new Error("Not logged in");

  const result = await jsonRpcCall<AppLinkResult>(client, "/api/v1/sso/app_link", {
    app_code,
    email: user.email,
    name: user.name,
    company_id: user.company_id,
    portal: true,
  });

  if (!result.ok || !result.url) throw new Error("Failed to get app link");
  window.location.href = result.url; // Odoo issues JWT and redirects to app /sso/login?token=...
}
