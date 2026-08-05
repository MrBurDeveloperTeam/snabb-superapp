import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useCreateAppLink } from '@/mutation/useCreateAppLink';
import { getAuthUser } from '@/utils/authStorage';
import { resolvePersonalizedDialogue } from './resolveDialogue';
import { fetchInventoryDialogueEvaluation } from './providers/inventorySnapshotProvider';
import { fetchTodoDialogueEvaluation } from './providers/todoSnapshotProvider';
import { buildProfileCandidate } from './providers/profileProvider';
import { fetchLegacyIntroCandidate } from './providers/legacyIntroProvider';
import { resolveSafeFirstName } from './nameResolution';
import { hasHandledInSession, markHandledInSession } from './sessionDedupe';
import { getInventoryAppRoute, getTodoAppRoute, getProfileSettingsRoute } from './knownRoutes';
import { toCalendarDateKey } from './dateUtils';
import {
  DIALOGUE_ID,
  PET_DIALOGUE_RULE_VERSION,
  type DialogueCandidate,
  type PersonalizedDialogueLifecycle,
  type ProfileCompletionStatus,
} from './types';

const DEFAULT_FALLBACK_AUTO_CLOSE_MS = 6000;

interface UsePersonalizedPetDialogueOptions {
  /** Feature flag enabled AND the user is logged in (mirrors CatMascot's `!disabled`). */
  active: boolean;
  profileStatus: ProfileCompletionStatus;
  /** Reads the existing `intro_shown_{userId}` localStorage flag — owned by CatMascot, not duplicated here. */
  introAlreadyCompleted: (userId: string) => boolean;
  onNavigateInternal?: (path: string) => void;
}

export interface PersonalizedDialogueSelection {
  candidate: DialogueCandidate;
  /** Populated only when the resolved candidate is the legacy post-login intro. */
  introSteps: string[];
}

function buildFallbackCandidate(params: {
  userId: string;
  profileName?: string | null;
  profileFullName?: string | null;
  metaName?: string | null;
  email?: string | null;
  autoCloseMs: number;
}): DialogueCandidate {
  const firstName = resolveSafeFirstName(params);
  const message = firstName ? `Welcome back, ${firstName}!` : 'Welcome back!';

  return {
    userState: 'GENERAL_USER_NO_URGENT',
    dialogueId: DIALOGUE_ID.WELCOME_FALLBACK,
    priority: 'FALLBACK',
    message,
    source: { app: 'gallery', evaluatedAt: new Date().toISOString() },
    dedupeKey: `welcome_fallback:${params.userId}`,
    ruleVersion: PET_DIALOGUE_RULE_VERSION,
    autoCloseMs: params.autoCloseMs,
    recordId: params.userId,
  };
}

/**
 * Orchestrates Phase 1A candidate evaluation and deterministic selection.
 * Pure resolution logic lives in resolveDialogue.ts; this hook is only
 * responsible for fetching candidates, guarding against stale/late
 * responses, and locking the final selection for the current mount.
 */
