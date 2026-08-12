import { sanitizeTaskTitleForDialogue } from '../safeTaskTitle';
import { getTodoAppRoute } from '../knownRoutes';
import { DIALOGUE_ID, PET_DIALOGUE_RULE_VERSION } from '../types';
import type { DialogueCandidate, InsightCandidate } from '../types';
import type { TodoSnapshot } from './todoSnapshotProvider';
import {
  compareByCreatedTimeThenTaskId,
  extractQualifyingHighUrgencyTaskSource,
  type QualifyingHighUrgencyTaskSource,
} from './todoTaskFilters';

/** See overdueTaskProvider.ts's OverdueHighTaskFacts for the same design
 *  intent — same source type, `urgency` is always 'HIGH' by construction. */
export interface HighTaskTodayFacts {
  taskId: string;
  title: string | null;
  dueDate: string;
  urgency: 'HIGH';
}

/**
 * Pure P1 (High-priority task due today) evaluation over the TodoSnapshot —
 * no Supabase access here. A task qualifies only when its validated date
 * equals `localToday` exactly; mutually exclusive with the P0 overdue
 * evaluator by construction (`===` here vs `<` there against the same
 * validated date key).
 *
 * `time` is deliberately not part of the fetched TodoSnapshotTask fields
 * (see todoSnapshotProvider.ts) and is not used for eligibility or
 * ordering here — a task due today remains P1 for the whole local day
 * regardless of any time-of-day value, per the fixed trigger rules. Tie
 * -breaking therefore falls straight to created_at/id rather than an
 * optional-time comparison.
 */

function compareSourcesForSelection(a: QualifyingHighUrgencyTaskSource, b: QualifyingHighUrgencyTaskSource): number {
  // created_at, then task id — see todoTaskFilters.ts for why a
  // missing/malformed created_at must not silently win this tie.
  return compareByCreatedTimeThenTaskId(a, b);
}

function buildCandidateFromSource(source: QualifyingHighUrgencyTaskSource): InsightCandidate<HighTaskTodayFacts> {
  const safeTitle = sanitizeTaskTitleForDialogue(source.title);
  const message = safeTitle
    ? `Your important task "${safeTitle}" is due today.`
    : 'You have an important task due today.';
  const messageTemplate = 'Your important task "{title}" is due today.';

  const evaluatedAt = new Date().toISOString();
  const facts: HighTaskTodayFacts = {
    taskId: source.taskId,
    title: source.title,
    dueDate: source.validatedDateKey,
    urgency: 'HIGH',
  };

  return {
    app: 'todo',
    triggerId: DIALOGUE_ID.HIGH_TASK_TODAY,
    facts,
    messageTemplate,
    sourceRecordId: source.taskId,
    evaluatedAt,
    userState: 'ACTIVE_USER_URGENT',
    dialogueId: DIALOGUE_ID.HIGH_TASK_TODAY,
    priority: 'P1',
    message,
    action: { label: 'View Task', route: getTodoAppRoute() },
    source: {
      app: 'todo',
      recordId: source.taskId,
      evaluatedAt,
    },
    dedupeKey: `high_task_today:${source.taskId}:date:${source.validatedDateKey}`,
    ruleVersion: PET_DIALOGUE_RULE_VERSION,
    // P1 waits for the entry walk like an ordinary dialogue and does not
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
