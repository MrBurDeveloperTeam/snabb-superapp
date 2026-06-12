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
 * Read ?redirect= from the current Snabbb login page URL.
 * e.g. app.snabbb.com/login?redirect=https://my.mrbur.shop/shop/801-06-...
 */
function getRedirectParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (!redirect) return null;

  // Basic safety check — only allow http/https URLs
  try {
    const url = new URL(redirect);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return redirect;
  } catch {
    return null;
  }
}

export const useLoginMutation = (onAuthSuccess: () => void) => {
  return useMutation({
    mutationFn: async (data: AuthFormInputs) => {
      const loginResult = await loginOdoo(data.login, data.password);

      console.log("loginResult keys:", Object.keys(loginResult));
      console.log("seed_entry_url:", loginResult.seed_entry_url);
      console.log("sessionInfo:", loginResult.sessionInfo);

      if (loginResult.ok && loginResult.sessionInfo) {
        // Plant the cookie on mrbur.shop in the background
        await plantMrBurCookie(loginResult.sessionInfo.session_id); // or however you get the sid
      }

      return {
        sessionInfo: loginResult.data.result,
        seed_entry_url: loginResult.seed_entry_url ?? null,
      };
    },

    onSuccess: async ({ sessionInfo, seed_entry_url }) => {
      localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));

      // Plant passive SSO identity cookie on mrbur.shop
      try {
        await plantSnabbbIdentity(sessionInfo);
      } catch (err) {
        console.warn("[SSO] Failed to plant snabbb_identity:", err);
      }

      // Priority order:
      // 1. ?redirect= param (user came from a specific product/page)
      // 2. seed_entry_url (existing SSO seed chain)
      // 3. onAuthSuccess() fallback
      const redirectUrl = getRedirectParam();

      if (redirectUrl) {
        console.log("[SSO] Redirecting to ?redirect= param:", redirectUrl);
        window.location.href = redirectUrl;
      } else if (seed_entry_url) {
        console.log("[SSO] Redirecting to seed_entry_url:", seed_entry_url);
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
