import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getPetOption, normalizePetId } from '../VirtualPet/petOptions';
import { isPersonalizedPetDialogueEnabled } from '../features/petDialogue/dialogueFlag';
import { usePersonalizedPetDialogue } from '../features/petDialogue/usePersonalizedPetDialogue';
import { DIALOGUE_ID, type DialogueCandidate, type ProfileCompletionStatus } from '../features/petDialogue/types';

const MALLOW_FRAME_WIDTH = 192;
const MALLOW_FRAME_HEIGHT = 208;
const MALLOW_SCALE = 0.42;
const PET_SLEEPING_KEY = 'pet_is_sleeping';
const PET_SLEEPING_UPDATED_AT_KEY = 'pet_is_sleeping_updated_at';
const DEFAULT_WELCOME_BACK_AUTO_CLOSE_MS = 6000;
const MALLOW_ROWS = {
  idle: { row: 0, frames: 6, duration: '1.1s' },
  runRight: { row: 1, frames: 8, duration: '0.7s' },
  runLeft: { row: 2, frames: 8, duration: '0.7s' },
  wave: { row: 3, frames: 4, duration: '0.8s' },
  review: { row: 3, frames: 4, duration: '0.8s' },
  sleep: { row: 5, frames: 1, duration: '1s', frame: 4 },
};

interface CatMascotProps {
  onCatClick?: () => void;
  disabled?: boolean;
  isHidden?: boolean;
  /** Odoo-derived profile-completeness signal, resolved by the caller (see App.tsx). Only read when the personalized-dialogue feature flag is enabled. */
  profileCompletionStatus?: ProfileCompletionStatus;
  /**
   * The Supabase Auth user id App.tsx has confirmed (via
   * reconcileSupabaseIdentity) belongs to the same account as the currently
   * Odoo-verified user. Three states: `undefined` = reconciliation still in
   * progress / not yet attempted (stay neutral, don't guess); `null` =
   * confirmed guest, or a failed/mismatched reconciliation; a string = the
   * confirmed-matched Supabase user id. This is the sole authority
   * usePersonalizedPetDialogue uses for "which identity, if any,
   * personalized providers may run against" — CatMascot never independently
   * re-derives or double-guesses identity matching.
   */
  personalizedMatchedUserId?: string | null;
  // (component-level default below narrows the "not passed at all" case to
  // `undefined`, i.e. treated the same as "still reconciling" — never
  // defaults to the stronger claim "confirmed guest".)
  /** Internal (pushState-based) navigation, used by the profile-reminder action button. Only used when the feature flag is enabled. */
  onNavigateInternal?: (path: string) => void;
}

