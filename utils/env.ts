// src/utils/env.ts
//
// Shared "are we running against production's real snabbb.com domains, or
// somewhere else (local dev, LAN, a tunnel, ...)" check.
//
// A growing number of features fetch a *.snabbb.com subdomain directly
// (account.snabbb.com for the profile image, sso.snabbb.com via the SSO
// app-link redirect, app.snabbb.com in a handful of other places) with no
// local/dev equivalent — those domains simply don't exist outside
// production. Code that depends on one of them should check isLocalDev()
// first and skip gracefully instead of firing a request that can only ever
// 401/404/CORS-fail from a dev machine.
//
// Checking the hostname against a fixed allowlist (['localhost',
// '127.0.0.1']) missed real dev traffic: vite.config.ts's server.host is
// '0.0.0.0' with allowedHosts: true, specifically so the dev server is also
// reachable over the LAN (e.g. http://192.168.x.x:3000, for testing from a
// phone on the same network) — that hostname is neither 'localhost' nor
// '127.0.0.1'. Testing "is this actually a *.snabbb.com origin" instead
// covers every non-production address (localhost, 127.0.0.1, a LAN IP, a
// custom hosts-file domain, a tunnel) without having to enumerate them.
export function isLocalDev(): boolean {
  if (typeof window === 'undefined') return false;
  return !/(^|\.)snabbb\.com$/.test(window.location.hostname);
}
