// PHASE 9B (Virtual Pet migration): this file is the LOCAL persistence
// adapter connecting the shared `@mrburdeveloperteam/molar-experience/pet`
// runtime to App Gallery's OWN existing database. It implements the
// package's `PetRepository` interface — the shared runtime only ever calls
// these methods, never `supabase` directly. Every query here is moved
// mechanically from `VirtualPet/context/GameStateContext.tsx` (and
// `VirtualPetContainer.tsx`'s catalog/currency lookups) — confirmed
// byte-identical (same table names, same column names, same decay/XP/coin
// constants, same soap/soap2-exclusion, same toy-quantity-clamp, same
// adoption-seeding branch) to the installed shared package's own internal
// runtime (verified directly against `dist/pet.js`), matching every other
// migrated app's own `xxxPetRepository.ts` in this migration series:
//   - inventory_pet     (pet stats/identity snapshot, one row per user)
//   - pet_inventory     (owned items, full delete-then-insert sync)
//   - aiboard_pricing_items      (flat shop catalog)
//   - aiboard_pricing_currencies (currency code -> rate lookup)
//
// This is intentionally the ONLY file in App Gallery that imports both
// `@mrburdeveloperteam/molar-experience/contracts` types and the Supabase
// client for pet data — the shared package itself must never see any of
// these table names.
import type { PetRepository } from '@mrburdeveloperteam/molar-experience/contracts';
import type { FoodItem, PetInventoryItem, PetSaveSnapshot } from '@mrburdeveloperteam/molar-experience/contracts';
import { supabase } from '../services/supabaseClient';

type PricingItemRow = {
  id: string;
  user_id: string | null;
  item_id: string;
  name: string;
  emoji?: string | null;
  category_id?: string | null;
  base_price_usd?: string | number | null;
  hunger?: number | null;
  happiness?: number | null;
  hygiene?: number | null;
  energy_gain?: number | null;
  image_src?: string | null;
  unlock_level?: number | null;
};

// UNKNOWN != ZERO: base_price_usd is nullable/free-text at the DB level, so
// an explicit numeric 0 (a genuinely free item) must be told apart from
// missing/malformed data. `Number()` (not `parseFloat`) is used because
// `parseFloat` accepts partial matches like "12abc" -> 12, and
// `Number('')` -> 0 is special-cased below since it would otherwise
// silently pass as a valid zero.
function parseCatalogPrice(raw: PricingItemRow['base_price_usd']): number {
  return raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
}

type PetInventoryRow = {
  item_id: string;
  quantity: number;
};

type InventoryPetRow = {
  pet_name: string | null;
  hunger: number | null;
  energy: number | null;
  happiness: number | null;
  hygiene: number | null;
  level: number | null;
  xp: number | null;
  coins: number | null;
  is_sleeping: boolean | null;
  active_ball_id: string | null;
  active_bed_id: string | null;
  updated_at: string | null;
};