interface MallowMascotSpriteProps {
  spriteSheetUrl: string;
  sleepHoldFrame?: number;
  idleFrames?: number;
  idleDuration?: string;
  hoverRow?: number;
  hoverFrames?: number;
  hoverDuration?: string;
  clickRow?: number;
  clickFrames?: number;
  clickDuration?: string;
  isWalking: boolean;
  facingLeft: boolean;
  isMeowing: boolean;
  isHovered: boolean;
  isSleeping: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function MallowMascotSprite({
  spriteSheetUrl,
  sleepHoldFrame,
  idleFrames,
  idleDuration,
  hoverRow,
  hoverFrames,
  hoverDuration,
  clickRow,
  clickFrames,
  clickDuration,
  isWalking,
  facingLeft,
  isMeowing,
  isHovered,
  isSleeping,
  onHoverStart,
  onHoverEnd,
}: MallowMascotSpriteProps) {
  const shouldSleep = isSleeping && !isWalking && !isMeowing;
  const shouldReview = isHovered && !isWalking && !shouldSleep;
  const stateClass = shouldSleep ? 'sleep' : shouldReview ? 'review' : isWalking ? (facingLeft ? 'run-left' : 'run-right') : 'idle';
  const reviewConfig = {
    row: hoverRow ?? MALLOW_ROWS.review.row,
    frames: hoverFrames ?? MALLOW_ROWS.review.frames,
    duration: hoverDuration ?? MALLOW_ROWS.review.duration,
  };
  const clickConfig = {
    row: clickRow ?? MALLOW_ROWS.wave.row,
    frames: clickFrames ?? MALLOW_ROWS.wave.frames,
    duration: clickDuration ?? MALLOW_ROWS.wave.duration,
  };
  const idleConfig = {
    ...MALLOW_ROWS.idle,
    frames: idleFrames ?? MALLOW_ROWS.idle.frames,
    duration: idleDuration ?? MALLOW_ROWS.idle.duration,
  };
  const config = shouldSleep
    ? { ...MALLOW_ROWS.sleep, frame: sleepHoldFrame ?? MALLOW_ROWS.sleep.frame }
    : shouldReview
      ? reviewConfig
      : isMeowing && !isWalking
        ? clickConfig
        : facingLeft && isWalking
          ? MALLOW_ROWS.runLeft
          : isWalking
            ? MALLOW_ROWS.runRight
            : idleConfig;

  return (
    <div
      className={`mallow-mascot ${stateClass} frames-${config.frames} ${isMeowing ? 'is-talking' : ''}`}
      aria-label={`Selected pet ${stateClass}`}
      onPointerEnter={onHoverStart}
      onMouseEnter={onHoverStart}
      onMouseOver={onHoverStart}
      onPointerLeave={onHoverEnd}
      onMouseLeave={onHoverEnd}
      style={{
        '--sprite-row': config.row,
        '--sprite-frames': config.frames,
        '--sprite-duration': config.duration,
        '--sprite-frame': 'frame' in config ? config.frame : 0,
        '--pet-spritesheet': `url("${spriteSheetUrl}")`,
      } as React.CSSProperties}
    />
  );
}

export default function CatMascot({
  onCatClick,
  disabled = false,
  isHidden = false,
  profileCompletionStatus = 'unknown',
  personalizedMatchedUserId,
  onNavigateInternal,
}: CatMascotProps) {
  const [catPos, setCatPos] = useState({ x: -10, y: 85 });
  const [isWalking, setIsWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [isMeowing, setIsMeowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPetSleeping, setIsPetSleeping] = useState(() => {
    try { return localStorage.getItem(PET_SLEEPING_KEY) === 'true'; } catch { return false; }
  });
  const [selectedPetId, setSelectedPetId] = useState(() => normalizePetId(localStorage.getItem('pet_name')));
  const selectedPet = getPetOption(selectedPetId);
  const [walkDuration, setWalkDuration] = useState(0.8);

  const [dialogStep, setDialogStep] = useState(0);
  const [isDialogActive, setIsDialogActive] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const autoCloseTimerRef = useRef<any>(null);
  const isEntryWalkComplete = useRef(false);
  // Which dialog type is currently prepared to show ('intro' | 'welcomeBack' |
  // 'personalized' | null), and which dialog types have already been dismissed
  // during this page lifecycle. Tracking dismissal per-type (rather than one
  // shared flag) means dismissing the Post-Login Intro no longer permanently
  // blocks the Welcome Back dialog, or vice versa. 'personalized' is the
  // Phase 1A resolver's own single slot (P0 / profile reminder / fallback);
  // when the resolver instead picks the legacy intro, it reuses 'intro' as-is.
  const currentDialogType = useRef<'intro' | 'welcomeBack' | 'personalized' | null>(null);
  const dismissedDialogs = useRef<Set<'intro' | 'welcomeBack' | 'personalized'>>(new Set());
  // Holds the winning Phase 1A candidate while it's active, so tryActivateDialog
  // can decide whether to bypass the entry-walk gate / arm an auto-close timer,
  // and so the bubble can render its optional action button. Mirrored into
  // React state (personalizedActiveCandidate below) for render-time reads,
  // following the same ref+state split already used for isDialogActive.
  const personalizedCandidateRef = useRef<DialogueCandidate | null>(null);
  const [personalizedActiveCandidate, setPersonalizedActiveCandidate] = useState<DialogueCandidate | null>(null);
  // Holds the auto-close duration for a prepared 'welcomeBack' dialog, set when
  // its content is fetched but only ever consumed by tryActivateDialog() at the
  // moment it actually shows — see the comment on tryActivateDialog for why.
  const welcomeBackAutoCloseMsRef = useRef(DEFAULT_WELCOME_BACK_AUTO_CLOSE_MS);
  // Mirrors isDialogActive synchronously (React state updates aren't immediate).
  // Without this, tryActivateDialog() can be called again while a dialog is
  // already showing (e.g. StrictMode's dev double-invoke of the fetch effect,
  // or the click-to-move handler firing again) and would re-arm the Welcome
  // Back timer from scratch every time, so it could keep getting reset before
  // ever completing a full countdown.
  const isDialogActiveRef = useRef(false);

  const clearWelcomeBackAutoCloseTimer = () => {
    if (autoCloseTimerRef.current !== null) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  // durationOverrideMs lets the Phase 1A fixed welcome fallback reuse this
  // same timer instead of duplicating it; the legacy 'welcomeBack' call site
  // below passes no override and keeps its existing DB-configured duration.
  const startWelcomeBackAutoCloseTimer = (durationOverrideMs?: number) => {
    clearWelcomeBackAutoCloseTimer();

    const configuredDuration = Number(durationOverrideMs ?? welcomeBackAutoCloseMsRef.current);
    const duration = Number.isFinite(configuredDuration) && configuredDuration > 0
      ? configuredDuration
      : DEFAULT_WELCOME_BACK_AUTO_CLOSE_MS;

    autoCloseTimerRef.current = setTimeout(() => {
      autoCloseTimerRef.current = null;
      closeDialog();
    }, duration);
  };

  // Marks the Post-Login Intro stage complete for a given user — either because
  // they actually dismissed a visible Intro, or because a successful query
  // confirmed there's no Intro configured/usable to show. Takes an explicit
  // userId (rather than reading currentUserId state) so it's safe to call from
  // inside initDialog() itself, where the just-fetched userId may not yet be
  // reflected in currentUserId (state updates aren't synchronous).
  const markIntroCompleted = (uid: string | null) => {
    if (!uid) return;
    localStorage.setItem(`intro_shown_${uid}`, 'true');
  };

  const closeDialog = () => {
    const dialogType = currentDialogType.current;
    if (dialogType) {
      dismissedDialogs.current.add(dialogType);
    }
    isDialogActiveRef.current = false;
    setIsDialogActive(false);
    clearWelcomeBackAutoCloseTimer();
    if (dialogType === 'intro' && !disabled && currentUserId) {
      markIntroCompleted(currentUserId);
    }
  };

  // Single source of truth for showing a prepared dialog: only activates once the
  // entry walk has finished AND a dialog type has been prepared AND that specific
  // type hasn't already been dismissed this page lifecycle. Idempotent via
  // isDialogActiveRef — once active, further calls (StrictMode's dev double-invoke
  // of the fetch effect, click-to-move, etc.) are no-ops instead of re-arming the
  // Welcome Back timer from scratch every time.
  //
  // P0 personalized candidates (bypassEntryWalk) are the one exception to the
  // entry-walk gate: the wrapper's left/top position is already set to its
  // final value synchronously on mount (only the CSS transition animates
  // visually), so showing the bubble immediately never structurally
  // mis-positions it — it just rides along the walk-in motion instead of
  // waiting up to ~2.8s behind a cosmetic animation for a critical alert.
  const tryActivateDialog = () => {
    const dialogType = currentDialogType.current;
    if (!dialogType || dismissedDialogs.current.has(dialogType) || isDialogActiveRef.current) {
      return;
    }

    const canBypassEntryWalk = dialogType === 'personalized' && !!personalizedCandidateRef.current?.bypassEntryWalk;
    if (!isEntryWalkComplete.current && !canBypassEntryWalk) {
      return;
    }

    // Phase 1A candidates must never activate — and therefore must never be
    // marked "handled" in session dedupe (see markPersonalizedShown below) —
    // while the mascot wrapper is intentionally hidden (auth routes, or the
    // Virtual Pet modal — see App.tsx's `isHidden` prop). The legacy Intro /
    // Welcome Back path never gated on this, so this check is scoped to
    // 'personalized' only to leave that behaviour unchanged when the feature
    // flag is disabled. See the effect below that retries once unhidden.
    if (dialogType === 'personalized' && isHiddenRef.current) {
      return;
    }

    isDialogActiveRef.current = true;
    setIsDialogActive(true);

    if (dialogType === 'welcomeBack') {
      startWelcomeBackAutoCloseTimer();
    } else if (dialogType === 'personalized') {
      const candidate = personalizedCandidateRef.current;
      if (candidate) {
        markPersonalizedShown(candidate);
        if (candidate.autoCloseMs) startWelcomeBackAutoCloseTimer(candidate.autoCloseMs);
      }
    }
  };

  const [dialogSteps, setDialogSteps] = useState<string[]>([]);

  // ─── Phase 1A personalized dialogue resolver (feature-flagged) ─────────────
  // Computed once per render; the env var is effectively constant for the
  // lifetime of a build, so this behaves like a compile-time switch between
  // the legacy code path below and the new resolver-driven one.
  const personalizedDialogueEnabled = isPersonalizedPetDialogueEnabled();
  const {
    lifecycle: personalizedLifecycle,
    selection: personalizedSelection,
    userId: personalizedUserId,
    markShown: markPersonalizedShown,
    runAction: runPersonalizedAction,
  } = usePersonalizedPetDialogue({
    active: personalizedDialogueEnabled && !disabled,
    matchedUserId: personalizedMatchedUserId,
    profileStatus: profileCompletionStatus,
    introAlreadyCompleted: (uid: string) => {
      try {
        return localStorage.getItem(`intro_shown_${uid}`) === 'true';
      } catch {
        return false;
      }
    },
    onNavigateInternal,
  });

  // usePersonalizedPetDialogue reactively tracks the authenticated identity
  // and restarts its own evaluation the instant it changes — including a
  // cross-tab account switch that doesn't otherwise flip `disabled` (which
  // only reflects logged-in/guest, not *which* user). But the adoption
  // effect below deliberately "locks" after its first adoption
  // (currentDialogType.current already set) so a later same-user resolver
  // re-run can never replace an already-shown dialogue. Without this reset,
  // that same lock would also — wrongly — keep a previous user's
  // already-adopted/pending dialogue on screen (or pending while hidden)
  // even after the hook has moved on to a fresh, current-user-only
  // evaluation for someone else. This effect exists solely to detect that
  // one case and clear it first.
  const lastPersonalizedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!personalizedDialogueEnabled || disabled) return;
    if (!personalizedUserId) return;

    const previousUserId = lastPersonalizedUserIdRef.current;
    lastPersonalizedUserIdRef.current = personalizedUserId;

    if (!previousUserId || previousUserId === personalizedUserId) return;

    // Identity changed under this mount. Only ever tears down state this
    // same resolver adopted ('personalized' or resolver-driven 'intro') —
    // never the unrelated legacy 'welcomeBack' path.
    if (currentDialogType.current === 'personalized' || currentDialogType.current === 'intro') {
      currentDialogType.current = null;
      personalizedCandidateRef.current = null;
      setPersonalizedActiveCandidate(null);
      isDialogActiveRef.current = false;
      setIsDialogActive(false);
      clearWelcomeBackAutoCloseTimer();
      setDialogSteps([]);
      setDialogStep(0);
      // Deliberately not added to dismissedDialogs: the outgoing user's
      // dismissal state must never suppress the new user's fresh
      // evaluation once it resolves.
    }
  }, [personalizedUserId, personalizedDialogueEnabled, disabled]);

