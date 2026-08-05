// Centralized, scoped logout-cleanup registry.
//
// Replaces the previous `localStorage.clear()` / `sessionStorage.clear()`
// blanket clear in services/signOut.ts. Every key this module ever touches
// is explicitly enumerated below — nothing here iterates or deletes an
// unbounded set of keys.
//
// Deliberately preserved (never touched by anything in this file), with the
// evidence for why:
//   - intro_shown_{userId}        durable per-user onboarding flag; logout
//                                  must not cause the Intro to replay.
//   - snabbb-theme                zustand-persisted device UI preference.
//   - snabbb-announcement-bar     zustand-persisted dismissal preference.
//   - remember_email              explicit, opt-in "Remember Me" preference.
//   - snabbb_sso_synced_{email}   sessionStorage (already tab-scoped), keyed
//                                  by email so it can't cross-contaminate a
//                                  different user; clearing it would only
//                                  force a same-tab same-user re-sync with no
//                                  security benefit.
import { supabase } from '../services/supabaseClient';
import { clearPersonalizedDialogueSession } from '../features/petDialogue/sessionDedupe';

export interface LogoutStorageContext {
  userId?: string | null;
  /** Reserved for future scoped cleanup keyed by email; not used by any
   *  cleanup function today (see snabbb_sso_synced_{email} note above). */
  email?: string | null;
}

// ─── Bucket A: local mirrors of authentication/identity state ──────────────
// odoo_session is the confirmed, actively-written/read Odoo session mirror
// (utils/authStorage.ts, constants.ts, services/getCompanies.ts,
// services/sessionInfo.ts, features/auth/hooks/useLoginMutation.ts /
// useGetSessionInfo.ts). gallery_user and external_user_id are written by
// features/lib/auth.ts / features/auth/pages/AuthPage.tsx respectively, but
// a repo-wide search found no call site that ever invokes the functions that
// write them (loginWithOdoo(), setExternalUserId()) — they are confirmed
// dead code today. They're still cleared here defensively, in case that
// changes, since doing so costs nothing and is not a blanket-clear.
const AUTH_MIRROR_KEYS = ['odoo_session', 'gallery_user', 'external_user_id'] as const;

// ─── Bucket D: non-namespaced Virtual Pet local cache ───────────────────────
// Confirmed via VirtualPet/context/GameStateContext.tsx: on mount, these
// keys are read and applied to React state SYNCHRONOUSLY as a fallback,
// before the async Supabase fetch for the now-authenticated user resolves
// (and, if that fetch errors, nothing ever corrects the fallback). Left
// behind after logout, they let the next user on the same device briefly —
// or, on a failed fetch, indefinitely — see the previous user's pet
// name/stats. Supabase (`inventory_pet` / `pet_inventory` tables) remains
// the authoritative source and is re-fetched on next login, so clearing
// this local cache causes no real data loss, only a fresh reload. This is
// the same key set GameStateContext's own internal `clearPetLocalStorage()`
// already resets when Supabase confirms no pet exists for a user, plus
// `virtual_pet_next_poop_at` (VirtualPet/PetRoom.tsx), which is the same
// class of non-namespaced local-only cache but isn't covered by that
// existing helper.
const PET_CACHE_KEYS = [
  'pet_stats',
  'pet_name',
  'pet_inventory',
  'pet_last_saved_at',
  'pet_active_ball',
  'pet_active_bed',
  'pet_active_bed_default_none_v1',
  'pet_is_sleeping',
  'pet_is_sleeping_updated_at',
  'pet_adoption_confirmed',
  'virtual_pet_bathroom_soap_inventory',
  'virtual_pet_next_poop_at',
] as const;

function safeRemoveLocalStorageKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[logoutStorage] failed to remove localStorage key "${key}":`, err);
  }
}

/** Bucket A: clears local mirrors of authentication/identity state. Idempotent. */
export function clearAuthStorage(): void {
  AUTH_MIRROR_KEYS.forEach(safeRemoveLocalStorageKey);
}

/**
 * Bucket B: clears the outgoing user's own Phase 1A dialogue dedupe keys
 * (`snabbb_pet_dialogue:{userId}:*`) only. A no-op when `userId` is
 * unavailable — never falls back to clearing sessionStorage broadly, and
 * never touches another user's keys.
 */
export function clearOutgoingUserSessionStorage(context: LogoutStorageContext): void {
  if (!context.userId) return;
  clearPersonalizedDialogueSession(context.userId);
}

/** Bucket D: clears the confirmed-unsafe, non-namespaced Virtual Pet local cache. Idempotent. */
export function clearUnsafeGlobalUserCache(): void {
  PET_CACHE_KEYS.forEach(safeRemoveLocalStorageKey);
}

/**
 * The single storage-cleanup entry point for logout. Pure storage access
 * only — no network calls — so it's safe to call from a receiving tab
 * reacting to cross-tab SSO_LOGOUT as well as from the initiating tab's own
 * explicit logout. Idempotent; safe to call more than once.
 */
export function clearLogoutStorage(context: LogoutStorageContext): void {
  clearAuthStorage();
  clearOutgoingUserSessionStorage(context);
  clearUnsafeGlobalUserCache();
}

/**
 * Best-effort read of the current Supabase-bridged user id, for callers that
 * need to capture outgoing-user context before any sign-out call runs (a
 * completed sign-out clears the session this reads from). Never throws.
 */
export async function resolveOutgoingSupabaseUserId(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch (err) {
    console.warn('[logoutStorage] could not resolve outgoing Supabase user id:', err);
    return null;
  }
}

/**
 * Best-effort local Supabase sign-out. Supabase's persisted session lives in
 * this origin's own localStorage, so a tab reacting to another origin's
 * logout (cross-tab SSO_LOGOUT) still needs to clear its own copy — that
 * other origin's sign-out cannot reach this origin's storage. Never throws;
 * a failure here must not block the rest of logout.
 */
export async function clearLocalSupabaseSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[logoutStorage] Supabase sign-out failed:', err);
  }
}
