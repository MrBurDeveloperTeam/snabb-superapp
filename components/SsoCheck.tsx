/**
 * SsoCheck.tsx
 * Place at: src/components/SsoCheck.tsx
 *
 * Loaded inside a hidden iframe by mrbur.shop.
 * Checks Odoo session → requests one-time token → postMessages it back.
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

// This is the Snabbb Worker endpoint that checks the Odoo session
// and returns a one-time token
const GENERATE_TOKEN_ENDPOINT = 'https://mrbur.odoo.com/sso/generate_token';

// Session info endpoint — proxied through app.snabbb.com Worker
const SESSION_INFO_ENDPOINT = 'https://app.snabbb.com/api/web/session/get_session_info';

async function odooJsonRpc(url: string, params: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include', // sends Odoo session_id cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'rpc_error');
  return data.result;
}

function getParentOrigin(): string | null {
  try {
    const ref = document.referrer;
    if (ref) return new URL(ref).origin;
    // Fallback for Chrome
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
        // 1. Check Odoo session via the Worker proxy
        const sessionInfo = await odooJsonRpc(SESSION_INFO_ENDPOINT);
        console.log('[Snabbb SSO] Odoo session uid:', sessionInfo?.uid);

        if (!sessionInfo?.uid || sessionInfo.uid === false) {
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
          return;
        }

        // 2. User has active Odoo session — request one-time token
        // This calls mrbur.odoo.com directly with the session cookie
        console.log('[Snabbb SSO] Calling generate_token...');
        const result = await odooJsonRpc(GENERATE_TOKEN_ENDPOINT);
        console.log('[Snabbb SSO] generate_token result:', result);

        if (result?.token) {
          postToParent({ type: 'SSO_TOKEN', token: result.token });
        } else {
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
        }
      } catch (err) {
        console.error('[Snabbb SSO] Error:', err);
        window.parent.postMessage({ type: 'SSO_UNAUTHENTICATED' }, parentOrigin);
      }
    }

    run();
  }, []);

  return null;
}
