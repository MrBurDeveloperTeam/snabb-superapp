import { loginOdoo } from "@/services/LoginOdoo";
import { useMutation } from "@tanstack/react-query";
import { AuthFormInputs } from "../types/AuthFormInputs";
import { useCreateAppLink } from '@/mutation/useCreateAppLink';

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
    const allowed = ["mrbur.shop", "mrbur.odoo.com", "mrburstudio.com"];
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
  const { mutateAsync: createAppLink } = useCreateAppLink();
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

onSuccess: async ({ sessionInfo, session_id }) => {
  localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));

  const redirectUrl = getRedirectParam();
  const res = await createAppLink({
              app: 'snabbb',
              email: sessionInfo.username,
              name: sessionInfo.name,
            });
            
  if (redirectUrl && session_id) {
    try {
      const { hostname } = new URL(redirectUrl);

      if (hostname.endsWith(".mrburstudio.com") || hostname === "mrburstudio.com") {
        window.location.href = `https://my.mrburstudio.com/sso/plant-cookie?sid=${encodeURIComponent(session_id)}&next=${encodeURIComponent(redirectUrl)}`;
      } else {
        const plantDomain = (hostname.endsWith(".mrbur.shop") || hostname === "mrbur.shop")
          ? hostname
          : "my.mrbur.shop";
        window.location.href = `https://${plantDomain}/sso/plant-cookie?sid=${encodeURIComponent(session_id)}&next=${encodeURIComponent(redirectUrl)}`;
      }
    } catch {
      onAuthSuccess();
    }
  } else {
    // No redirect param — stay on Snabbb (normal login)
    onAuthSuccess();
    window.location.href = res.result.url;
  }
},


    onError: ({ error }: any) => {
      return { error };
    },
  });
};
