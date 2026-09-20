import React, { useState, useRef, useEffect } from 'react';

interface HoldButtonProps {
  onTrigger: () => void;
  holdDurationMs?: number;
  className?: string;
  label?: string;
  sublabel?: string;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  onTrigger,
  holdDurationMs = 3000,
  className = '',
  label = 'SOS',
  sublabel = 'HOLD 3s',
}) => {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startHold = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsHolding(true);
    startTimeRef.current = Date.now();
    setProgress(0);

    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }

    timerRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / holdDurationMs) * 100);
      setProgress(pct);

      if (elapsed >= holdDurationMs) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        startTimeRef.current = null;
        setIsHolding(false);
        setProgress(0);
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 200]);
        }
        onTrigger();
      }
    }, 25);
  };

  const endHold = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // If released early, check if it was a quick click (< 350ms) to trigger immediate navigation
    if (startTimeRef.current && Date.now() - startTimeRef.current < 350) {
      onTrigger();
    }
    startTimeRef.current = null;
    setIsHolding(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const strokeDashoffset = 283 - (283 * progress) / 100;

  return (
    <button
      type="button"
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      aria-label={`${label}. Press and hold for 3 seconds or tap to open emergency screen.`}
      className={`group relative flex flex-col items-center justify-center select-none touch-none rounded-2xl bg-gradient-to-tr from-[#DC2626] to-[#EF4444] text-white shadow-xl transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400 ${className}`}
    >
      {/* Background Pulse Glow */}
      <div className="absolute inset-0 rounded-2xl bg-red-600 blur-md opacity-40 group-hover:opacity-75 transition-opacity" />

      {/* SVG Progress Ring */}
      <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] -rotate-90 pointer-events-none" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="6"
        />
        {progress > 0 && (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeDasharray="283"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        )}
      </svg>

      {/* Button Content */}
      <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-heading font-black text-xl sm:text-2xl tracking-wider text-white">
          {label}
        </span>
        <span className="text-[11px] font-bold text-white/90 uppercase tracking-widest mt-0.5">
          {isHolding ? `${Math.ceil((holdDurationMs - (progress * holdDurationMs) / 100) / 1000)}s` : sublabel}
        </span>
      </div>
    </button>
  );
};
