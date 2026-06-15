import { loginOdoo } from "@/services/LoginOdoo";
import { useMutation } from "@tanstack/react-query";
import { AuthFormInputs } from "../types/AuthFormInputs";
import { plantMrBurCookie } from "@/services/plantCookies";

async function plantSnabbbIdentity(sessionInfo: any) {
  const snabbbToken =
    sessionInfo?.snabbb_token ||
    sessionInfo?.access_token ||
    sessionInfo?.token ||
    sessionInfo?.jwt;

  if (!snabbbToken) {
    console.warn("[SSO] No snabbb_token found. Passive SSO cookie not planted.");
    return;
  }

  await fetch("https://mrbur.shop/sso/snabbb-identity", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snabbb_token: snabbbToken }),
  });
}

/**
 * Reads the ?redirect= query param from the CURRENT Snabbb login page URL.
 * e.g. app.snabbb.com/login?redirect=https://my.mrbur.shop/shop/some-bur
 *      → returns "https://my.mrbur.shop/shop/some-bur"
 *
 * Only accepts URLs that point back to mrbur.shop (safety check).
 */
function getRedirectParam(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("redirect");
    if (!raw) return null;
 
    const decoded = decodeURIComponent(raw);
 
    // Safety: only redirect to mrbur.shop or mrbur.odoo.com domains
    const allowed = ["mrbur.shop", "mrbur.odoo.com"];
    const { hostname } = new URL(decoded);
    if (!allowed.some((d) => hostname === d || hostname.endsWith("." + d))) {
      console.warn("[SSO] Ignoring untrusted redirect param:", decoded);
      return null;
    }
 
    return decoded;
  } catch {
    return null;
  }
}

export const useLoginMutation = (onAuthSuccess: () => void) => {
  return useMutation({
   mutationFn: async (data: AuthFormInputs) => {
  const loginResult = await loginOdoo(data.login, data.password);

  console.log("loginResult:", JSON.stringify(loginResult));

  return {
    sessionInfo: loginResult.data?.result ?? loginResult.sessionInfo,
    session_id: loginResult.session_id ?? loginResult.data?.result?.session_id,
    seed_entry_url: loginResult.seed_entry_url ?? null,
  };
},

onSuccess: async ({ sessionInfo, session_id, seed_entry_url }) => {
  localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));

  // Plant the Odoo session cookie on mrbur.shop FIRST
  // This is what logs the user in on the shop domain
  if (session_id) {
    try {
      await plantMrBurCookie(session_id);
      console.log("[SSO] ✓ Cookie planted on mrbur.shop");
    } catch (err) {
      console.warn("[SSO] Failed to plant mrbur cookie:", err);
    }
  } else {
    console.warn("[SSO] No session_id found — cookie not planted. sessionInfo:", sessionInfo);
  }

  const redirectUrl = getRedirectParam();

  if (redirectUrl) {
    console.log("[SSO] → Redirecting to product page:", redirectUrl);
    window.location.href = redirectUrl;
  } else if (seed_entry_url) {
    console.log("[SSO] → Redirecting to seed_entry_url:", seed_entry_url);
    window.location.href = seed_entry_url;
  } else {
    onAuthSuccess();
  }
},


    onError: ({ error }: any) => {
      return { error };
    },
  });
};
