// utils/localDevOrigin.ts
//
// Determines whether the Gallery is currently running as a local
// development frontend, so the post-login/post-logout auth flows can stay
// on the local origin instead of following the production redirect.
//
// Deliberately strict on both axes: `import.meta.env.DEV` means this can
// never be true in a production build regardless of what hostname that
// build happens to be served from, and only an exact loopback hostname
// match qualifies — no wildcard/suffix matching, so an arbitrary LAN or
// public domain (or a look-alike like "localhost.evil.example") never
// receives the local exception. Deliberately hostname-only (never checks
// port), since Vite's `strictPort: false` means the dev server is not
// guaranteed to be on any fixed port.

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalDevelopmentOrigin(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return LOOPBACK_HOSTNAMES.has(window.location.hostname);
  } catch {
    return false;
  }
}
