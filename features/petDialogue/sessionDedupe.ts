// Phase 1A de-duplication: sessionStorage only, no backend table yet.
// Keys are always namespaced by authenticated user id so account switching
// can never reuse another user's dismissal state.

const SESSION_DEDUPE_PREFIX = 'snabbb_pet_dialogue';

function buildStorageKey(userId: string, dedupeKey: string): string {
  return `${SESSION_DEDUPE_PREFIX}:${userId}:${dedupeKey}`;
}

export function hasHandledInSession(userId: string, dedupeKey: string): boolean {
  if (!userId || !dedupeKey) return false;
  try {
    return sessionStorage.getItem(buildStorageKey(userId, dedupeKey)) === 'handled';
  } catch {
    // sessionStorage can throw in some privacy modes — treat as "not yet
    // handled", the safe default (worst case: the dialogue shows again).
    return false;
  }
}

export function markHandledInSession(userId: string, dedupeKey: string): void {
  if (!userId || !dedupeKey) return;
  try {
    sessionStorage.setItem(buildStorageKey(userId, dedupeKey), 'handled');
  } catch (err) {
    console.warn('[petDialogue] could not persist session dedupe state:', err);
  }
}

/**
 * Explicit, user-scoped clear for logout: removes only this feature's own
 * `snabbb_pet_dialogue:{userId}:*` keys, never anything else. Deliberately
 * does not call `sessionStorage.clear()`/`localStorage.clear()` — those
 * would also wipe unrelated Snabbb session state (SSO sync flags,
 * `intro_shown_{userId}`, pet stats, theme, etc.) that this feature has no
 * business touching. This is also the only mechanism that clears this
 * feature's state on the cross-tab `SSO_LOGOUT` path in App.tsx, which does
 * not go through the app's broader logout/sign-out flow.
 */
export function clearPersonalizedDialogueSession(userId: string): void {
  if (!userId) return;
  try {
    const prefix = `${SESSION_DEDUPE_PREFIX}:${userId}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch (err) {
    console.warn('[petDialogue] could not clear session dedupe state on logout:', err);
  }
}
