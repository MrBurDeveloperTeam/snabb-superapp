// Meowdoku is already live in Production today via the legacy
// `VirtualPet/components/{GamePage,RoomMenus}.tsx` iframe+postMessage
// launcher. That launcher is built entirely on the pre-shared-package
// `useGameState()`/`GameStateContext` local stats model, which the
// shared `SharedVirtualPet` runtime does not expose to a host. This file
// is a standalone re-implementation of ONLY the Meowdoku-specific half of
// `GamePage.tsx` (the `gameId === 'meowdoku'` message-handling branch,
// its RPC calls, and its full-screen iframe shell), wired instead to
// `appGalleryPetRepository`'s confirmed-live atomic RPCs so the SAME game
// asset (`public/games/meowdoku/index.html`) keeps working with reward
// persistence that survives concurrent writes from elsewhere (e.g. the
// shared Shop/coin runtime), rather than the legacy local-state model.
//
// Uses ONLY the six `meowdoku_*` RPCs Production's own GamePage.tsx
// currently, actively calls (confirmed by direct inspection):
// meowdoku_get_mode_progress, meowdoku_complete_mode_with_achievements,
// meowdoku_record_cat_found, meowdoku_get_check_in,
// meowdoku_claim_check_in, meowdoku_get_achievements. The older SQL-
// defined variants (meowdoku_get_progress, meowdoku_complete_level,
// meowdoku_complete_level_with_achievements) are NOT used here — they
// are not called by any currently-live code path.
//
// Strict postMessage validation preserved: both event.origin ===
// window.location.origin AND event.source === iframe.contentWindow are
// required before any message is handled — never loosened.
//
// meowdoku_claim_check_in already derives auth.uid(), inserts the daily
// check-in row, atomically increments inventory_pet.coins, and returns
// the resulting current coin balance server-side — so the check-in path
// below NEVER calls mutateCoins again afterward (that would double-credit
// the reward). The returned `coins` value is used directly as the new
// authoritative wallet state.
//
// Rendered as a SIBLING overlay above `SharedVirtualPet` (which itself
// uses z-[1000] — see `AppGalleryVirtualPet.tsx`'s `extraGames` wiring in
// App.tsx), at z-[1100], the same proven value used for this exact
// sibling-overlay-hidden-under-SharedVirtualPet bug class in Appointment/
// Todo/Calculator. Closing this launcher does not unmount
// `SharedVirtualPet` — the pet room underneath is still open, matching
// Production's existing "Meowdoku closes -> back to the Games room"
// behavior.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { appGalleryPetRepository } from './appGalleryPetRepository';

const MEOWDOKU_URL = '/games/meowdoku/index.html?v=20260817-meowdoku-1';

