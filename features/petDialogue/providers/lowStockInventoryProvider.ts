import { getInventoryAppRoute } from '../knownRoutes';
import { DIALOGUE_ID, PET_DIALOGUE_RULE_VERSION } from '../types';
import type { DialogueCandidate } from '../types';
import type { InventorySnapshot, InventorySnapshotItem } from './inventorySnapshotProvider';

/**
 * Pure P1 (low stock) evaluation over the same InventorySnapshot P0/expiring
 * soon use — no second Supabase fetch. Unlike those two, Low Stock is
 * evaluated purely from `inventory_items.quantity`: the Inventory app
 * already recalculates that column as the sum of `inventory_item_batches.qty`
 * whenever batches change, so it's already the authoritative total — this
 * evaluator must not re-sum batches itself.
 *
 * Returns a plain candidate (no exposed item-id set, unlike the expired/
 * expiring-soon evaluators): nothing ranks below Low Stock within the
 * inventory P1 subtypes, so there's no downstream consumer that would need
 * "every qualifying low-stock item id" the way P0/expiring-soon need theirs
 * exposed for exclusion purposes.
 */

export const INVENTORY_LOW_STOCK_THRESHOLD = 10;

interface LowStockSource {
  itemId: string;
  itemName: string | null;
  quantity: number;
  createdTime: string | null;
}

/**
 * Strict finite-number parse — deliberately does NOT fall back to 0 the way
 * other inventory evaluators' `toNumber` helpers do (0 already fails the
 * qualifying range here, but silently coercing a malformed/non-numeric
 * `quantity` value would misrepresent unusable data as "confirmed zero").
 * Returns null for anything that isn't a genuine finite number, and the
 * caller skips the row entirely rather than guessing.
 *
 * Blank/whitespace-only strings are rejected explicitly before the `Number()`
 * coercion: `Number('')` and `Number('   ')` both evaluate to `0` in
 * JavaScript, which would otherwise silently turn "no usable value" into a
 * confirmed-zero quantity instead of an unparseable one.
 */
function parseFiniteQuantity(value: number | string | null): number | null {
  if (value === null) return null;
  if (typeof value === 'string' && value.trim().length === 0) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function selectLowStockSourceForItem(item: InventorySnapshotItem): LowStockSource | null {
  const quantity = parseFiniteQuantity(item.quantity);
  if (quantity === null) return null;
  if (quantity < 1 || quantity > INVENTORY_LOW_STOCK_THRESHOLD) return null;

  return {
    itemId: item.id,
    itemName: item.name,
    quantity,
    createdTime: item.created_at,
  };
}

function compareSourcesForSelection(a: LowStockSource, b: LowStockSource): number {
  if (a.quantity !== b.quantity) return a.quantity - b.quantity;

  const aCreated = a.createdTime ?? '';
  const bCreated = b.createdTime ?? '';
  if (aCreated !== bCreated) return aCreated < bCreated ? -1 : 1;

  return a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0;
}

function buildCandidateFromSource(source: LowStockSource): DialogueCandidate {
  const safeName = typeof source.itemName === 'string' && source.itemName.trim().length > 0 ? source.itemName.trim() : null;
  const message = safeName ? `${safeName} is nearly out of stock.` : 'An inventory item is nearly out of stock.';

  // Quantity is part of the dedupe key (not the message) so a materially
  // changed stock level — e.g. dropping further — is treated as a new
  // condition and can appear again, while an unchanged quantity stays
  // suppressed for the rest of the tab session.
  const dedupeKey = `inventory_low_stock:${source.itemId}:quantity:${source.quantity}:threshold${INVENTORY_LOW_STOCK_THRESHOLD}`;

  return {
    userState: 'ACTIVE_USER_URGENT',
    dialogueId: DIALOGUE_ID.INVENTORY_LOW_STOCK,
    priority: 'P1',
    message,
    action: { label: 'Check Inventory', route: getInventoryAppRoute() },
    source: {
      app: 'inventory',
      recordId: source.itemId,
      evaluatedAt: new Date().toISOString(),
    },
    dedupeKey,
    ruleVersion: PET_DIALOGUE_RULE_VERSION,
    // No bypassEntryWalk (only P0 does that) and no autoCloseMs (only the
    // fixed fallback does that) — Low Stock behaves like an ordinary P1
    // dialogue: waits for the entry walk, stays until dismissed/acted on.
    createdTime: source.createdTime ?? undefined,
    recordId: source.itemId,
  };
}

/**
 * `excludedItemIds` is the union of expired (P0) and expiring-soon (P1)
 * qualifying item ids — an item already flagged by either of those must
 * never also produce a Low Stock candidate, regardless of session-handled
 * state for those other candidates.
 */
export function evaluateLowStockInventory(
  snapshot: InventorySnapshot,
  excludedItemIds: Set<string>
): DialogueCandidate | null {
  const sources: LowStockSource[] = [];
  for (const item of snapshot.items) {
    if (excludedItemIds.has(item.id)) continue;
    const source = selectLowStockSourceForItem(item);
    if (source) sources.push(source);
  }

  if (sources.length === 0) return null;

  const winner = [...sources].sort(compareSourcesForSelection)[0];
  return buildCandidateFromSource(winner);
}
