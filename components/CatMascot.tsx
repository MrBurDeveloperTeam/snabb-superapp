import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const MALLOW_SPRITESHEET_URL = '/images/mallow-spritesheet.webp';
const MALLOW_FRAME_WIDTH = 192;
const MALLOW_FRAME_HEIGHT = 208;
const MALLOW_SCALE = 0.42;
const MALLOW_ROWS = {
  idle: { row: 0, frames: 6, duration: '1.1s' },
  runRight: { row: 1, frames: 8, duration: '0.7s' },
  runLeft: { row: 2, frames: 8, duration: '0.7s' },
  wave: { row: 3, frames: 4, duration: '0.8s' },
  review: { row: 8, frames: 6, duration: '1.5s' },
};

interface CatMascotProps {
  onCatClick?: () => void;
  disabled?: boolean;
  isHidden?: boolean;
}

interface MallowMascotSpriteProps {
  isWalking: boolean;
  facingLeft: boolean;
  isMeowing: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function MallowMascotSprite({ isWalking, facingLeft, isMeowing, isHovered, onHoverStart, onHoverEnd }: MallowMascotSpriteProps) {
  const shouldReview = isHovered && !isWalking;
  const stateClass = shouldReview ? 'review' : isWalking ? (facingLeft ? 'run-left' : 'run-right') : 'idle';
  const config = shouldReview
    ? MALLOW_ROWS.review
    : isMeowing && !isWalking
    ? MALLOW_ROWS.wave
    : isWalking && facingLeft
      ? MALLOW_ROWS.runLeft
      : isWalking
        ? MALLOW_ROWS.runRight
        : MALLOW_ROWS.idle;

  return (
    <div
      className={`mallow-mascot ${stateClass} frames-${config.frames} ${isMeowing ? 'is-talking' : ''}`}
      aria-label={`Mallow pet ${stateClass}`}
      onPointerEnter={onHoverStart}
      onMouseEnter={onHoverStart}
      onMouseOver={onHoverStart}
      onPointerLeave={onHoverEnd}
      onMouseLeave={onHoverEnd}
      style={{
        '--sprite-row': config.row,
        '--sprite-frames': config.frames,
        '--sprite-duration': config.duration,
      } as React.CSSProperties}
    />
  );
}

export default function CatMascot({ onCatClick, disabled = false, isHidden = false }: CatMascotProps) {
  const [catPos, setCatPos] = useState({ x: -10, y: 85 });
  const [isWalking, setIsWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [isMeowing, setIsMeowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [walkDuration, setWalkDuration] = useState(0.8);

  const [dialogStep, setDialogStep] = useState(0);
  const [isDialogActive, setIsDialogActive] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const autoCloseTimerRef = useRef<any>(null);
  const isEntryWalkComplete = useRef(false);
  const hasDismissedDialog = useRef(false);

  const closeDialog = () => {
    hasDismissedDialog.current = true;
    setIsDialogActive(false);
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (!disabled && currentUserId) {
      localStorage.setItem(`intro_shown_${currentUserId}`, 'true');
    }
  };

  const [dialogSteps, setDialogSteps] = useState([
    "👋 Hi there! I'm your AI assistant for App.Snabbb.\nI'm here to help you explore and understand all the features available.",
    "Click on me to open the Virtual Pet ecosystem, or ask me any questions about the app!"
  ]);

  const [meowMsg, setMeowMsg] = useState(null);
  const [petStates, setPetStates] = useState(['Normal']);

  // ─── Refs used inside loops to avoid stale closures / dep-array restarts ───
  const meowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meowInnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // FIX: track inner timer too
  const isHiddenRef = useRef(isHidden);
  const isDialogActiveRef = useRef(isDialogActive); // FIX: ref so loop doesn't restart on dialog change
  const petStatesRef = useRef(['Normal']);           // FIX: ref so loop doesn't restart on state change

  useEffect(() => { isHiddenRef.current = isHidden; }, [isHidden]);
  useEffect(() => { isDialogActiveRef.current = isDialogActive; }, [isDialogActive]);

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

    const fetchStats = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        console.log('[CatMascot] Fetching pet stats for user:', session.user.id);
        const { data, error } = await supabase
          .from('inventory_pet')
          .select('hunger, hygiene, energy, happiness, updated_at')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (data && !error) updateStateFromStats(data, data.updated_at);
      } catch (err) {
        console.error('Error fetching pet stats:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
  }, [disabled]);

  // ─── Dialog init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const initDialog = async () => {
      let userId: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
        setCurrentUserId(userId);
      } catch (err) {
        console.error("Error fetching session in initDialog:", err);
      }

      if (!disabled && userId && localStorage.getItem(`intro_shown_${userId}`) === 'true') {
        setDialogSteps(["Welcome back! 👋"]);
        setDialogStep(0);

        if (isEntryWalkComplete.current && !hasDismissedDialog.current) {
          setIsDialogActive(true);
        }

        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(() => {
          hasDismissedDialog.current = true;
          setIsDialogActive(false);
        }, 6000);
        return;
      }

      const fallbackPreLogin  = ["👋 Welcome to App.Snabbb!", "Please sign in to access your modules, or ask me any questions."];
      const fallbackPostLogin = ["👋 Welcome back! I'm your App.Snabbb Assistant.", "Click on me to open the Virtual Pet ecosystem, or ask me for help!"];

      try {
        const { data: configs } = await supabase
          .from('aiboard_simulator_configs')
          .select('id')
          .eq('module_name', 'App.Snabbb')
          .limit(1);

        if (configs && configs.length > 0) {
          const configId = configs[0].id;

          const { data, error } = await supabase
            .from('aiboard_simulator_dialog_steps')
            .select('step_text, sort_order')
            .eq('config_id', configId)
            .eq('is_post_login', !disabled)
            .order('sort_order', { ascending: true });

          if (!error && data && data.length > 0) {
            setDialogSteps(data.map(d => d.step_text));
            setDialogStep(0);
            if (isEntryWalkComplete.current && !hasDismissedDialog.current) setIsDialogActive(true);
            return;
          }
        }

        setDialogSteps(disabled ? fallbackPreLogin : fallbackPostLogin);
        setDialogStep(0);
        if (isEntryWalkComplete.current && !hasDismissedDialog.current) setIsDialogActive(true);
      } catch (err) {
        console.error("Error fetching dialog steps:", err);
        setDialogSteps(disabled ? fallbackPreLogin : fallbackPostLogin);
        setDialogStep(0);
        if (isEntryWalkComplete.current && !hasDismissedDialog.current) setIsDialogActive(true);
      }
    };

