import axios from "axios";
import api from "./api";

export const loginOdoo = async (email: string, password: string) => {
  const url = "/web/session/authenticate";
  // Hardcoded to production's db name before this fix, so switching
  // VITE_ODOO_BASE_URL (services/api.ts's proxy target, set in .env.local)
  // to another branch's build still authenticated against production's own
  // database name and failed with "Database not found." — Odoo.sh gives
  // every branch build its own separate database, named after that build
  // (confirmed via that branch's own Odoo.sh Shell tab), not shared with
  // production's. VITE_ODOO_DB keeps this in sync with whichever backend
  // .env.local is currently pointed at, defaulting to production's db name
  // so this keeps working even for anyone who hasn't set it locally.
  const db = import.meta.env.VITE_ODOO_DB || "aht-systemadmin-mrbur-main-20994444";

  try {
    const response = await api.post(url, {
      "jsonrpc": "2.0",
      "method": "call",
      "params": {
        "db": db,
        "login": email,
        "password": password
      },
      "id": 1
    });

    if (response.data.error) {
      return Promise.reject(new Error(response.data.error.message));
    }
    return response.data; 
  } catch (err: any) {
    return Promise.reject(new Error(err.message || "Odoo login failed"));
  }
};
