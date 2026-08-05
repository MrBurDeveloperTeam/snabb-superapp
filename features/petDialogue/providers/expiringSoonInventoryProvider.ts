import {
  addCalendarDaysToDateKey,
  daysBetweenDateKeys,
  isWithinInclusiveDateWindow,
  toCalendarDateKey,
} from '../dateUtils';
import { getInventoryAppRoute } from '../knownRoutes';
import { DIALOGUE_ID, PET_DIALOGUE_RULE_VERSION } from '../types';
import type { DialogueCandidate } from '../types';
import type { InventorySnapshot, InventorySnapshotBatch, InventorySnapshotItem } from './inventorySnapshotProvider';

/**
 * Pure P1 (inventory expiring soon) evaluation over the same
 * InventorySnapshot P0 uses — no second Supabase fetch. Mirrors the P0
 * batch-authoritative structure in expiredInventoryProvider.ts (an item
 * with any batch records is evaluated on batch data only; an item with none
 * falls back to its own expiry field) but with the expiring-soon date
 * window instead of the expired-before-today check, and excludes any item
 * that already qualified for P0 (see `expiredItemIds`).
 */

export const INVENTORY_EXPIRING_SOON_DAYS = 30;

/** A single item's qualifying expiring-soon source — either its earliest
 *  qualifying batch, or (only when it has no batch rows at all) the item's
 *  own legacy expiry field. */
interface ExpiringSoonSource {
  kind: 'batch' | 'item';
  itemId: string;
  itemName: string | null;
  expiryDate: string;
  createdTime: string | null;
  batchId?: string;
}

function toNumber(value: number | string | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function compareBatchesForSelection(a: InventorySnapshotBatch, b: InventorySnapshotBatch): number {
  const aExpiry = a.expiry_date ?? '';
  const bExpiry = b.expiry_date ?? '';
  if (aExpiry !== bExpiry) return aExpiry < bExpiry ? -1 : 1;

  const aCreated = a.created_at ?? '';
  const bCreated = b.created_at ?? '';
  if (aCreated !== bCreated) return aCreated < bCreated ? -1 : 1;

  return String(a.id) < String(b.id) ? -1 : 1;
}

function selectExpiringSoonSourceForItem(
  item: InventorySnapshotItem,
  itemBatches: InventorySnapshotBatch[] | undefined,
  todayKey: string,
  windowEndKey: string
): ExpiringSoonSource | null {
  if (itemBatches && itemBatches.length > 0) {
    // Batch-authoritative, same as P0: an item with any batch rows is
    // evaluated purely on batch data, never item-level fields.
    const qualifying = itemBatches.filter(
      (b) => toNumber(b.qty) > 0 && isWithinInclusiveDateWindow(b.expiry_date, todayKey, windowEndKey)
    );
    if (qualifying.length === 0) return null;

    const earliest = [...qualifying].sort(compareBatchesForSelection)[0];
    return {
      kind: 'batch',
      itemId: item.id,
      itemName: item.name,
      expiryDate: earliest.expiry_date as string,
      createdTime: earliest.created_at,
      batchId: earliest.id,
    };
  }

  // No batch rows at all — legacy item-level fallback.
  if (toNumber(item.quantity) > 0 && isWithinInclusiveDateWindow(item.expiry_date, todayKey, windowEndKey)) {
    return {
      kind: 'item',
      itemId: item.id,
      itemName: item.name,
      expiryDate: item.expiry_date as string,
      createdTime: item.created_at,
    };
  }

  return null;
}

function compareSourcesForSelection(a: ExpiringSoonSource, b: ExpiringSoonSource): number {
  if (a.expiryDate !== b.expiryDate) return a.expiryDate < b.expiryDate ? -1 : 1;

  const aCreated = a.createdTime ?? '';
  const bCreated = b.createdTime ?? '';
  if (aCreated !== bCreated) return aCreated < bCreated ? -1 : 1;

  if (a.itemId !== b.itemId) return a.itemId < b.itemId ? -1 : 1;

  const aBatch = a.batchId ?? '';
  const bBatch = b.batchId ?? '';
  return aBatch < bBatch ? -1 : aBatch > bBatch ? 1 : 0;
}

function buildMessage(safeName: string | null, daysRemaining: number): string {
  if (daysRemaining === 0) {
    return safeName ? `${safeName} expires today. Please review it.` : 'An inventory item expires today. Please review it.';
  }
  if (daysRemaining === 1) {
    return safeName
      ? `${safeName} will expire tomorrow. Please review it.`
      : 'An inventory item will expire tomorrow. Please review it.';
  }
  return safeName
    ? `${safeName} will expire in ${daysRemaining} days. Please review it.`
    : `An inventory item will expire in ${daysRemaining} days. Please review it.`;
}

function buildCandidateFromSource(source: ExpiringSoonSource, todayKey: string): DialogueCandidate {
  const safeName = typeof source.itemName === 'string' && source.itemName.trim().length > 0 ? source.itemName.trim() : null;
  const daysRemaining = Math.max(0, daysBetweenDateKeys(todayKey, source.expiryDate));
  const message = buildMessage(safeName, daysRemaining);

  const dedupeKey =
    source.kind === 'batch'
      ? `inventory_expiring_soon:${source.itemId}:batch:${source.batchId}:${source.expiryDate}:window30`
      : `inventory_expiring_soon:${source.itemId}:item:${source.expiryDate}:window30`;

  return {
    userState: 'ACTIVE_USER_URGENT',
    dialogueId: DIALOGUE_ID.INVENTORY_EXPIRING_SOON,
    priority: 'P1',
    message,
    action: { label: 'Check Inventory', route: getInventoryAppRoute() },
    source: {
      app: 'inventory',
      recordId: source.itemId,
      evaluatedAt: new Date().toISOString(),
      // Internal provenance only — never rendered in the UI.
      ...(source.kind === 'batch' ? { batchId: source.batchId } : {}),
    },
    dedupeKey,
    ruleVersion: PET_DIALOGUE_RULE_VERSION,
    // Unlike P0, P1 neither bypasses the entry walk nor auto-closes — it
    // waits like any ordinary dialogue and stays until dismissed/acted on.
    eventTime: source.expiryDate,
    createdTime: source.createdTime ?? undefined,
    recordId: source.itemId,
  };
}

/**
 * `expiredItemIds` (from evaluateExpiredInventory) is excluded wholesale:
 * an item that already has a qualifying P0 source must never also produce
 * a P1 candidate, even if a different batch on that same item would
 * otherwise qualify as expiring soon — P0 is the more serious state.
 */
export function evaluateExpiringSoonInventory(
  snapshot: InventorySnapshot,
  expiredItemIds: Set<string>,
  now: Date = new Date()
): DialogueCandidate | null {
  const todayKey = toCalendarDateKey(now);
  const windowEndKey = addCalendarDaysToDateKey(todayKey, INVENTORY_EXPIRING_SOON_DAYS);

  const sources: ExpiringSoonSource[] = [];
  for (const item of snapshot.items) {
    if (expiredItemIds.has(item.id)) continue;
    const source = selectExpiringSoonSourceForItem(item, snapshot.batchesByItem.get(item.id), todayKey, windowEndKey);
    if (source) sources.push(source);
  }

  if (sources.length === 0) return null;

  const winner = [...sources].sort(compareSourcesForSelection)[0];
  return buildCandidateFromSource(winner, todayKey);
}
