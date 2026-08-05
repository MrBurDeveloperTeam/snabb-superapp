// Phase 1A/1C dialogue candidate contract.
//
// Shape follows the AI-Personalized Pet Dialogue System engineering
// reference, with the current priority order (P0 > incomplete profile > P1
// > legacy post-login intro > fallback) baked into `DialoguePriority`. P2
// is intentionally not represented yet.

export type DialoguePriority = 'P0' | 'PROFILE' | 'P1' | 'LEGACY_INTRO' | 'FALLBACK';

export type DialogueUserState =
  | 'ACTIVE_USER_URGENT'
  | 'NEW_USER_INCOMPLETE_PROFILE'
  | 'LEGACY_POST_LOGIN_INTRO'
  | 'GENERAL_USER_NO_URGENT';

export interface DialogueAction {
  label: string;
  route: string;
}

export interface DialogueSource {
  app: string;
  recordId?: string;
  evaluatedAt: string;
  /** Optional batch-level provenance (e.g. Phase 1B batch-authoritative expiry). Internal metadata only — never rendered in the UI. */
  batchId?: string;
}

export interface DialogueCandidate {
  userState: DialogueUserState;
  dialogueId: string;
  priority: DialoguePriority;
  message: string;
  action?: DialogueAction;
  source: DialogueSource;
  expiresAt?: string;
  dedupeKey: string;
  ruleVersion: string;
  /** P0 alerts may bypass the cosmetic entry-walk gate; everything else waits for it. */
  bypassEntryWalk?: boolean;
  /** Only the fixed welcome fallback uses this today. */
  autoCloseMs?: number;
  /** Event/condition time (e.g. an expiry date) — first tie-breaker within the same priority. */
  eventTime?: string;
  /** Record creation time — second tie-breaker within the same priority. */
  createdTime?: string;
  /** Stable record id — final tie-breaker. Callers fall back to dedupeKey when no natural id exists. */
  recordId?: string;
}

/**
 * Controlled set of dialogue ids. The action-execution layer switches on
 * these (not on `action.route` as a free-form URL) so only known, reviewed
 * destinations can ever be navigated to.
 */
export const DIALOGUE_ID = {
  EXPIRED_INVENTORY: 'expired_inventory',
  INVENTORY_EXPIRING_SOON: 'inventory_expiring_soon',
  INVENTORY_LOW_STOCK: 'inventory_low_stock',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  LEGACY_POST_LOGIN_INTRO: 'legacy_post_login_intro',
  WELCOME_FALLBACK: 'welcome_fallback',
} as const;

export type DialogueId = (typeof DIALOGUE_ID)[keyof typeof DIALOGUE_ID];

/** Centralized rule version for every Phase 1A candidate. */
export const PET_DIALOGUE_RULE_VERSION = 'pet-dialogue-phase-1a-v1';

/**
 * Mirrors the Odoo-derived `profileComplete` signal already resolved in
 * App.tsx. 'loading' and 'unknown' are distinct on purpose: a request that's
 * still in flight must be waited on, while a request that failed must never
 * be treated as "incomplete".
 */
export type ProfileCompletionStatus = 'loading' | 'complete' | 'incomplete' | 'unknown';

export type PersonalizedDialogueLifecycle = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Reasons a candidate provider can fail an evaluation outright (as opposed
 * to completing and legitimately finding nothing). Distinct from `null`
 * candidates: a `null` candidate means "evaluation completed and there is
 * genuinely nothing to show"; a `failed` result means "evaluation could not
 * be trusted" and must never be read as "nothing urgent exists".
 */
export type CandidateProviderFailureReason =
  | 'item_query_failed'
  | 'batch_query_failed'
  | 'pagination_incomplete'
  | 'unexpected_data'
  | 'timeout';

/**
 * Explicit result contract for candidate providers that need to distinguish
 * a trustworthy "no candidate" outcome from an untrustworthy failure or a
 * cancelled evaluation. `aborted` covers unmount, user change, logout, and
 * superseded (stale-generation) evaluations — callers must apply no result
 * for it, not fall back to anything.
 */
export type CandidateProviderResult<T> =
  | { status: 'success'; candidate: T | null }
  | { status: 'failed'; reason: CandidateProviderFailureReason }
  | { status: 'aborted' };