  // Adopts the resolver's selection into the same dialogSteps/currentDialogType
  // machinery the legacy Intro/Welcome Back paths already use, so rendering,
  // dismissal, and the entry-walk gate stay a single code path. Locks after
  // the first adoption (currentDialogType.current already set) so a later
  // resolver re-run — e.g. profileStatus settling from 'loading' — can never
  // replace an already-shown dialogue for this mount.
  useEffect(() => {
    if (!personalizedDialogueEnabled || disabled) return;
    if (personalizedLifecycle !== 'ready' && personalizedLifecycle !== 'failed') return;
    if (!personalizedSelection) return;
    if (currentDialogType.current) return;

    if (personalizedUserId) setCurrentUserId(personalizedUserId);

    const { candidate, introSteps } = personalizedSelection;
    personalizedCandidateRef.current = candidate;
    setPersonalizedActiveCandidate(candidate);

    if (candidate.dialogueId === DIALOGUE_ID.LEGACY_POST_LOGIN_INTRO && introSteps.length > 0) {
      // Reuse the existing multi-step Intro rendering/dismissal exactly as-is.
      setDialogSteps(introSteps);
      setDialogStep(0);
      currentDialogType.current = 'intro';
    } else {
      setDialogSteps([candidate.message]);
      setDialogStep(0);
      currentDialogType.current = 'personalized';
    }

    tryActivateDialog();
  }, [personalizedDialogueEnabled, disabled, personalizedLifecycle, personalizedSelection, personalizedUserId]);

