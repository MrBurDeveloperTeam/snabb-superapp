import { buildClinicDeviceLocalAppointmentStart, toCanonicalLocalStartTime } from '../appointmentTimeUtils';
import { getAppointmentAppRoute } from '../knownRoutes';
import { DIALOGUE_ID, PET_DIALOGUE_RULE_VERSION } from '../types';
import type { DialogueCandidate } from '../types';
import type { AppointmentSnapshot, AppointmentSnapshotRow } from './appointmentSnapshotProvider';

/**
 * Pure P1 (appointment within 2 hours) evaluation over the
 * AppointmentSnapshot — no Supabase access here. Clinic-device-local only:
 * both `date`/`start_time` and `evaluationNow` are plain local `Date`
 * values, never converted through UTC.
 */

export const APPOINTMENT_SOON_WINDOW_MS = 2 * 60 * 60 * 1000;

const ELIGIBLE_STATUSES = new Set(['confirmed', 'scheduled']);

interface QualifyingAppointmentSource {
  appointmentId: string;
  start: Date;
  createdTime: string | null;
}

function isEligibleStatus(status: string | null): boolean {
  if (typeof status !== 'string') return false;
  return ELIGIBLE_STATUSES.has(status.trim().toLowerCase());
}

function selectQualifyingSource(row: AppointmentSnapshotRow, evaluationNow: Date): QualifyingAppointmentSource | null {
  if (!row.id) return null;
  if (!isEligibleStatus(row.status)) return null;

  const start = buildClinicDeviceLocalAppointmentStart(row.date, row.start_time);
  if (!start) return null;

  const differenceMs = start.getTime() - evaluationNow.getTime();
  if (differenceMs <= 0) return null; // already started or exactly now
  if (differenceMs > APPOINTMENT_SOON_WINDOW_MS) return null;

  return { appointmentId: row.id, start, createdTime: row.created_at };
}

// Lexicographically greater than any real ISO-8601 timestamp string, used
// as the sentinel sort key for a missing/malformed `created_at` — the same
// approach as todoTaskFilters.ts's compareByCreatedTimeThenTaskId, so a
// data gap never silently wins a selection tie.
const MISSING_CREATED_TIME_SORT_SENTINEL = String.fromCharCode(0xffff);

function createdTimeSortKey(createdTime: string | null): string {
  return createdTime || MISSING_CREATED_TIME_SORT_SENTINEL;
}

function compareSourcesForSelection(a: QualifyingAppointmentSource, b: QualifyingAppointmentSource): number {
  // Earliest local appointment start wins first.
  const aStart = a.start.getTime();
  const bStart = b.start.getTime();
  if (aStart !== bStart) return aStart - bStart;

  const aCreated = createdTimeSortKey(a.createdTime);
  const bCreated = createdTimeSortKey(b.createdTime);
  if (aCreated !== bCreated) return aCreated < bCreated ? -1 : 1;

  return a.appointmentId < b.appointmentId ? -1 : a.appointmentId > b.appointmentId ? 1 : 0;
}

function buildCandidateFromSource(source: QualifyingAppointmentSource): DialogueCandidate {
  let formattedTime: string;
  try {
    formattedTime = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(source.start);
  } catch {
    formattedTime = '';
  }

  // Only if a valid, already-qualified appointment's time unexpectedly
  // fails to format — the qualification itself never depends on this.
  const message = formattedTime ? `You have an appointment at ${formattedTime}.` : 'You have an appointment starting soon.';

  const canonicalStartTime = toCanonicalLocalStartTime(source.start);
  const dateKey = `${source.start.getFullYear()}-${String(source.start.getMonth() + 1).padStart(2, '0')}-${String(
    source.start.getDate()
  ).padStart(2, '0')}`;

  return {
    userState: 'ACTIVE_USER_URGENT',
    dialogueId: DIALOGUE_ID.APPOINTMENT_SOON,
    priority: 'P1',
    message,
    action: { label: 'View Appointment', route: getAppointmentAppRoute() },
    source: {
      app: 'appointment',
      recordId: source.appointmentId,
      evaluatedAt: new Date().toISOString(),
    },
    dedupeKey: `appointment_soon:${source.appointmentId}:start:${dateKey}T${canonicalStartTime}`,
    ruleVersion: PET_DIALOGUE_RULE_VERSION,
    // Does not bypass the entry walk and does not auto-close — an ordinary
    // P1 dialogue, waits like Todo's High Task Today.
    eventTime: source.start.toISOString(),
    createdTime: source.createdTime ?? undefined,
    recordId: source.appointmentId,
  };
}

export interface AppointmentSoonEvaluation {
  candidate: DialogueCandidate | null;
  qualifyingAppointmentIds: Set<string>;
}

export function evaluateAppointmentSoon(snapshot: AppointmentSnapshot, evaluationNow: Date): AppointmentSoonEvaluation {
  const sources: QualifyingAppointmentSource[] = [];

  for (const row of snapshot.appointments) {
    const source = selectQualifyingSource(row, evaluationNow);
    if (source) sources.push(source);
  }

  if (sources.length === 0) {
    return { candidate: null, qualifyingAppointmentIds: new Set() };
  }

  const winner = [...sources].sort(compareSourcesForSelection)[0];
  return {
    candidate: buildCandidateFromSource(winner),
    qualifyingAppointmentIds: new Set(sources.map((s) => s.appointmentId)),
  };
}
