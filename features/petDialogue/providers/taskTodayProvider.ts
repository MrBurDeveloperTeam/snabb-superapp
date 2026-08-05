import { sanitizeTaskTitleForDialogue } from '../safeTaskTitle';
import { getTodoAppRoute } from '../knownRoutes';
import { DIALOGUE_ID, PET_DIALOGUE_RULE_VERSION } from '../types';
import type { DialogueCandidate } from '../types';
import type { TodoSnapshot } from './todoSnapshotProvider';
import {
  compareByCreatedTimeThenTaskId,
  extractQualifyingHighUrgencyTaskSource,
  type QualifyingHighUrgencyTaskSource,
} from './todoTaskFilters';

/**
 * Pure P2 (High-priority task due today) evaluation over the TodoSnapshot —
 * no Supabase access here. A task qualifies only when its validated date
 * equals `localToday` exactly; mutually exclusive with the P0 overdue
 * evaluator by construction (`===` here vs `<` there against the same
 * validated date key).
 *
 * `time` is deliberately not part of the fetched TodoSnapshotTask fields
 * (see todoSnapshotProvider.ts) and is not used for eligibility or
 * ordering here — a task due today remains P2 for the whole local day
 * regardless of any time-of-day value, per the fixed trigger rules. Tie
 * -breaking therefore falls straight to created_at/id rather than an
 * optional-time comparison.
 */

function compareSourcesForSelection(a: QualifyingHighUrgencyTaskSource, b: QualifyingHighUrgencyTaskSource): number {
  // created_at, then task id — see todoTaskFilters.ts for why a
  // missing/malformed created_at must not silently win this tie.
  return compareByCreatedTimeThenTaskId(a, b);
}

function buildCandidateFromSource(source: QualifyingHighUrgencyTaskSource): DialogueCandidate {
  const safeTitle = sanitizeTaskTitleForDialogue(source.title);
  const message = safeTitle
    ? `Your important task "${safeTitle}" is due today.`
    : 'You have an important task due today.';

  return {
    userState: 'ACTIVE_USER_URGENT',
    dialogueId: DIALOGUE_ID.HIGH_TASK_TODAY,
    priority: 'P2',
    message,
    action: { label: 'View Task', route: getTodoAppRoute() },
    source: {
      app: 'todo',
      recordId: source.taskId,
      evaluatedAt: new Date().toISOString(),
    },
    dedupeKey: `high_task_today:${source.taskId}:date:${source.validatedDateKey}`,
    ruleVersion: PET_DIALOGUE_RULE_VERSION,
    // P2 waits for the entry walk like an ordinary dialogue and does not
    // auto-close — only P0 bypasses/auto-closes.
    eventTime: source.validatedDateKey,
    createdTime: source.createdTime ?? undefined,
    recordId: source.taskId,
  };
}

export interface TaskTodayEvaluation {
  candidate: DialogueCandidate | null;
  qualifyingTaskIds: Set<string>;
}

export function evaluateHighTaskToday(snapshot: TodoSnapshot, localToday: string): TaskTodayEvaluation {
  const sources: QualifyingHighUrgencyTaskSource[] = [];

  for (const task of snapshot.tasks) {
    const source = extractQualifyingHighUrgencyTaskSource(task);
    if (!source) continue;
    if (source.validatedDateKey === localToday) sources.push(source);
  }

  if (sources.length === 0) {
    return { candidate: null, qualifyingTaskIds: new Set() };
  }

  const winner = [...sources].sort(compareSourcesForSelection)[0];
  return {
    candidate: buildCandidateFromSource(winner),
    qualifyingTaskIds: new Set(sources.map((s) => s.taskId)),
  };
}
