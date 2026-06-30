/**
 * SsoCheck.tsx
 * Place at: src/components/SsoCheck.tsx
 *
 * Loaded inside a hidden iframe by mrbur.shop.
 * Checks Odoo session server-side → requests one-time token → postMessages it back.
 *
 * Uses /api/sso/check-snabbb-session instead of /api/web/session/get_session_info
 * because the iframe context blocks cookie sending in some browsers.
 * The check-snabbb-session endpoint reads cookies server-side from the Worker.
 */

import { useEffect } from 'react';

const ALLOWED_PARENT_ORIGINS = [
  'https://mrbur.shop',
  'https://my.mrbur.shop',
  'https://sg.mrbur.shop',
  'https://th.mrbur.shop',
  'https://id.mrbur.shop',
  'https://mrbur.odoo.com',
];

// Server-side session check — Worker reads .snabbb.com cookie and validates with Odoo
const CHECK_SESSION_ENDPOINT = 'https://app.snabbb.com/api/sso/check-snabbb-session';

// Worker proxies this to mrbur.odoo.com/sso/generate_token using the snabbb session cookie
const GENERATE_TOKEN_ENDPOINT = 'https://app.snabbb.com/api/sso/generate_token';

function getParentOrigin(): string | null {
  try {
    const ref = document.referrer;
    if (ref) return new URL(ref).origin;
    if (window.location.ancestorOrigins?.length > 0) {
      return window.location.ancestorOrigins[0];
    }
    return null;
  } catch {
    return null;
  }
}

export default function SsoCheck() {
  useEffect(() => {
    async function run() {
      const parentOrigin = getParentOrigin();
      console.log('[Snabbb SSO] parentOrigin:', parentOrigin);

      if (!parentOrigin || !ALLOWED_PARENT_ORIGINS.includes(parentOrigin)) {
        console.warn('[Snabbb SSO] Rejected parent origin:', parentOrigin);
        return;
      }

      const postToParent = (message: Record<string, unknown>) => {
        window.parent.postMessage(message, parentOrigin);
      };

      try {
        // 1. Check Odoo session server-side via Worker
        // Worker reads .snabbb.com session_id cookie and validates with Odoo
        console.log('[Snabbb SSO] Checking session server-side...');
        const sessionRes = await fetch(CHECK_SESSION_ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!sessionRes.ok) {
          console.warn('[Snabbb SSO] Session check HTTP error:', sessionRes.status);
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
          return;
        }

        const sessionData = await sessionRes.json();
        const uid = sessionData?.result?.uid;
        console.log('[Snabbb SSO] Odoo session uid:', uid);

        if (!uid || uid === false) {
          console.log('[Snabbb SSO] No active session');
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
          return;
        }

        // 2. Request one-time token — Worker forwards with snabbb session cookie
        console.log('[Snabbb SSO] Calling generate_token...');
        const tokenRes = await fetch(GENERATE_TOKEN_ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
        });

        if (!tokenRes.ok) {
          console.warn('[Snabbb SSO] generate_token HTTP error:', tokenRes.status);
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
          return;
        }

        const tokenData = await tokenRes.json();
        console.log('[Snabbb SSO] generate_token result:', tokenData);

        const token = tokenData?.result?.token;

        if (token) {
          console.log('[Snabbb SSO] Token received, posting to parent');
          postToParent({ type: 'SSO_TOKEN', token });
        } else {
          console.warn('[Snabbb SSO] No token in response:', tokenData);
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
        }
      } catch (err) {
        console.error('[Snabbb SSO] Error:', err);
        postToParent({ type: 'SSO_UNAUTHENTICATED' });
      }
    }

    run();
  }, []);

  return null;
}
