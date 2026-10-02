import type { PetRepository, PetSaveSnapshot, PetInventoryItem } from '@mrburdeveloperteam/pet-function/contracts';

export const DESIGN_OWNER = 'local-superapp-game-designer';
const KEY = 'snabbb:local-pet-design:v1';
type Save = { snapshot: PetSaveSnapshot; inventory: PetInventoryItem[]; games: Record<string, any> };
function read(): Save {
  const stored = localStorage.getItem(KEY);
  if (stored) return JSON.parse(stored);
  return {
    snapshot: { globalUserId: DESIGN_OWNER, stats: { hunger: 75, energy: 100, happiness: 100, hygiene: 75, level: 50, xp: 0, coins: 100000 }, identity: { petName: 'mallow', selectedPetId: 'mallow', isSleeping: false, activeBallId: null, activeBedId: null }, updatedAt: new Date().toISOString() },
    inventory: ['toast', 'egg', 'soap', 'soap2'].map(itemId => ({ itemId, quantity: 20 })), games: {},
  };
}
function write(save: Save) { localStorage.setItem(KEY, JSON.stringify(save)); }
export const localPetRepository: PetRepository = {
  async loadSnapshot() { return read().snapshot; },
  async saveSnapshot(snapshot) {
    const save = read();
    save.snapshot = { ...snapshot, stats: { ...snapshot.stats, coins: save.snapshot.stats.coins, xp: save.snapshot.stats.xp, level: save.snapshot.stats.level } };
    write(save);
  },
  async loadInventoryRows() { return read().inventory; },
  async saveInventory(_, inventory) { const save = read(); save.inventory = inventory; write(save); },
  async mutateInventoryItem(_, itemId, delta) {
    const save = read(); const item = save.inventory.find(item => item.itemId === itemId) ?? { itemId, quantity: 0 };
    if (!save.inventory.includes(item)) save.inventory.push(item);
    item.quantity = Math.max(0, item.quantity + delta); write(save); return item.quantity;
  },
  async mutateCoins(_, delta) {
    const save = read(); const coins = save.snapshot.stats.coins + delta;
    if (coins < 0) throw new Error('Insufficient coins');
    save.snapshot.stats.coins = coins; write(save); return coins;
  },
  async purchasePetItem(_, itemId, price) {
    const save = read(); if (save.snapshot.stats.coins < price) throw new Error('Insufficient coins');
    const item = save.inventory.find(item => item.itemId === itemId) ?? { itemId, quantity: 0 };
    if (!save.inventory.includes(item)) save.inventory.push(item);
    item.quantity++; save.snapshot.stats.coins -= price; write(save);
    return { coins: save.snapshot.stats.coins, quantity: item.quantity };
  },
  async addXP(_, delta) {
    const save = read(); const stats = save.snapshot.stats; stats.xp += delta;
    const levelsGained = stats.xp >= 100 ? 1 : 0;
    if (levelsGained) { stats.xp -= 100; stats.level++; stats.coins += 50; }
    write(save); return { xp: stats.xp, level: stats.level, coins: stats.coins, levelsGained };
  },
  async loadCatalog() { return []; },
  async loadCurrencyRate() { return { code: 'USD', rate: 1 }; },
};
// The real game launchers use this local adapter instead of authenticated RPCs.
export const localGameClient = {
  async rpc(name: string, args: Record<string, any> = {}) {
    const save = read(); let data: any = null;
    if (name === 'cat_dash_submit_run') {
      const teeth = Number(args.p_teeth); const seconds = Number(args.p_elapsed_seconds);
      if (typeof args.p_run_id !== 'string' || !args.p_run_id.length || args.p_run_id.length > 100 || !Number.isSafeInteger(teeth) || teeth < 0 || !Number.isFinite(seconds) || seconds < 0 || seconds > 86400 || teeth > seconds * 30 + 60) return { data: null, error: { message: 'Invalid run' } };
      const previous = save.games.catDash ?? { best: 0, runs: [] };
      if (!previous.runs.includes(args.p_run_id)) {
        previous.best = Math.max(previous.best, teeth);
        previous.runs = [...previous.runs, args.p_run_id].slice(-100);
      }
      save.games.catDash = previous; data = { best: previous.best };
    } else if (name === 'cat_dash_leaderboard') {
      data = { scope: 'local', entries: save.games.catDash ? [{ rank: 1, name: 'You', teeth: save.games.catDash.best, isYou: true }] : [] };
    } else if (name === 'pet_game_progress_sync') {
      const key = String(args.p_game_id); const previous = save.games[key] ?? {};
      data = { ...previous, ...args.p_progress }; save.games[key] = data;
    } else if (name === 'meowdoku_get_mode_progress') {
      data = save.games.meowdoku ?? { unlocked_level: 60, completed_modes: {} };
    } else if (name === 'meowdoku_complete_mode_with_achievements') {
      const progress = save.games.meowdoku ?? { unlocked_level: 60, completed_modes: {} };
      const level = `${args.p_level_number}:${args.p_mode}`;
      progress.completed_modes[level] = { score: args.p_score, mistakes: args.p_mistakes, time_seconds: args.p_time_seconds, hints_used: args.p_hints_used, lives_remaining: args.p_lives_remaining };
      save.games.meowdoku = progress; data = { new_achievements: [] };
    } else if (name === 'meowdoku_get_achievements') data = [];
    else if (name === 'meowdoku_record_cat_found') {
      save.games.catDiscoveries = { ...save.games.catDiscoveries, [`${args.p_level_number}:${args.p_cat_index}`]: true }; data = { new_achievements: [] };
    } else if (name === 'meowdoku_get_check_in' || name === 'meowdoku_claim_check_in') {
      const today = new Date().toISOString().slice(0, 10);
      const claimed = save.games.checkInDate === today;
      if (name === 'meowdoku_claim_check_in' && !claimed) { save.snapshot.stats.coins += 100; save.games.checkInDate = today; }
      const todayIndex = (new Date().getDay() + 6) % 7;
      data = { today_index: todayIndex, claimed_days: save.games.checkInDate === today ? [todayIndex] : [], claimed_today: save.games.checkInDate === today, reward_today: 100, coins: save.snapshot.stats.coins, new_achievements: [] };
    } else return { data: null, error: { message: `Unsupported local game operation: ${name}` } };
    write(save); return { data, error: null };
  },
};