  // A personalized candidate may have been ready while the mascot wrapper was
  // hidden (isHiddenRef gate in tryActivateDialog above) — retry activation
  // once it's visible again. Scoped to the flag being enabled so this is a
  // guaranteed no-op, and therefore behaviour-preserving, when it's disabled.
  //
  // This effect is declared before the isHiddenRef sync effect below, so on
  // the same render where `isHidden` flips to false, this one would
  // otherwise run first and call tryActivateDialog() while isHiddenRef.current
  // is still stale (true) — silently defeating the retry. Updating the ref
  // synchronously here, right before the call, removes the dependency on
  // effect declaration order.
  useEffect(() => {
    if (!personalizedDialogueEnabled || isHidden) return;
    isHiddenRef.current = isHidden;
    tryActivateDialog();
  }, [personalizedDialogueEnabled, isHidden]);

  const [meowMsg, setMeowMsg] = useState(null);
  const [petStates, setPetStates] = useState(['Normal']);

  // ─── Refs used inside loops to avoid stale closures / dep-array restarts ───
  const meowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meowInnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // FIX: track inner timer too
  const isHiddenRef = useRef(isHidden);
  // Named distinctly from the manually-managed `isDialogActiveRef` lock above
  // (pre-existing duplicate-declaration bug fixed while wiring Phase 1A —
  // see implementation report): this one just mirrors `isDialogActive`
  // state for the meow loop below so it doesn't need to restart on change.
  const isDialogActiveMeowRef = useRef(isDialogActive); // FIX: ref so loop doesn't restart on dialog change
  const petStatesRef = useRef(['Normal']);           // FIX: ref so loop doesn't restart on state change

  useEffect(() => { isHiddenRef.current = isHidden; }, [isHidden]);
  useEffect(() => { isDialogActiveMeowRef.current = isDialogActive; }, [isDialogActive]);

  // Clear message bubble immediately when pet state changes
  useEffect(() => {
    setMeowMsg(null);
    petStatesRef.current = petStates; // keep ref in sync
  }, [petStates]);

  // ─── Pet stats polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (disabled) return;

    const computeStates = (stats, prevStates) => {
      const HUNGRY_ENTER = 30, HUNGRY_EXIT = 35;
      const DIRTY_ENTER = 30,  DIRTY_EXIT = 35;
      const ENERGY_ENTER = 30, ENERGY_EXIT = 35;
      const HAPPY_ENTER = 40,  HAPPY_EXIT = 45;

      const active = [];
      if (stats.hunger   < HUNGRY_ENTER || (prevStates.includes('Hungry')     && stats.hunger   < HUNGRY_EXIT)) active.push('Hungry');
      if (stats.hygiene  < DIRTY_ENTER  || (prevStates.includes('Dirty')      && stats.hygiene  < DIRTY_EXIT))  active.push('Dirty');
      if (stats.energy   < ENERGY_ENTER || (prevStates.includes('Low Energy') && stats.energy   < ENERGY_EXIT)) active.push('Low Energy');
      if (stats.happiness< HAPPY_ENTER  || (prevStates.includes('Unhappy')    && stats.happiness< HAPPY_EXIT))  active.push('Unhappy');

      if (active.length === 0) active.push('Normal');
      return active;
    };

    const updateStateFromStats = (stats, updatedAt) => {
      if (!stats) return;

      let finalStats = { ...stats };

      if (updatedAt) {
        const elapsedSecs = Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / 1000);
        if (elapsedSecs > 0) {
          finalStats.hunger    = Math.max(0, (stats.hunger    || 0) - 0.01  * elapsedSecs);
          finalStats.energy    = Math.max(0, (stats.energy    || 0) - 0.005 * elapsedSecs);
          finalStats.hygiene   = Math.max(0, (stats.hygiene   || 0) - 0.004 * elapsedSecs);
          finalStats.happiness = Math.max(0, (stats.happiness || 0) - 0.006 * elapsedSecs);
        }
      }

      const newStates = computeStates(finalStats, petStatesRef.current);
      const isDifferent =
        newStates.length !== petStatesRef.current.length ||
        !newStates.every((v, i) => v === petStatesRef.current[i]);

