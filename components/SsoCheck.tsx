/**
 * app.snabbb.com/sso/check
 *
 * Route this component to /sso/check in your React Router setup:
 *   <Route path="/sso/check" element={<SsoCheck />} />
 *
 * This page is loaded inside a hidden iframe by mrbur.shop.
 * It checks if the user has an active Supabase session,
 * then requests a one-time token from Odoo and passes it
 * back to the parent window via postMessage.
 */

import { useEffect } from 'react';
import { supabase } from '@/services/supabaseClient'; // adjust to your supabase client path

// Odoo domains allowed to embed this page and receive the token
const ALLOWED_PARENT_ORIGINS = [
  'https://mrbur.shop',
  'https://my.mrbur.shop',
  'https://sg.mrbur.shop',
  'https://th.mrbur.shop',
  'https://id.mrbur.shop',
  'https://us.mrbur.shop',
  'https://mrbur.odoo.com',
];

// Odoo backend — must match where the user's Odoo session cookie lives
const ODOO_BASE_URL = 'https://mrbur.odoo.com';
const GENERATE_TOKEN_ENDPOINT = `${ODOO_BASE_URL}/sso/generate_token`;

/**
 * JSON-RPC helper for Odoo endpoints.
 */
async function odooJsonRpc(url: string, params: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include', // sends Odoo session cookie cross-origin
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'rpc_error');
  return data.result;
}

/**
 * Resolve the parent origin safely.
 * window.parent.location is blocked cross-origin, so we use document.referrer.
 */
function getParentOrigin(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    return new URL(ref).origin;
  } catch {
    return null;
  }
}

export default function SsoCheck() {
  useEffect(() => {
    async function run() {
      const parentOrigin = getParentOrigin();

      // Reject unknown parent origins
      if (!parentOrigin || !ALLOWED_PARENT_ORIGINS.includes(parentOrigin)) {
        console.warn('[Snabbb SSO] Rejected parent origin:', parentOrigin);
        return;
      }

      const postToParent = (message: Record<string, unknown>) => {
        window.parent.postMessage(message, parentOrigin);
      };

      try {
        // 1. Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
          return;
        }

        // 2. Request one-time token from Odoo
        // Requires an active Odoo session cookie on mrbur.odoo.com
        // (planted during original Snabbb login via mrbur_sso_idp)
        const result = await odooJsonRpc(GENERATE_TOKEN_ENDPOINT);

        if (result?.token) {
          postToParent({ type: 'SSO_TOKEN', token: result.token });
        } else {
          postToParent({ type: 'SSO_UNAUTHENTICATED' });
        }
      } catch (err) {
        console.error('[Snabbb SSO] Error during SSO check:', err);
        // Fail silently — mrbur.shop will just show the normal login page
        window.parent.postMessage({ type: 'SSO_UNAUTHENTICATED' }, parentOrigin);
      }
    }

    run();
  }, []);

  // Render nothing — only ever loaded in a hidden iframe
  return null;
}
