import api from "./api";
import { isLocalDev } from "@/utils/env";

export const getSessionInfo = async () => {
  const response = await api.post('/web/session/get_session_info', {});
  if(response.data.error) {
    return Promise.reject(new Error(response.data.error.message));
  }
  const data = await response.data;
  return data.result;
};

export const getSessionInfoWithRetry = async (retries = 3, delay = 1000): Promise<any> => {
  // /api/odoo/session_info is implemented only by the production
  // Cloudflare Worker that fronts app.snabbb.com (worker.js) — it forwards
  // the browser's cookie to Odoo itself to compute company_id/company_name
  // /company_code. It is NOT a real Odoo route (nothing in mrbur's own
  // controllers registers it), and this dev server's actual "dev" script
  // is plain `vite` — no Worker runs locally — so this always 404s here,
  // and the 404 HTML body then fails to parse as JSON.
  //
  // Returning null instead of fetching is safe: the caller
  // (useGetSessionInfo.ts) already merges this on top of getSessionInfo()'s
  // own response, and that response alone already carries everything this
  // enrichment call adds — services/getCompanies.ts's
  // getActiveCompanyFromOdooSession() reads company_codes/user_companies
  // straight off it today, with no dependency on this call at all.
  if (isLocalDev()) return null;

  const res = await fetch("/api/odoo/session_info", {
  method: "GET",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-SSO-API-KEY": "my-sso-secret-123",
  },
});

const data = await res.json();
return data;
};