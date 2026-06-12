import { loginOdoo } from "@/services/LoginOdoo";
import { useMutation } from "@tanstack/react-query";
import { AuthFormInputs } from "../types/AuthFormInputs";

async function plantSnabbbIdentity(sessionInfo: any) {
  /**
   * You need to send a JWT here, not the raw session_id.
   * Based on your Odoo controller, it expects:
   * body: { snabbb_token: "JWT..." }
   *
   * Adjust this field depending on where your login API returns the JWT.
   */
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snabbb_token: snabbbToken,
    }),
  });
}

export const useLoginMutation = (onAuthSuccess: () => void) => {
  return useMutation({
    mutationFn: async (data: AuthFormInputs) => {
      const loginResult = await loginOdoo(data.login, data.password);

      console.log("loginResult keys:", Object.keys(loginResult));
      console.log("seed_entry_url:", loginResult.seed_entry_url);

      return {
        sessionInfo: loginResult.data.result,
        seed_entry_url: loginResult.seed_entry_url ?? null,
      };
    },

    onSuccess: async ({ sessionInfo, seed_entry_url }) => {
      localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));

      // ✅ Important: create passive SSO identity cookie on mrbur.shop
      try {
        await plantSnabbbIdentity(sessionInfo);
      } catch (err) {
        console.warn("[SSO] Failed to plant snabbb_identity:", err);
      }

      // ✅ Existing seed chain still runs
      if (seed_entry_url) {
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