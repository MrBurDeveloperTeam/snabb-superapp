import React, { useState, useEffect, useRef } from 'react';

interface CatPosition {
  x: number;
  y: number;
}

interface CatMascotProps {
  onCatClick: (e: React.MouseEvent) => void;
}

const CAT_SPEED = 0.08; 
const MEOW_SOUND_URL = `/images/cat-meow.mp3`;
const CAT_IMAGE_URL = `/images/cat.gif`;
const CAT_WALK_IMAGE_URL = `/images/catwalk.gif`;

export const CatMascot: React.FC<CatMascotProps> = ({ onCatClick }) => {
  const [catPos, setCatPos] = useState<CatPosition>({ x: 50, y: 50 });
  const [isWalking, setIsWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(true);
  const [isMeowing, setIsMeowing] = useState(false);
  const [walkDuration, setWalkDuration] = useState(0.8);
  
  const walkTimeoutRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const lastMoveStartPos = useRef({ x: 50, y: 50 });
  const lastMoveStartTime = useRef(Date.now());
  const lastMoveDuration = useRef(0.8);
  const lastMoveTarget = useRef({ x: 50, y: 50 });

  useEffect(() => {
    audioRef.current = new Audio(MEOW_SOUND_URL);
    
    // Auto-spawn somewhat randomly near the bottom area
    const startX = 20 + Math.random() * 60;
    const startY = 80 + Math.random() * 10;
    setCatPos({ x: startX, y: startY });
    
    lastMoveStartPos.current = { x: startX, y: startY };
    lastMoveTarget.current = { x: startX, y: startY };

    const handleGlobalClick = (e: MouseEvent) => {
      // Don't trigger if they clicked an interactive element like a button or input
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('input')) {
        return;
      }
      
      const targetX = (e.clientX / window.innerWidth) * 100;
      const targetY = (e.clientY / window.innerHeight) * 100;

      const currentVisualPos = getInterpolatedPos();
      const distance = Math.sqrt(Math.pow(targetX - currentVisualPos.x, 2) + Math.pow(targetY - currentVisualPos.y, 2));

      if (distance < 1) return;

      const calculatedDuration = Math.max(0.3, distance * CAT_SPEED);

      lastMoveStartPos.current = currentVisualPos;
      lastMoveTarget.current = { x: targetX, y: targetY };
      lastMoveStartTime.current = Date.now();
      lastMoveDuration.current = calculatedDuration;

      setFacingLeft(targetX < currentVisualPos.x);
      setWalkDuration(calculatedDuration);
      setCatPos({ x: targetX, y: targetY });
      setIsWalking(true);

      if (walkTimeoutRef.current) window.clearTimeout(walkTimeoutRef.current);
      walkTimeoutRef.current = window.setTimeout(() => {
        setIsWalking(false);
      }, calculatedDuration * 1000);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const getInterpolatedPos = () => {
    if (!isWalking) return catPos;
    const elapsed = (Date.now() - lastMoveStartTime.current) / 1000;
    const progress = Math.min(elapsed / lastMoveDuration.current, 1);
    return {
      x: lastMoveStartPos.current.x + (lastMoveTarget.current.x - lastMoveStartPos.current.x) * progress,
      y: lastMoveStartPos.current.y + (lastMoveTarget.current.y - lastMoveStartPos.current.y) * progress,
    };
  };

  const handleCatClickInternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log("Audio blocked:", err));
      setIsMeowing(true);
      setTimeout(() => setIsMeowing(false), 800);
    }
    onCatClick(e);
  };

  return (
    <>
      <style>{`
        @keyframes shadow-breathe {
          0%, 50%, 100% { transform: scale(1); opacity: 0.15; }
          25%, 75% { transform: scale(0.85); opacity: 0.1; }
        }
        .animate-cat-shadow {
          animation: shadow-breathe 0.3s infinite ease-in-out;
        }
        @keyframes sound-wave {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .animate-sound {
          animation: sound-wave 0.6s ease-out forwards;
        }
      `}</style>

      <div
        onClick={handleCatClickInternal}
        className="fixed z-[40] cursor-pointer hover:scale-110 group pointer-events-auto"
        style={{
          left: `${catPos.x}%`,
          top: `${catPos.y}%`,
          transition: `left ${walkDuration}s linear, top ${walkDuration}s linear, transform 0.2s ease-out`,
          transform: `translate(-50%, -100%) scaleX(${facingLeft ? -1 : 1})`,
        }}
      >
        {isMeowing && (
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-sound" style={{ transform: 'translate(-50%, -50%)' }} />
        )}

        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-black rounded-[100%] blur-[2px] transition-opacity ${isWalking ? 'animate-cat-shadow' : 'opacity-15'}`} />

        {/* Tooltip */}
        <div
          className="absolute bottom-full left-1/2 mb-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-lg"
          style={{ transform: `translateX(-50%) scaleX(${facingLeft ? -1 : 1})` }}
        >
          <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-lg">
            Click to play with me
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
          </div>
        </div>

        <div className="w-12 h-12 sm:w-14 sm:h-14 select-none relative z-10 transition-transform duration-200 drop-shadow-xl">
          <img
            src={isWalking ? CAT_WALK_IMAGE_URL : CAT_IMAGE_URL}
            alt="Cat Mascot"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      </div>
    </>
  );
};