export function usePersonalizedPetDialogue({
  active,
  profileStatus,
  introAlreadyCompleted,
  onNavigateInternal,
}: UsePersonalizedPetDialogueOptions) {
  const [lifecycle, setLifecycle] = useState<PersonalizedDialogueLifecycle>('idle');
  const [selection, setSelection] = useState<PersonalizedDialogueSelection | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const generationRef = useRef(0);
  const lockedUserIdRef = useRef<string | null>(null);
  const { mutateAsync: createAppLink } = useCreateAppLink();

  useEffect(() => {
    if (!active) {
      setLifecycle('idle');
      setSelection(null);
      setUserId(null);
      lockedUserIdRef.current = null;
      return;
    }

    const generation = ++generationRef.current;
    const controller = new AbortController();
    let cancelled = false;

    setLifecycle('loading');
    setSelection(null);

    const isStale = () => cancelled || generation !== generationRef.current;

    const run = async () => {
      let currentUserId: string | null = null;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isStale()) return;

        currentUserId = session?.user?.id ?? null;
        const metaName = (session?.user?.user_metadata as { name?: string } | undefined)?.name ?? null;
        const email = session?.user?.email ?? null;

        if (!currentUserId) {
          // Not enough identity to safely scope any query — go straight to
          // the hardcoded fallback rather than guessing at another user's data.
          setLifecycle('failed');
          setSelection({
            candidate: buildFallbackCandidate({ userId: 'anonymous', autoCloseMs: DEFAULT_FALLBACK_AUTO_CLOSE_MS }),
            introSteps: [],
          });
          return;
        }

        lockedUserIdRef.current = currentUserId;
        setUserId(currentUserId);

        const fetchDisplayNameProfile = async (): Promise<{ name?: string | null; full_name?: string | null } | null> => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('name, full_name')
              .eq('user_id', currentUserId)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        };

        const localToday = toCalendarDateKey(new Date());

        const [inventoryResult, todoResult, introResult, profileRow] = await Promise.all([
          fetchInventoryDialogueEvaluation(currentUserId, controller.signal),
          fetchTodoDialogueEvaluation(currentUserId, localToday, controller.signal),
          fetchLegacyIntroCandidate(currentUserId, introAlreadyCompleted(currentUserId), controller.signal),
          fetchDisplayNameProfile(),
        ]);

        if (isStale()) return;

        if (inventoryResult.status === 'aborted' || todoResult.status === 'aborted') {
          // The shared per-evaluation controller was aborted (unmount, user
          // change, or a newer generation) — isStale() above should already
          // have caught this, but bail out explicitly rather than act on a
          // cancelled evaluation's result under any circumstance.
          return;
        }

        const fallback = buildFallbackCandidate({
          userId: currentUserId,
          profileName: profileRow?.name,
          profileFullName: profileRow?.full_name,
          metaName,
          email,
          autoCloseMs: DEFAULT_FALLBACK_AUTO_CLOSE_MS,
        });

        if (inventoryResult.status === 'failed' || todoResult.status === 'failed') {
          // A provider failure is never "no urgent inventory/tasks exist" —
          // it's unknown. With two independent urgent-data providers now in
          // play, either one failing must fail the whole evaluation closed:
          // never show Profile/P1/P2/Intro while a real P0 could be hidden
          // behind the other provider's failure. Go straight to the neutral
          // fallback (no timeout/error wording — buildFallbackCandidate's
          // message is identical regardless of why the evaluation couldn't
          // be trusted).
          if (inventoryResult.status === 'failed') {
            console.warn('[petDialogue] inventory evaluation failed, reason:', inventoryResult.reason);
          }
          if (todoResult.status === 'failed') {
            console.warn('[petDialogue] todo evaluation failed, reason:', todoResult.reason);
          }
          setLifecycle('failed');
          setSelection({ candidate: fallback, introSteps: [] });
          return;
        }

        const { expiredCandidate, expiringSoonCandidate, lowStockCandidate } = inventoryResult.candidate;
        const { overdueCandidate, taskTodayCandidate } = todoResult.candidate;

        // Explicit P0 subtype rank: expired inventory always outranks an
        // overdue High task. Resolved here, before either reaches the
        // shared resolver, so resolveDialogue.ts never has to compare an
        // inventory expiry date against a Todo task date — at most one P0
        // candidate is ever passed into it.
        const unhandledExpired = expiredCandidate && !hasHandledInSession(currentUserId, expiredCandidate.dedupeKey)
          ? expiredCandidate
          : null;
        const unhandledOverdueTask = overdueCandidate && !hasHandledInSession(currentUserId, overdueCandidate.dedupeKey)
          ? overdueCandidate
          : null;
        const p0 = unhandledExpired ?? unhandledOverdueTask;

        if (p0) {
          // A real P0 candidate always wins immediately — never wait on
          // profile status.
          setLifecycle('ready');
          setSelection({ candidate: p0, introSteps: [] });
          return;
        }

        // No selectable P0. Wait for profile completeness before deciding
        // among Profile / P1 / Intro / Fallback — an "incomplete" result
        // must still outrank P1 and the legacy intro. The effect re-runs
        // when profileStatus changes.
        if (profileStatus === 'loading') {
          return;
        }

        const profileCandidateRaw = buildProfileCandidate(profileStatus, currentUserId);
        const profileCandidate = hasHandledInSession(currentUserId, profileCandidateRaw?.dedupeKey ?? '')
          ? null
          : profileCandidateRaw;

        // Session dedupe is applied independently to each P1 subtype before
        // choosing between them — a handled Expiring Soon must not block an
        // otherwise-eligible Low Stock candidate on a different item, and
        // vice versa.
        const unhandledExpiringSoon = expiringSoonCandidate && !hasHandledInSession(currentUserId, expiringSoonCandidate.dedupeKey)
          ? expiringSoonCandidate
          : null;
        const unhandledLowStock = lowStockCandidate && !hasHandledInSession(currentUserId, lowStockCandidate.dedupeKey)
          ? lowStockCandidate
          : null;

        // Explicit P1 subtype rank: Expiring Soon always outranks Low Stock.
        // Resolved here, before either ever reaches the shared resolver, so
        // resolveDialogue.ts never has to compare an expiry date's eventTime
        // against a Low Stock candidate (which has none) — at most one P1
        // candidate is ever passed into it.
        const p1 = unhandledExpiringSoon ?? unhandledLowStock;

        // Single P2 subtype today (High task due today) — no subtype rank
        // needed yet, but resolved the same way (session dedupe applied
        // before it ever reaches the shared resolver).
        const p2 = taskTodayCandidate && !hasHandledInSession(currentUserId, taskTodayCandidate.dedupeKey)
          ? taskTodayCandidate
          : null;

        // Priority ordering (PROFILE > P1 > P2 > LEGACY_INTRO > FALLBACK)
        // lives entirely in resolveDialogue.ts's PRIORITY_RANK — passing all
        // remaining candidates here rather than branching on profileStatus
        // ourselves keeps that ranking the single source of truth.
        const resolved = resolvePersonalizedDialogue([profileCandidate, p1, p2, introResult.candidate], fallback);

        setLifecycle('ready');
        setSelection({
          candidate: resolved,
          introSteps: resolved.dialogueId === DIALOGUE_ID.LEGACY_POST_LOGIN_INTRO ? introResult.steps : [],
        });
      } catch (err) {
        if (isStale()) return;
        console.warn('[petDialogue] evaluation failed, using fallback:', err);
        setLifecycle('failed');
        setSelection({
          candidate: buildFallbackCandidate({
            userId: currentUserId ?? 'unknown',
            autoCloseMs: DEFAULT_FALLBACK_AUTO_CLOSE_MS,
          }),
          introSteps: [],
        });
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // profileStatus is intentionally a dependency: while it's 'loading' the
    // run above returns early without resolving, and must re-run once a real
    // status arrives so PROFILE can still outrank LEGACY_INTRO/FALLBACK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, profileStatus]);

  const markShown = useCallback((candidate: DialogueCandidate) => {
    const uid = lockedUserIdRef.current;
    if (!uid) return;
    if (
      candidate.priority === 'P0' ||
      candidate.priority === 'PROFILE' ||
      candidate.priority === 'P1' ||
      candidate.priority === 'P2'
    ) {
      markHandledInSession(uid, candidate.dedupeKey);
    }
  }, []);

  const runAction = useCallback(
    async (candidate: DialogueCandidate) => {
      const uid = lockedUserIdRef.current;
      if (uid) markHandledInSession(uid, candidate.dedupeKey);

      if (candidate.dialogueId === DIALOGUE_ID.PROFILE_INCOMPLETE) {
        onNavigateInternal?.(getProfileSettingsRoute());
        return;
      }

      if (
        candidate.dialogueId === DIALOGUE_ID.EXPIRED_INVENTORY ||
        candidate.dialogueId === DIALOGUE_ID.INVENTORY_EXPIRING_SOON ||
        candidate.dialogueId === DIALOGUE_ID.INVENTORY_LOW_STOCK
      ) {
        const authUser = getAuthUser();
        // Open the tab synchronously (before any await) so popup blockers
        // treat it as part of the click gesture — same pattern as AppCard.
        const w = window.open('', '_blank');
        if (!authUser?.username) {
          if (w) w.location.href = getInventoryAppRoute();
          return;
        }
        try {
          const res = (await createAppLink({ app: 'inventory', email: authUser.username, name: authUser.name })) as {
            result?: { url?: string };
          };
          const url = res?.result?.url;
          if (w) w.location.href = url || getInventoryAppRoute();
        } catch {
          if (w) w.location.href = getInventoryAppRoute();
        }
        return;
      }

      if (candidate.dialogueId === DIALOGUE_ID.OVERDUE_HIGH_TASK || candidate.dialogueId === DIALOGUE_ID.HIGH_TASK_TODAY) {
        const authUser = getAuthUser();
        // Same pattern as the Inventory branch above — always the Todo
        // landing page, never a task-detail path (no such controlled route
        // exists).
        const w = window.open('', '_blank');
        if (!authUser?.username) {
          if (w) w.location.href = getTodoAppRoute();
          return;
        }
        try {
          const res = (await createAppLink({ app: 'todo', email: authUser.username, name: authUser.name })) as {
            result?: { url?: string };
          };
          const url = res?.result?.url;
          if (w) w.location.href = url || getTodoAppRoute();
        } catch {
          if (w) w.location.href = getTodoAppRoute();
        }
        return;
      }

      // Unknown dialogueId — should never happen for a resolver-produced
      // candidate. Deliberately do nothing rather than trusting an
      // unvalidated route string.
    },
    [onNavigateInternal, createAppLink]
  );

  return { lifecycle, selection, userId, markShown, runAction };
}
