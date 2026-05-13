import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Delete, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExerciseNumpadProps {
  isOpen: boolean;
  onClose: () => void;
  inputValue: string;
  onNumberClick: (num: number | string) => void;
  onDelete: () => void;
  onCheck: () => void;
  status: 'idle' | 'correct' | 'incorrect';
  onTryAgain?: () => void;
  checkDisabled?: boolean;
  /** When inputValue reaches this length, auto-submit after 400 ms. */
  autoSubmitLength?: number;
  /** Called with the numpad's rendered height (px) when it mounts. */
  onHeightChange?: (height: number) => void;
}

const ROWS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

function vibrate() {
  try { navigator.vibrate?.(25); } catch (_) {}
}

export function ExerciseNumpad({
  isOpen,
  onClose,
  inputValue,
  onNumberClick,
  onDelete,
  onCheck,
  status,
  onTryAgain,
  checkDisabled = false,
  autoSubmitLength,
  onHeightChange,
}: ExerciseNumpadProps) {
  // Keep a stable ref so the auto-submit effect never captures a stale onCheck
  const onCheckRef = useRef(onCheck);
  onCheckRef.current = onCheck;

  // Auto-submit when input reaches max length
  useEffect(() => {
    if (!autoSubmitLength) return;
    if (inputValue.length < autoSubmitLength) return;
    if (status !== 'idle' || checkDisabled) return;
    const timer = setTimeout(() => onCheckRef.current(), 400);
    return () => clearTimeout(timer);
  }, [inputValue, autoSubmitLength, status, checkDisabled]);

  const numBtnClass =
    'relative h-12 md:h-14 rounded-2xl bg-[#2d1b54] border-b-[4px] md:border-b-[5px] border-[#1c1134] ' +
    'shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:bg-[#3b2d71] ' +
    'active:border-b-0 active:translate-y-[4px] transition-all ' +
    'flex items-center justify-center group overflow-hidden select-none';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={(el) => { if (el && onHeightChange) onHeightChange(el.offsetHeight); }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="absolute bottom-0 left-0 right-0 w-full bg-[#1a103c]/95 backdrop-blur-xl px-3 pt-2 pb-4 md:px-6 md:pt-3 md:pb-6 rounded-t-[2rem] md:rounded-t-[3rem] border-t-4 border-[#3b2d71] shadow-[0_-15px_50px_rgba(0,0,0,0.6)] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: drag pill + close button */}
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="w-8" />
            <div className="w-16 h-1.5 bg-[#3b2d71] rounded-full" />
            <button
              onClick={() => { vibrate(); onClose(); }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2d1b54] hover:bg-[#3b2d71] transition-colors"
              aria-label="Verberg numpad"
            >
              <X className="w-4 h-4 text-[#9d8bce]" />
            </button>
          </div>

          <div className="max-w-md w-full mx-auto flex flex-col gap-2 md:gap-3">
            {/* Number rows 1–9 */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {ROWS.map((row, ri) =>
                row.map((num) => (
                  <button
                    key={`${ri}-${num}`}
                    onClick={() => { vibrate(); onNumberClick(num); }}
                    className={numBtnClass}
                  >
                    <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl pointer-events-none" />
                    <span className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] group-active:scale-95 transition-transform">
                      {num}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Bottom row: Delete | Check/Opnieuw | 0
                Check is center — easiest thumb reach on phone */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {/* Delete — neutral purple, same family as number keys */}
              <button
                onClick={() => { vibrate(); onDelete(); }}
                className={cn(numBtnClass, 'hover:bg-[#3b2d71]')}
                aria-label="Wissen"
              >
                <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl pointer-events-none" />
                <Delete className="w-6 h-6 md:w-7 md:h-7 text-[#c4b5fd] group-active:scale-90 transition-transform" />
              </button>

              {/* Center: Check or Opnieuw */}
              <AnimatePresence mode="wait">
                {status === 'incorrect' && onTryAgain ? (
                  <motion.button
                    key="opnieuw"
                    initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 300 }}
                    onClick={() => { vibrate(); onTryAgain(); }}
                    className="relative h-12 md:h-14 rounded-2xl bg-orange-500 border-b-[4px] md:border-b-[5px] border-orange-700 shadow-[0_4px_15px_rgba(249,115,22,0.5)] hover:bg-orange-400 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-1.5 group select-none"
                  >
                    <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none" />
                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5 text-white group-active:scale-90 transition-transform flex-shrink-0" />
                    <span className="text-xs md:text-sm font-black text-white uppercase tracking-wide group-active:scale-95 transition-transform">
                      Opnieuw
                    </span>
                  </motion.button>
                ) : (
                  <motion.button
                    key="check"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={() => { vibrate(); onCheck(); }}
                    disabled={checkDisabled}
                    className={cn(
                      'relative h-12 md:h-14 rounded-2xl border-b-[4px] md:border-b-[5px] transition-all flex items-center justify-center group select-none',
                      !checkDisabled
                        ? 'bg-emerald-500 border-emerald-700 shadow-[0_4px_15px_rgba(16,185,129,0.45)] hover:bg-emerald-400 active:border-b-0 active:translate-y-[4px]'
                        : 'bg-[#2d1b54] border-[#1c1134] opacity-40 cursor-not-allowed'
                    )}
                    aria-label="Controleer"
                  >
                    <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none" />
                    <Check
                      className={cn(
                        'w-7 h-7 md:w-9 md:h-9 drop-shadow-md transition-transform',
                        !checkDisabled ? 'text-white group-active:scale-90' : 'text-white/30'
                      )}
                      strokeWidth={4}
                    />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* 0 */}
              <button
                onClick={() => { vibrate(); onNumberClick('0'); }}
                className={numBtnClass}
              >
                <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl pointer-events-none" />
                <span className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] group-active:scale-95 transition-transform">
                  0
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
