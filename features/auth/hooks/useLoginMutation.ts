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
    sessionInfo: loginResult.data?.result ?? loginResult.sessionInfo ?? loginResult.result,
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

  // Local dev: res.result.url below is built by Odoo's sso.app record for
  // code='snabbb' (mrbur_sso_idp's build_sso_url) — a fixed base_url
  // shared by everyone who logs in through this Odoo branch, with no
  // notion of "send them back to whichever origin they came from". It
  // exists to bounce through a cross-domain SSO bridge
  // (sso.snabbb.com) so a session can be shared across the *other*
  // snabbb.com subdomains (inventory, appointment, shop, ...) — not
  // needed here, since we ARE the "snabbb" app already, and loginOdoo()
  // above already established a real Odoo session cookie against
  // whichever backend this dev server's proxy targets (see
  // vite.config.ts). Following that redirect locally would just bounce
  // this tab to production app.snabbb.com instead. The Odoo session
  // cookie + odoo_session in localStorage set above are already enough
  // to be logged in here — same fallback the redirect-param branch below
  // already uses on error.
  const isLocalDev = typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

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
  } else if (isLocalDev) {
    onAuthSuccess();
  } else {
    // No redirect param — stay on Snabbb (normal login).
    // Mark that we're coming from a fresh login so the app knows, once it
    // lands back here after the SSO handshake below, to force one real
    // reload (see the bootstrapSession check in App.tsx). Doesn't change
    // the handshake itself — res.result.url still has to be visited to
    // actually establish the session.
    sessionStorage.setItem('snabbb_just_logged_in', '1');
    onAuthSuccess();
    window.location.href = res.result.url;
  }
},


    onError: ({ error }: any) => {
      return { error };
    },
  });
};
