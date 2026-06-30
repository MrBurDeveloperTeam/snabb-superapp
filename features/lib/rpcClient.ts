// src/lib/rpcClient.ts
import axios, { AxiosInstance } from "axios";

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: any };
};

export type EnsureUserResult = {
  ok: boolean;
  external_user_id: string;
  created: boolean;
};

export type AppLinkResult = {
  ok: boolean;
  app_code: string;
  audience: string;
  url: string;
  external_user_id: string;
  created: boolean;
};

function getErrorMessage(err: any): string {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return "Unknown error";
}

/**
 * OPTION A (Recommended): call your own backend proxy
 * - baseURL should be your server, e.g. https://app.snabbb.com
 * - your server attaches X-SSO-API-KEY safely (not in browser)
 */
const ODOO_BASE_URL =
  import.meta.env.VITE_ODOO_BASE_URL || "https://mrbur-sandbox.odoo.com";

const SSO_API_KEY = import.meta.env.VITE_SSO_API_KEY;

export const proxyApi = axios.create({
  baseURL: import.meta.env.VITE_GALLERY_API_BASE || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

/**
 * OPTION B (Quick testing only): call Odoo directly from browser
 * - exposes X-SSO-API-KEY in devtools (NOT safe for production)
 */
if (!SSO_API_KEY) {
  console.error(
    "[SSO] Missing VITE_SSO_API_KEY. Check your .env file and restart `npm run dev`."
  );
}

export const odooApi = axios.create({
  baseURL: "",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(SSO_API_KEY ? { "X-SSO-API-KEY": SSO_API_KEY } : {}),
  },
});

export async function jsonRpcCall<T>(
  client: AxiosInstance,
  path: string,
  params: Record<string, any>,
  id = 1
): Promise<T> {
  try {
    const payload = { jsonrpc: "2.0", method: "call", params, id };
    const { data } = await client.post<JsonRpcResponse<T>>(path, payload);
    if (data.error) return  Promise.reject(new Error(data.error.message || "JSON-RPC error"));
    if (!data.result) return Promise.reject(new Error("Missing JSON-RPC result"));
    return data.result;
  } catch (e) {
    return Promise.reject(getErrorMessage(e));
  }
}
