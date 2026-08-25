const DEFAULT_ODOO_BASE = 'https://mrbur.odoo.com';
const TICKETING_PATHS = new Set([
  '/api/ticketing/sso',
  '/ticketing/sso',
]);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function jsonRpcResult(result) {
  return jsonResponse({
    jsonrpc: '2.0',
    id: null,
    result,
  });
}

function jsonRpcError(message, status) {
  return jsonResponse({
    jsonrpc: '2.0',
    id: null,
    error: {
      code: status,
      message,
    },
  }, status);
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';

  for (const part of cookieHeader.split(';')) {
    const [cookieName, ...valueParts] = part.trim().split('=');
    if (cookieName !== name) continue;

    try {
      return decodeURIComponent(valueParts.join('='));
    } catch {
      return null;
    }
  }

  return null;
}

function base64UrlEncode(value) {
  const bytes = typeof value === 'string'
    ? new TextEncoder().encode(value)
    : value;
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function signTicketingToken(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({
    alg: 'HS256',
    typ: 'JWT',
  }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function handleTicketingSso(request, env) {
  if (request.method !== 'POST') {
    return jsonRpcError('Method not allowed.', 405);
  }

  if (!env.TICKETING_SSO_SECRET) {
    return jsonRpcError('Ticketing SSO is not configured.', 503);
  }

  // session_id is the authenticated Odoo session. mrbur_sso is a signed
  // identity token and must not be forwarded to Odoo as a session cookie.
  const sessionId = getCookie(request, 'session_id');
  if (!sessionId) {
    return jsonRpcError('Please sign in again.', 401);
  }

  try {
    const odooBase = String(env.ODOO_BASE || DEFAULT_ODOO_BASE).replace(/\/$/, '');
    const sessionResponse = await fetch(
      `${odooBase}/web/session/get_session_info`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Cookie: `session_id=${encodeURIComponent(sessionId)}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {},
          id: Date.now(),
        }),
      },
    );
    const sessionData = await sessionResponse.json().catch(() => null);
    const session = sessionData?.result;

    if (
      !sessionResponse.ok ||
      sessionData?.error ||
      !session?.uid ||
      !session?.partner_id
    ) {
      return jsonRpcError('Unable to verify your Snabbb account.', 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await signTicketingToken({
      sub: String(session.uid),
      partner_id: session.partner_id,
      aud: 'snabbb-ticketing-portal',
      iat: now,
      exp: now + 60,
      jti: crypto.randomUUID(),
    }, env.TICKETING_SSO_SECRET);

    return jsonRpcResult({
      url: `${odooBase}/snabbb/ticketing/sso?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error('Ticketing SSO error:', error);
    return jsonRpcError('Ticketing sign-in is unavailable.', 502);
  }
}

async function serveAssets(request, env) {
  if (!env.ASSETS) {
    return fetch(request);
  }

  const response = await env.ASSETS.fetch(request);
  if (
    response.status !== 404 ||
    request.method !== 'GET' ||
    !(request.headers.get('Accept') || '').includes('text/html')
  ) {
    return response;
  }

  const indexUrl = new URL('/index.html', request.url);
  return env.ASSETS.fetch(new Request(indexUrl, request));
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (TICKETING_PATHS.has(pathname)) {
      return handleTicketingSso(request, env);
    }

    return serveAssets(request, env);
  },
};
