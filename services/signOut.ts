import api from "./api";
import {
  clearLocalSupabaseSession,
  clearLogoutStorage,
  resolveOutgoingSupabaseUserId,
} from "../utils/logoutStorage";

/**
 * Full explicit-logout sequence for the initiating tab: capture the
 * outgoing user's identity, sign out of Odoo and Supabase, then run the
 * scoped local-storage cleanup (see utils/logoutStorage.ts — no
 * localStorage.clear()/sessionStorage.clear() involved). Every step is
 * best-effort: a failure in one step (e.g. the Odoo request) must not skip
 * the rest, so local security cleanup always runs.
 */
export const signOut = async () => {
  // Capture before any sign-out call, since a completed Supabase sign-out
  // clears the session this reads from.
  const outgoingUserId = await resolveOutgoingSupabaseUserId();

  try {
    await api.post('/logout', {});
  } catch (err) {
    console.warn('[signOut] Odoo logout request failed:', err);
  }

  await clearLocalSupabaseSession();

  clearLogoutStorage({ userId: outgoingUserId ?? undefined });
};