interface MeowdokuLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function MeowdokuLauncher({ isOpen, onClose, userId }: MeowdokuLauncherProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [coins, setCoins] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasInitializedRef = useRef(false);

  const postToGame = (message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  };

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      setIsLoading(true);
      return;
    }

    let cancelled = false;
    appGalleryPetRepository.loadSnapshot(userId).then((snap) => {
      if (!cancelled) setCoins(snap?.stats.coins ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  const loadMeowdokuAchievements = async () => {
    const { data, error } = await supabase.rpc('meowdoku_get_achievements');
    postToGame(
      error
        ? { type: 'MEOWDOKU_ACHIEVEMENTS_ERROR', message: error.message }
        : { type: 'MEOWDOKU_ACHIEVEMENTS', achievements: data }
    );
  };

  const loadMeowdokuCheckIn = async () => {
    const { data, error } = await supabase.rpc('meowdoku_get_check_in');
    postToGame(
      error
        ? { type: 'MEOWDOKU_CHECK_IN_ERROR', message: error.message }
        : { type: 'MEOWDOKU_CHECK_IN', checkIn: data }
    );
  };

  const sendUnlockedAchievements = (value: unknown) => {
    const achievements = Array.isArray(value) ? value : [];
    if (achievements.length > 0) {
      postToGame({ type: 'MEOWDOKU_ACHIEVEMENTS_UNLOCKED', achievements });
    }
  };

  const loadMeowdokuProgress = async () => {
    const { data, error } = await supabase.rpc('meowdoku_get_mode_progress');
    if (error) {
      console.error('[MeowdokuLauncher] Unable to load progress:', error);
      postToGame({ type: 'MEOWDOKU_PROGRESS_LOCAL_ONLY' });
      return;
    }
    const progress = Array.isArray(data) ? data[0] : data;
    postToGame({
      type: 'MEOWDOKU_PROGRESS',
      progress: {
        unlocked_level: Math.max(1, Math.min(60, Number(progress?.unlocked_level) || 1)),
        completed_modes:
          progress?.completed_modes && typeof progress.completed_modes === 'object'
            ? (progress.completed_modes as Record<string, unknown>)
            : {},
      },
    });
  };

  const initializeMeowdoku = async () => {
    await Promise.all([loadMeowdokuProgress(), loadMeowdokuCheckIn(), loadMeowdokuAchievements()]);
  };

  const saveMeowdokuProgress = async (payload: {
    completed_level?: unknown;
    mode?: unknown;
    score?: unknown;
    mistakes?: unknown;
    time_seconds?: unknown;
    hints_used?: unknown;
    lives_remaining?: unknown;
  }) => {
    const completedLevel = Math.max(1, Math.min(60, Math.floor(Number(payload.completed_level) || 0)));
    if (!completedLevel) return;
    const mode = String(payload.mode || '').toLowerCase();
    if (!['easy', 'medium', 'hard', 'hell'].includes(mode)) return;

    const { data, error } = await supabase.rpc('meowdoku_complete_mode_with_achievements', {
      p_level_number: completedLevel,
      p_mode: mode,
      p_score: Math.max(0, Math.floor(Number(payload.score) || 0)),
      p_mistakes: Math.max(0, Math.floor(Number(payload.mistakes) || 0)),
      p_time_seconds: Math.max(0, Math.floor(Number(payload.time_seconds) || 0)),
      p_hints_used: Math.max(0, Math.floor(Number(payload.hints_used) || 0)),
      p_lives_remaining: Math.max(1, Math.min(3, Math.floor(Number(payload.lives_remaining) || 3))),
    });
    if (error) {
      console.error('[MeowdokuLauncher] Unable to save progress:', error);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    sendUnlockedAchievements(result?.new_achievements);
    await Promise.all([loadMeowdokuProgress(), loadMeowdokuAchievements()]);
  };

  const recordMeowdokuCatFound = async (payload: { level?: unknown; cat_index?: unknown }) => {
    const { data, error } = await supabase.rpc('meowdoku_record_cat_found', {
      p_level_number: Math.max(1, Math.min(60, Math.floor(Number(payload.level) || 1))),
      p_cat_index: Math.max(0, Math.floor(Number(payload.cat_index) || 0)),
    });
    if (error) {
      console.error('[MeowdokuLauncher] Unable to save cat discovery:', error);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    sendUnlockedAchievements(result?.new_achievements);
    await loadMeowdokuAchievements();
  };

  const claimMeowdokuCheckIn = async () => {
    const { data, error } = await supabase.rpc('meowdoku_claim_check_in');
    if (error) {
      postToGame({ type: 'MEOWDOKU_CHECK_IN_ERROR', message: error.message });
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    // Server-authoritative — meowdoku_claim_check_in already atomically
    // incremented inventory_pet.coins; use its returned value directly,
    // never call mutateCoins again here (that would double-credit).
    if (result?.coins != null) setCoins(Number(result.coins) || 0);
    postToGame({ type: 'MEOWDOKU_CHECK_IN_CLAIMED', checkIn: result });
    sendUnlockedAchievements(result?.new_achievements);
    await loadMeowdokuAchievements();
  };

  // Reward path replaced with `appGalleryPetRepository`'s atomic RPCs —
  // the legacy launcher's local stat mutation here is exactly the
  // pre-0.9.0 non-atomic pattern the shared migration must not carry
  // forward. Same numbers preserved: coin reward capped at 1000, +15
  // happiness (via a load-then-save of the full snapshot, since there is
  // no standalone atomic happiness RPC — `save_pet_snapshot`'s own coins
  // argument is a documented no-op on an existing row, so re-sending the
  // just-mutated coins value here is safe and never double-writes).
  const applyMeowdokuReward = async (rawCoins: unknown) => {
    const reward = Math.max(0, Math.min(1000, Math.floor(Number(rawCoins) || 0)));
    if (reward <= 0) return;
    try {
      const nextCoins = await appGalleryPetRepository.mutateCoins(userId, reward);
      setCoins(nextCoins);
      const snap = await appGalleryPetRepository.loadSnapshot(userId);
      if (snap) {
        await appGalleryPetRepository.saveSnapshot({
          ...snap,
          stats: { ...snap.stats, coins: nextCoins, happiness: Math.min(100, snap.stats.happiness + 15) },
        });
      }
    } catch (err) {
      console.error('[MeowdokuLauncher] Unable to persist reward:', err);
    }
  };

  const applyMeowdokuSpend = async (amount: number, requestId: string) => {
    if (amount <= 0 || coins < amount) {
      postToGame({ type: 'MEOWDOKU_SPEND_RESULT', requestId, ok: false });
      return;
    }
    try {
      // DB result is authoritative — mutate_pet_coins with a negative
      // delta, never a client-computed absolute value.
      const nextCoins = await appGalleryPetRepository.mutateCoins(userId, -amount);
      setCoins(nextCoins);
      postToGame({ type: 'MEOWDOKU_SPEND_RESULT', requestId, ok: true });
    } catch (err) {
      console.error('[MeowdokuLauncher] Unable to spend coins:', err);
      postToGame({ type: 'MEOWDOKU_SPEND_RESULT', requestId, ok: false });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      // Strict same-origin + exact-iframe-source validation — never
      // loosened.
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;

      switch (event.data?.type) {
        case 'MEOWDOKU_READY':
          postToGame({ type: 'MEOWDOKU_WALLET', coins });
          if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            void initializeMeowdoku();
          }
          break;
        case 'MEOWDOKU_SAVE_PROGRESS':
          void saveMeowdokuProgress(event.data.progress || {});
          break;
        case 'MEOWDOKU_CAT_FOUND':
          void recordMeowdokuCatFound(event.data || {});
          break;
        case 'MEOWDOKU_GET_CHECK_IN':
          void loadMeowdokuCheckIn();
          break;
        case 'MEOWDOKU_CLAIM_CHECK_IN':
          void claimMeowdokuCheckIn();
          break;
        case 'MEOWDOKU_GET_ACHIEVEMENTS':
          void loadMeowdokuAchievements();
          break;
        case 'MEOWDOKU_SPEND_COINS':
          void applyMeowdokuSpend(
            Math.max(0, Math.floor(Number(event.data.amount) || 0)),
            String(event.data.requestId || '')
          );
          break;
        case 'MEOWDOKU_REWARD':
          void applyMeowdokuReward(event.data.coins);
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, coins, userId]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black">
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-white/60 text-sm">Loading Meowdoku...</span>
            </div>
          </div>
        )}

        <div className="absolute right-[calc(env(safe-area-inset-right)_+_1.5rem)] top-[calc(env(safe-area-inset-top)_+_1.5rem)] z-50 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-lg text-white ring-1 ring-white/5">
            <span className="text-xl">💰</span>
            <span className="font-black text-lg tracking-widest min-w-[3ch] text-right">{coins}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white border-2 border-white/10 backdrop-blur-sm transition-all hover:scale-110 active:scale-95 shadow-lg"
            title="Exit Meowdoku"
            aria-label="Exit Meowdoku"
          >
            <span className="text-2xl font-bold leading-none mb-1">×</span>
          </button>
        </div>

        <iframe
          ref={iframeRef}
          src={MEOWDOKU_URL}
          className="w-full h-full border-0 block"
          title="Meowdoku"
          onLoad={() => setIsLoading(false)}
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}