      if (isDifferent) {
        console.log('[CatMascot] States: ' + petStatesRef.current.join(', ') + ' -> ' + newStates.join(', '));
        petStatesRef.current = newStates;
        setPetStates(newStates);
      }
    };

    // Initial check from localStorage (5-min freshness)
    const saved      = localStorage.getItem('pet_stats');
    const lastSavedAt = localStorage.getItem('pet_last_saved_at');
    const isFresh    = lastSavedAt && (Date.now() - new Date(lastSavedAt).getTime() < 300000);
    if (saved && isFresh) {
      try { updateStateFromStats(JSON.parse(saved), lastSavedAt); } catch (e) { /* ignore */ }
    }

    const readLocalSleepState = () => {
      const savedSleeping = localStorage.getItem(PET_SLEEPING_KEY);
      if (savedSleeping !== null) {
        setIsPetSleeping(savedSleeping === 'true');
      }
    };

    readLocalSleepState();
    setSelectedPetId(normalizePetId(localStorage.getItem('pet_name')));

    const handlePetSleepChange = (event) => {
      setIsPetSleeping(!!event.detail);
    };

    const handlePetSelectionChange = (event) => {
      setSelectedPetId(normalizePetId(event.detail));
    };

    const handleStorage = (event) => {
      if (event.key === PET_SLEEPING_KEY) {
        setIsPetSleeping(event.newValue === 'true');
      }
      if (event.key === 'pet_name') {
        setSelectedPetId(normalizePetId(event.newValue));
      }
    };

    window.addEventListener('virtual-pet-sleep-change', handlePetSleepChange);
    window.addEventListener('virtual-pet-selection-change', handlePetSelectionChange);
    window.addEventListener('storage', handleStorage);

    // 2. Fetch from Supabase for latest data
    const fetchStats = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[CatMascot] Fetching pet stats for user:', session.user.id);
        if (!session?.user) return;
        const { data, error } = await supabase
          .from('inventory_pet')
          .select('hunger, hygiene, energy, happiness, is_sleeping, pet_name, updated_at')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (data && !error) {
          const nextSleeping = !!data.is_sleeping;
          setIsPetSleeping(nextSleeping);
          localStorage.setItem(PET_SLEEPING_KEY, String(nextSleeping));
          localStorage.setItem(PET_SLEEPING_UPDATED_AT_KEY, data.updated_at || new Date().toISOString());
          setSelectedPetId(normalizePetId(data.pet_name));
          updateStateFromStats(data, data.updated_at);
        }
      } catch (err) {
        console.error('Error fetching pet stats:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 120000);
    // Staggered retries: SSO exchange can take 0.5–4s; the first successful call wins
    const r1 = setTimeout(fetchStats, 500);
    const r2 = setTimeout(fetchStats, 2000);
    const r3 = setTimeout(fetchStats, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(r1); clearTimeout(r2); clearTimeout(r3);
      window.removeEventListener('virtual-pet-sleep-change', handlePetSleepChange);
      window.removeEventListener('virtual-pet-selection-change', handlePetSelectionChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [disabled]);

  // ─── Dialog init (legacy Intro / Welcome Back) ──────────────────────────────
  // When the Phase 1A personalized-dialogue flag is enabled, the effect above
  // owns dialog selection instead — this entire legacy path is left untouched
  // so behaviour with the flag disabled is unaffected.
  useEffect(() => {
    if (personalizedDialogueEnabled) return;

    const initDialog = async () => {
      let userId: string | null = null;
      let userMeta: Record<string, any> | null = null;
      let userEmail: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
        userMeta = session?.user?.user_metadata || null;
        userEmail = session?.user?.email || null;
        setCurrentUserId(userId);
      } catch (err) {
        console.error("Error fetching session in initDialog:", err);
      }

      // If user is logged in (disabled = false) and has seen the intro, fetch
      // the configurable Welcome Back message and auto-close after a few seconds.
      if (!disabled && userId && localStorage.getItem(`intro_shown_${userId}`) === 'true') {
        try {
          const { data: config, error } = await supabase
            .from('aiboard_simulator_configs')
            .select('welcome_back_text, welcome_back_auto_close_ms')
            .eq('module_name', 'Snabbb.io')
            .limit(1)
            .maybeSingle();

          let welcomeText = !error ? config?.welcome_back_text : null;
          const autoCloseMs = (!error && config?.welcome_back_auto_close_ms) || 6000;

          if (welcomeText && /\[name\]/i.test(welcomeText)) {
            let displayName: string | null = null;
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('name, full_name')
                .eq('user_id', userId)
                .maybeSingle();
              displayName = profile?.name || profile?.full_name || null;
            } catch (err) {
              console.error("Error fetching profile for welcome back name:", err);
            }
            if (!displayName) displayName = userMeta?.name || null;
            if (!displayName && userEmail) displayName = userEmail.split('@')[0];
            // Never show a raw email address, even if it came from profiles.name/full_name.
            if (displayName && displayName.includes('@')) displayName = displayName.split('@')[0];

            welcomeText = displayName
              ? welcomeText.replace(/\[name\]/gi, displayName)
              : welcomeText
                  .replace(/,\s*\[name\]/gi, '')
                  .replace(/\[name\],\s*/gi, '')
                  .replace(/\[name\]/gi, '')
                  .replace(/\s{2,}/g, ' ')
                  .trim();
          }

          if (welcomeText) {
            setDialogSteps([welcomeText]);
            setDialogStep(0);
            currentDialogType.current = 'welcomeBack';
            welcomeBackAutoCloseMsRef.current = autoCloseMs;
            tryActivateDialog();
          }
        } catch (err) {
          console.error("Error fetching welcome back message:", err);
        }
        return;
      }

      try {
        const { data: configs, error: configsError } = await supabase
          .from('aiboard_simulator_configs')
          .select('id')
          .eq('module_name', 'Snabbb.io')
          .limit(1);

        if (configsError) {
          // Infrastructure/query failure — do not mark the intro stage
          // complete; preserve the ability to retry on the next login/reload.
          return;
        }

        if (!configs || configs.length === 0) {
          // Query succeeded and confirmed no simulator config exists at all
          // for this module — there is no Intro to ever show. Mark the stage
          // complete so future post-login visits proceed to Welcome Back
          // instead of retrying the missing Intro forever.
          if (!disabled) markIntroCompleted(userId);
          return;
        }

        const configId = configs[0].id;

        const { data, error } = await supabase
          .from('aiboard_simulator_dialog_steps')
          .select('step_text, sort_order')
          .eq('config_id', configId)
          .eq('is_post_login', !disabled)
          .order('sort_order', { ascending: true });

        if (error) {
          // Infrastructure/query failure — do not mark the intro stage complete.
          return;
        }

        const steps = (data || [])
          .map(d => d.step_text)
          .filter((text): text is string => typeof text === 'string' && text.trim().length > 0);

        if (steps.length > 0) {
          setDialogSteps(steps);
          setDialogStep(0);
          currentDialogType.current = 'intro';
          tryActivateDialog();
          return;
        }

        // Query succeeded but returned no usable intro content (zero rows, or
        // every row was empty/whitespace-only) — there is nothing to show.
        // Mark the stage complete so this doesn't retry forever on every login.
        if (!disabled) markIntroCompleted(userId);
      } catch (err) {
        console.error("Error fetching dialog steps:", err);
      }
    };

    initDialog();
  }, [disabled, personalizedDialogueEnabled]);

  // ─── Meow message loop ────────────────────────────────────────────────────
  // FIX: dep array is only [disabled] — petStates and isDialogActive are read
  // via refs so changing them does NOT restart the loop (and cause instant meow).
  useEffect(() => {
    if (disabled) return;

    let isSubscribed = true;

    // FIX: helper that clears BOTH timers
    const clearAllTimers = () => {
      if (meowTimerRef.current)      { clearTimeout(meowTimerRef.current);      meowTimerRef.current = null; }
      if (meowInnerTimerRef.current) { clearTimeout(meowInnerTimerRef.current); meowInnerTimerRef.current = null; }
    };

    const runMeowLoop = async () => {
      try {
        const { data: configs } = await supabase.from('aiboard_meow_configs').select('id').limit(1);
        if (!configs || configs.length === 0) return;
        const configId = configs[0].id;

        // Read current states from ref — no stale closure
        const primaryState = petStatesRef.current[0] || 'Normal';

        const { data: timingData, error: timingError } = await supabase
          .from('aiboard_meow_timing')
          .select('message_duration_minutes, message_interval_minutes, disabled')
          .eq('config_id', configId)
          .eq('state', primaryState)
          .order('updated_at', { ascending: false })
          .limit(1);

        let activeTiming = timingData?.[0];

        if (timingError || !activeTiming || activeTiming.disabled) {
          if (primaryState !== 'Normal') {
            console.log(`[CatMascot] No active timing for "${primaryState}", falling back to "Normal"`);
          }
          const { data: normalTiming, error: nError } = await supabase
            .from('aiboard_meow_timing')
            .select('message_duration_minutes, message_interval_minutes, disabled')
            .eq('config_id', configId)
            .eq('state', 'Normal')
            .order('updated_at', { ascending: false })
            .limit(1);

          if (normalTiming?.[0] && !normalTiming[0].disabled) {
            activeTiming = normalTiming[0];
          } else {
            console.warn("[CatMascot] No active or Normal timing found. Meow loop aborted.", nError);
            return;
          }
        }

        // Fetch messages for ALL active states via ref
        const { data: msgsData, error: msgsError } = await supabase
          .from('aiboard_meow_messages')
          .select('message, state, sort_order')
          .eq('config_id', configId)
          .in('state', petStatesRef.current)
          .eq('is_audio', false)
          .order('state', { ascending: true })
          .order('sort_order', { ascending: true });

        if (msgsError) {
          console.error(`[CatMascot] Error fetching messages:`, msgsError);
          return;
        }

        if (!msgsData || msgsData.length === 0) {
          console.log(`[CatMascot] No messages found for states [${petStatesRef.current.join(', ')}]`);
          return;
        }

        const intervalMs = (activeTiming.message_interval_minutes || 0.25) * 60 * 1000;
        const durationMs  = (activeTiming.message_duration_minutes  || 0.1)  * 60 * 1000;

        console.log(`[CatMascot] Loop started: States=[${petStatesRef.current.join(', ')}], Msgs=${msgsData.length}, Interval=${intervalMs/1000}s, Duration=${durationMs/1000}s`);

        let currentIndex = 0;

        const loop = () => {
          // FIX: outer timer stored in meowTimerRef
          meowTimerRef.current = setTimeout(() => {
            if (!isSubscribed) return;

            // FIX: skip showing message while dialog is open — read via ref
            if (isDialogActiveMeowRef.current) {
              loop(); // wait another interval, don't show message
              return;
            }

            const seqMsg = msgsData[currentIndex].message;
            setMeowMsg(seqMsg);
            currentIndex = (currentIndex + 1) % msgsData.length;

            // FIX: inner timer stored in meowInnerTimerRef so cleanup can cancel it
            meowInnerTimerRef.current = setTimeout(() => {
              if (!isSubscribed) return;
              setMeowMsg(null);
              loop();
            }, durationMs);
          }, intervalMs);
        };

        loop();
      } catch (err) {
        console.error("Error setting up meow loop:", err);
      }
    };

    runMeowLoop();

    return () => {
      isSubscribed = false;
      clearAllTimers(); // FIX: clears both outer and inner timers
    };
  }, [disabled]); // FIX: only [disabled] — petStates/isDialogActive read via refs

  // ─── Audio loop ───────────────────────────────────────────────────────────
  const audioLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled) return;

    let isSubscribed = true;

    const runAudioLoop = async () => {
      try {
        const { data: configs } = await supabase.from('aiboard_meow_configs').select('id').limit(1);
        if (!configs || configs.length === 0) return;
        const configId = configs[0].id;

        const { data: timingData } = await supabase
          .from('aiboard_meow_timing')
          .select('message_interval_minutes, disabled')
          .eq('config_id', configId)
          .eq('state', 'Audio')
          .order('updated_at', { ascending: false })
          .limit(1);

        const audioTiming = timingData?.[0];
        if (!audioTiming || audioTiming.disabled) return;

        const { data: msgsData } = await supabase
          .from('aiboard_meow_messages')
          .select('message')
          .eq('config_id', configId)
          .eq('state', 'Audio')
          .eq('is_audio', true);

        if (!msgsData || msgsData.length === 0) return;

        const intervalMs = (audioTiming.message_interval_minutes || 0.1) * 60 * 1000;

        const loop = () => {
          audioLoopTimerRef.current = setTimeout(() => {
            if (!isSubscribed) return;
            const randomMsg = msgsData[Math.floor(Math.random() * msgsData.length)].message;
            if (randomMsg) {
              const audioObj = new Audio(randomMsg);
              audioObj.play().catch(e => console.error("Audio playback error:", e));
            }
            loop();
          }, intervalMs);
        };

        loop();
      } catch (err) {
        console.error("Error setting up audio loop:", err);
      }
    };

    runAudioLoop();

    return () => {
      isSubscribed = false;
      if (audioLoopTimerRef.current) clearTimeout(audioLoopTimerRef.current);
    };
  }, [disabled]);

  // ─── Walking / click-to-move ──────────────────────────────────────────────
  const walkTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const lastMoveStartPos  = useRef({ x: -10, y: 85 });
  const lastMoveStartTime = useRef(Date.now());
  const lastMoveDuration  = useRef(0.8);
  const lastMoveTarget    = useRef({ x: -10, y: 85 });

  useEffect(() => {
    audioRef.current = new Audio('/images/cat-meow.mp3');

    const destX    = 20 + Math.random() * 60;
    const destY    = 80 + Math.random() * 10;
    const duration = 2.8;

    lastMoveStartPos.current  = { x: -10, y: 85 };
    lastMoveTarget.current    = { x: destX, y: destY };
    lastMoveStartTime.current = Date.now();
    lastMoveDuration.current  = duration;

    setFacingLeft(false);
    setWalkDuration(duration);
    setCatPos({ x: destX, y: destY });
    setIsWalking(true);

    if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
    walkTimeoutRef.current = setTimeout(() => {
      setIsWalking(false);
      isEntryWalkComplete.current = true;
      tryActivateDialog();
    }, duration * 1000);

    const getInterpolatedPos = () => {
      const elapsed  = (Date.now() - lastMoveStartTime.current) / 1000;
      const progress = Math.min(elapsed / lastMoveDuration.current, 1);
      return {
        x: lastMoveStartPos.current.x + (lastMoveTarget.current.x - lastMoveStartPos.current.x) * progress,
        y: lastMoveStartPos.current.y + (lastMoveTarget.current.y - lastMoveStartPos.current.y) * progress,
      };
    };

    const handleGlobalClick = (e) => {
      if (isHiddenRef.current) return;

      const target = e.target;

      // Ignore clicks on or inside any interactive element or overlay
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('label') ||
        target.closest('img') ||
        target.closest('[data-no-cat]') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="option"]') ||
        target.closest('[role="tab"]') ||
        target.closest('[role="switch"]') ||
        target.closest('[data-cat]') ||
        target.closest('[class*="modal"]') ||
        target.closest('[class*="dropdown"]') ||
        target.closest('[class*="popover"]') ||
        target.closest('[class*="dialog"]') ||
        target.closest('[class*="overlay"]') ||
        target.closest('[class*="toast"]') ||
        target.closest('[class*="tooltip"]') ||
        target.closest('.fixed') ||
        target.closest('.absolute') ||
        target.closest('.cat-mascot-wrapper')
      ) return;

      const targetX_px = e.clientX;
      const targetY_px = e.clientY;
      const targetX    = (targetX_px / window.innerWidth)  * 100;
      const targetY    = (targetY_px / window.innerHeight) * 100;

      const currentPos   = getInterpolatedPos();
      const currentX_px  = (currentPos.x / 100) * window.innerWidth;
      const currentY_px  = (currentPos.y / 100) * window.innerHeight;
      const distance_px  = Math.sqrt(Math.pow(targetX_px - currentX_px, 2) + Math.pow(targetY_px - currentY_px, 2));

      if (distance_px < 5) return;

      const duration = distance_px / 200;

      lastMoveStartPos.current  = currentPos;
      lastMoveTarget.current    = { x: targetX, y: targetY };
      lastMoveStartTime.current = Date.now();
      lastMoveDuration.current  = duration;

      setFacingLeft(targetX < currentPos.x);
      setWalkDuration(duration);
      setCatPos({ x: targetX, y: targetY });
      setIsHovered(false);
      setIsWalking(true);

      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
      walkTimeoutRef.current = setTimeout(() => {
        setIsWalking(false);
        isEntryWalkComplete.current = true;
        tryActivateDialog();
      }, duration * 1000);
    };

    document.addEventListener('dblclick', handleGlobalClick);
    return () => {
      document.removeEventListener('dblclick', handleGlobalClick);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  // ─── Cat click handler ────────────────────────────────────────────────────
  const handleCatClick = (e) => {
    e.stopPropagation();
    if (!disabled) closeDialog();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsMeowing(true);
      setTimeout(() => setIsMeowing(false), 800);
    }
    if (!disabled && onCatClick) onCatClick();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes cat-sound-wave {
          0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        .cat-sound-ring {
          animation: cat-sound-wave 0.6s ease-out forwards;
        }
        .cat-tooltip {
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .cat-mascot-wrapper:hover .cat-tooltip {
          opacity: 1;
        }
        .mallow-mascot {
          position: relative;
          width: ${MALLOW_FRAME_WIDTH * MALLOW_SCALE}px;
          height: ${MALLOW_FRAME_HEIGHT * MALLOW_SCALE}px;
          background-image: var(--pet-spritesheet);
          background-repeat: no-repeat;
          background-size: ${MALLOW_FRAME_WIDTH * 8 * MALLOW_SCALE}px ${MALLOW_FRAME_HEIGHT * 9 * MALLOW_SCALE}px;
          background-position-y: calc(-1 * var(--sprite-row) * ${MALLOW_FRAME_HEIGHT * MALLOW_SCALE}px);
          image-rendering: pixelated;
          pointer-events: auto;
          cursor: pointer;
          filter: drop-shadow(0 5px 8px rgba(15, 23, 42, 0.1));
          animation-duration: var(--sprite-duration);
          animation-iteration-count: infinite;
          animation-timing-function: steps(var(--sprite-frames));
        }
        .mallow-mascot.idle,
        .mallow-mascot.run-left,
        .mallow-mascot.run-right,
        .mallow-mascot.review {
          animation-name: mallow-sprite;
        }
        .mallow-mascot.sleep {
          animation-name: none;
          background-position-x: calc(-1 * var(--sprite-frame) * ${MALLOW_FRAME_WIDTH * MALLOW_SCALE}px);
        }
        .mallow-mascot.sleep::after {
          content: 'Zzz...';
          position: absolute;
          left: 64%;
          top: -5px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.02em;
          animation: mascot-sleep-float 1.8s ease-in-out infinite;
        }
        @keyframes mallow-sprite {
          from { background-position-x: 0; }
          to   { background-position-x: calc(-1 * var(--sprite-frames) * ${MALLOW_FRAME_WIDTH * MALLOW_SCALE}px); }
        }
        @keyframes mascot-sleep-float {
          0%, 100% { transform: translateY(0); opacity: 0.65; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      <div
        className="cat-mascot-wrapper"
        style={{
          position: 'fixed',
          left: `${catPos.x}%`,
          top: `${catPos.y}%`,
          transform: `translate(-50%, -100%)`,
          transition: `left ${walkDuration}s linear, top ${walkDuration}s linear`,
          zIndex: 9990,
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="wait">
          {isDialogActive && dialogSteps.length > 0 && (
            <motion.div
              data-cat="true"
              key={`dialog-bubble-${dialogStep}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-max shrink-0 max-w-[min(85vw,340px)] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-visible relative pointer-events-auto mb-4 mr-1 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="p-4 text-sm font-semibold leading-relaxed flex flex-col relative z-10 bg-white rounded-lg"
                style={{ color: '#334155', backgroundColor: '#ffffff' }}
              >
                <div className="flex-1 flex items-center justify-center text-center">
                  <p className="whitespace-pre-wrap" style={{ color: '#334155' }}>{dialogSteps[dialogStep]}</p>
                </div>
                <div className="pt-4 flex justify-between items-center mt-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDialogStep(p => Math.max(0, p - 1)); }}
                    disabled={dialogStep === 0}
                    className={`flex items-center gap-1 text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900 cursor-pointer ${dialogStep === 0 ? 'invisible' : ''}`}
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  {dialogStep === dialogSteps.length - 1 ? (
                    <div className="flex items-center gap-3">
                      {/* Only P0/profile Phase 1A candidates carry an action; the
                          legacy Intro and the fixed welcome fallback never do. */}
                      {personalizedActiveCandidate?.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runPersonalizedAction(personalizedActiveCandidate);
                            closeDialog();
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-white bg-[#2A9D8F] px-3 py-1.5 rounded-md hover:opacity-90 cursor-pointer"
                        >
                          {personalizedActiveCandidate.action.label}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); closeDialog(); }}
                        className="flex items-center gap-1 text-xs font-semibold text-[#2A9D8F] underline underline-offset-2 hover:opacity-80 cursor-pointer"
                      >
                        Close <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDialogStep(p => Math.min(dialogSteps.length - 1, p + 1)); }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#2A9D8F] underline underline-offset-2 hover:opacity-80 cursor-pointer"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-white transform rotate-45 -translate-x-1/2 shadow-md border-r border-b border-slate-100 z-0"></div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!disabled && !isDialogActive && meowMsg && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm relative pointer-events-auto mb-4 mr-1 cursor-default"
            >
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{meowMsg}</span>
              <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-white transform rotate-45 -translate-x-1/2 shadow-md border-r border-b border-slate-100 z-0"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mallow pet mascot */}
        <div
          data-cat="true"
          onClick={(e) => { e.stopPropagation(); handleCatClick(e); }}
          onMouseEnter={() => { if (!isWalking) setIsHovered(true); }}
          onMouseOver={() =>  { if (!isWalking) setIsHovered(true); }}
          onMouseLeave={() => setIsHovered(false)}
          style={{ pointerEvents: 'auto' }}
        >
          <MallowMascotSprite
            spriteSheetUrl={selectedPet.spriteSheetUrl}
            sleepHoldFrame={selectedPet.sleepHoldFrame}
            idleFrames={selectedPet.idleFrames}
            idleDuration={selectedPet.idleDuration}
            hoverRow={selectedPet.hoverRow}
            hoverFrames={selectedPet.hoverFrames}
            hoverDuration={selectedPet.hoverDuration}
            clickRow={selectedPet.clickRow}
            clickFrames={selectedPet.clickFrames}
            clickDuration={selectedPet.clickDuration}
            isWalking={isWalking}
            facingLeft={facingLeft}
            isMeowing={isMeowing}
            isHovered={isHovered}
            isSleeping={isPetSleeping}
            onHoverStart={() => {
              if (!isWalking) setIsHovered(true);
            }}
            onHoverEnd={() => setIsHovered(false)}
          />
        </div>
      </div>
    </>
  );
}