    initDialog();
  }, [disabled]);

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
            if (isDialogActiveRef.current) {
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
      if (!hasDismissedDialog.current) setIsDialogActive(true);
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
      if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[data-cat]')) return;

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
        if (!hasDismissedDialog.current) setIsDialogActive(true);
      }, duration * 1000);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
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
          width: ${MALLOW_FRAME_WIDTH * MALLOW_SCALE}px;
          height: ${MALLOW_FRAME_HEIGHT * MALLOW_SCALE}px;
          background-image: url("${MALLOW_SPRITESHEET_URL}");
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
        .mallow-mascot.idle:hover {
          --sprite-row: 8 !important;
          --sprite-frames: 6 !important;
          --sprite-duration: 1s !important;
          animation-name: mallow-sprite;
        }
        @keyframes mallow-sprite {
          from { background-position-x: 0; }
          to   { background-position-x: calc(-1 * var(--sprite-frames) * ${MALLOW_FRAME_WIDTH * MALLOW_SCALE}px); }
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
          {isDialogActive && (
            <motion.div
              data-cat="true"
              key={`dialog-bubble-${dialogStep}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-max shrink-0 max-w-[280px] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-visible relative pointer-events-auto mb-4 mr-1 cursor-default"
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
                    <button
                      onClick={(e) => { e.stopPropagation(); closeDialog(); }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#2A9D8F] underline underline-offset-2 hover:opacity-80 cursor-pointer"
                    >
                      Close <X className="w-4 h-4" />
                    </button>
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
            isWalking={isWalking}
            facingLeft={facingLeft}
            isMeowing={isMeowing}
            isHovered={isHovered}
            onHoverStart={() => { if (!isWalking) setIsHovered(true); }}
            onHoverEnd={() => setIsHovered(false)}
          />
        </div>
      </div>
    </>
  );
}