export const appGalleryPetRepository: PetRepository = {
  async loadSnapshot(userId: string): Promise<PetSaveSnapshot | null> {
    const { data, error } = await supabase
      .from('inventory_pet')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // Verified against the installed 0.5.0 runtime (`pet.js`'s init
      // sequence): a rejected `loadSnapshot` is caught by the shared
      // runtime's own outer try/catch there and simply logged — it does
      // NOT fall into the "no petData" starter/adoption-reset branch
      // (that branch only triggers on a resolved `null`). Returning
      // `null` here instead would be indistinguishable from a genuine
      // no-row (never-adopted) result, which DOES trigger that reset —
      // collapsing a transient query error into false adoption.
      console.error('[appGalleryPetRepository] Failed to load inventory_pet:', error);
      throw error;
    }
    if (!data) return null;

    const row = data as InventoryPetRow;
    return {
      globalUserId: userId,
      stats: {
        hunger: row.hunger ?? 100,
        energy: row.energy ?? 100,
        happiness: row.happiness ?? 100,
        hygiene: row.hygiene ?? 100,
        level: row.level ?? 1,
        xp: row.xp ?? 0,
        coins: row.coins ?? 100,
      },
      identity: {
        // Empty string means "not adopted yet" — matches the runtime's
        // exact falsy check against the original `pet_name` column.
        petName: row.pet_name ?? '',
        selectedPetId: row.pet_name ?? '',
        isSleeping: !!row.is_sleeping,
        activeBallId: row.active_ball_id ?? null,
        activeBedId: row.active_bed_id ?? null,
      },
      updatedAt: row.updated_at ?? new Date(0).toISOString(),
    };
  },

  async saveSnapshot(snapshot: PetSaveSnapshot): Promise<void> {
    const { error } = await supabase.from('inventory_pet').upsert({
      user_id: snapshot.globalUserId,
      pet_name: snapshot.identity.petName || null,
      hunger: snapshot.stats.hunger,
      energy: snapshot.stats.energy,
      happiness: snapshot.stats.happiness,
      hygiene: snapshot.stats.hygiene,
      level: snapshot.stats.level,
      xp: snapshot.stats.xp,
      coins: snapshot.stats.coins,
      is_sleeping: snapshot.identity.isSleeping,
      active_ball_id: snapshot.identity.activeBallId,
      active_bed_id: snapshot.identity.activeBedId,
      updated_at: snapshot.updatedAt,
    });
    if (error) throw error;
  },

  async loadInventoryRows(userId: string): Promise<PetInventoryItem[]> {
    const { data, error } = await supabase
      .from('pet_inventory')
      .select('item_id, quantity')
      .eq('user_id', userId);

    if (error) {
      // Same rationale as loadSnapshot above: the 0.5.0 runtime's init
      // sequence catches a rejected `loadInventoryRows` and leaves
      // inventory state untouched, so throwing here does not force a
      // genuine-empty-inventory misread the way returning `[]` would.
      console.error('[appGalleryPetRepository] Failed to load pet_inventory:', error);
      throw error;
    }

    return (data as PetInventoryRow[]).map((row) => ({ itemId: row.item_id, quantity: row.quantity }));
  },

  async saveInventory(userId: string, items: PetInventoryItem[]): Promise<void> {
    // Single atomic upsert+prune RPC (Phase
    // SNABBB-VIRTUAL-PET-INVENTORY-ATOMICITY-AUDIT-AND-HARDENING) —
    // replaces the prior delete-then-insert two-request sequence, which
    // could leave this user's inventory empty if the process failed
    // between the delete and the insert. See public.save_pet_inventory's
    // own definition for the full rationale: it upserts every incoming
    // item (never destroying a row for an item this snapshot didn't
    // know about — e.g. one another app/tab just added) and only prunes
    // rows for items absent from this list, all inside one transaction.
    // `auth.uid()` is derived server-side from the caller's own
    // session — this repository has no way to write another user's
    // inventory even if `userId` here were wrong.
    const { error } = await supabase.rpc('save_pet_inventory', {
      p_items: items.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
    });
    if (error) throw error;
  },

  async mutateInventoryItem(userId: string, itemId: string, delta: number): Promise<number> {
    // Atomic, item-level increment/decrement (Phase
    // SNABBB-SHARED-VIRTUAL-PET-CROSS-APP-CONCURRENCY-HARDENING) — the
    // narrow persistence path SharedPetRuntime now uses for buyItem/
    // consumeItem instead of the full-list saveInventory above. See
    // public.mutate_pet_inventory_item's own definition: a single
    // `UPDATE ... SET quantity = quantity + delta` under Postgres's own
    // row lock, so concurrent calls for the SAME item from another
    // app/tab never lose an update, and calls for a DIFFERENT item
    // never contend at all (they touch a different row). `auth.uid()`
    // is derived server-side — this repository has no way to mutate
    // another user's inventory even if `userId` here were wrong.
    const { data, error } = await supabase.rpc('mutate_pet_inventory_item', {
      p_item_id: itemId,
      p_delta: delta,
    });
    if (error) throw error;
    return data as number;
  },

  async loadCatalog(): Promise<FoodItem[]> {
    // `loadCatalog()` takes no parameters per the Shared `PetRepository`
    // contract, so the authenticated user isn't handed to us — resolve a
    // fresh canonical Supabase auth lookup here rather than reusing any
    // captured component state, which could be stale across an account
    // switch/reconciliation.
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const currentUserId = authUser?.id ?? null;

    const columns = 'id, user_id, item_id, name, emoji, category_id, base_price_usd, hunger, happiness, hygiene, energy_gain, image_src, unlock_level';
    // Narrow at the query itself to the two eligible scopes (global default
    // + this user's own overrides) rather than fetching every user's rows
    // and filtering client-side — another user's pricing override must
    // never leave the DB for this request.
    const { data, error } = currentUserId
      ? await supabase
          .from('aiboard_pricing_items')
          .select(columns)
          .or(`user_id.is.null,user_id.eq.${currentUserId}`)
          .order('unlock_level', { ascending: true })
      : await supabase
          .from('aiboard_pricing_items')
          .select(columns)
          .is('user_id', null)
          .order('unlock_level', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.error('[appGalleryPetRepository] Failed to load aiboard_pricing_items:', error);
      return [];
    }

    // Resolve exactly one effective row per canonical item_id: a
    // user-specific override (user_id = current user) wins over the global
    // default (user_id IS NULL), which is fallback-only. This is
    // order-independent — it never assumes which scope the DB returns
    // first — and defends against unexpected same-scope duplicates by
    // keeping the first-seen row per scope and warning about the rest
    // instead of silently picking one.
    const globalRows = new Map<string, PricingItemRow>();
    const userRows = new Map<string, PricingItemRow>();
    for (const row of data as PricingItemRow[]) {
      const isGlobal = row.user_id === null;
      const bucket = isGlobal ? globalRows : userRows;
      const existing = bucket.get(row.item_id);
      if (existing) {
        console.warn('[appGalleryPetRepository] Duplicate catalog row within same scope for item_id — data-integrity anomaly, ignoring extra row:', {
          item_id: row.item_id,
          scope: isGlobal ? 'global' : 'user',
          row_ids: [existing.id, row.id],
        });
        continue;
      }
      bucket.set(row.item_id, row);
    }

    const itemIds = new Set<string>([...globalRows.keys(), ...userRows.keys()]);

    const items: FoodItem[] = [];
    for (const itemId of itemIds) {
      const userRow = userRows.get(itemId);
      const globalRow = globalRows.get(itemId);

      let effectiveRow = userRow ?? globalRow!;
      let parsed = parseCatalogPrice(effectiveRow.base_price_usd);

      // An invalid user-specific override does not get to hide a valid
      // global default — fall back to it instead of dropping the item.
      if (!Number.isFinite(parsed) && userRow && globalRow) {
        const globalParsed = parseCatalogPrice(globalRow.base_price_usd);
        if (Number.isFinite(globalParsed)) {
          effectiveRow = globalRow;
          parsed = globalParsed;
        }
      }

      if (!Number.isFinite(parsed)) {
        console.warn('[appGalleryPetRepository] Skipping catalog row with invalid base_price_usd:', {
          id: effectiveRow.id,
          item_id: effectiveRow.item_id,
          name: effectiveRow.name,
        });
        continue;
      }

      const row = effectiveRow;
      items.push({
        id: row.item_id,
        icon: row.emoji || '🍽️',
        label: row.name,
        hunger: row.hunger ?? 10,
        happiness: row.happiness ?? 0,
        hygiene: row.hygiene ?? 0,
        energyGain: row.energy_gain ?? 0,
        imageSrc: row.image_src || undefined,
        xp: Math.max(1, Math.round(Math.max(row.hunger ?? 0, row.happiness ?? 0, row.hygiene ?? 0, row.energy_gain ?? 0, 2) / 2)),
        price: parsed,
        category: row.category_id
          ? row.category_id.charAt(0).toUpperCase() + row.category_id.slice(1)
          : 'Other',
        levelReq: row.unlock_level ?? 1,
      });
    }
    return items;
  },

  async loadCurrencyRate(currencyCode: string): Promise<{ code: string; rate: number } | null> {
    const { data, error } = await supabase
      .from('aiboard_pricing_currencies')
      .select('currency_code, rate')
      .ilike('currency_code', currencyCode)
      .maybeSingle();

    if (error || !data) return null;
    return { code: data.currency_code, rate: Number(data.rate) || 1 };
  },
};
