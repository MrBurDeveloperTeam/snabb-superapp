const KEY = 'pendingCompanyInvitation';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function rememberCompanyInvitation(token: string, expiresAt: string) {
  const expires = Date.parse(expiresAt);
  localStorage.setItem(KEY, JSON.stringify({
    token,
    expiresAt: Number.isFinite(expires)
      ? Math.min(expires, Date.now() + MAX_AGE_MS)
      : Date.now() + MAX_AGE_MS,
  }));
  sessionStorage.removeItem(KEY);
}

export function readPendingCompanyInvitation(): string | null {
  // Migrate invitations saved by the previous version in this tab.
  const legacyToken = sessionStorage.getItem(KEY);
  if (legacyToken) {
    rememberCompanyInvitation(legacyToken, '');
  }
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (typeof saved.token === 'string' && saved.token && saved.expiresAt > Date.now()) {
      return saved.token;
    }
  } catch {
    // Discard malformed saved state.
  }
  localStorage.removeItem(KEY);
  return null;
}

export function clearPendingCompanyInvitation(token: string) {
  // An older request must not clear a different invite opened meanwhile.
  if (readPendingCompanyInvitation() === token) localStorage.removeItem(KEY);
}
