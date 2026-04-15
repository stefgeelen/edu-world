import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Delete, Sparkles } from 'lucide-react';
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
}

const KEYS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

/**
 * Shared numpad component matching the ExerciseNumberBond dark-purple style.
 * Slides up from bottom as a bottom sheet.
 */
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
}: ExerciseNumpadProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 w-full h-[45vh] bg-[#1a103c]/95 backdrop-blur-xl px-3 pt-2 pb-3 md:p-6 rounded-t-[2rem] md:rounded-t-[3rem] border-t-4 border-[#3b2d71] shadow-[0_-15px_50px_rgba(0,0,0,0.6)] z-50 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full flex justify-center mb-1">
            <button
              onClick={onClose}
              className="w-16 h-1.5 bg-[#3b2d71] rounded-full hover:bg-[#4c3b82] transition-colors"
            />
          </div>

          <div className="max-w-md w-full mx-auto flex-1 flex flex-col gap-2 md:gap-4 min-h-0">
            <div className="grid grid-cols-3 grid-rows-3 gap-1.5 md:gap-4 flex-[3] min-h-0">
              {KEYS.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {row.map((num) => (
                    <button
                      key={num}
                      onClick={() => onNumberClick(num)}
                      className="relative rounded-xl md:rounded-2xl bg-[#2d1b54] border-b-[3px] md:border-b-[6px] border-[#1c1134] shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:bg-[#3b2d71] active:border-b-0 active:translate-y-[3px] md:active:translate-y-[6px] transition-all flex items-center justify-center group overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-xl md:rounded-t-2xl pointer-events-none" />
                      <span className="text-xl md:text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] group-active:scale-95 transition-transform">
                        {num}
                      </span>
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 md:gap-4 flex-1 min-h-0">
              <button
                onClick={onDelete}
                className="relative rounded-xl md:rounded-2xl bg-[#be123c] border-b-[3px] md:border-b-[6px] border-[#881337] shadow-[0_5px_15px_rgba(225,29,72,0.3)] hover:bg-[#e11d48] active:border-b-0 active:translate-y-[3px] md:active:translate-y-[6px] transition-all flex items-center justify-center group"
              >
                <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl md:rounded-t-2xl pointer-events-none" />
                <Delete className="w-5 h-5 md:w-10 md:h-10 text-white drop-shadow-md group-active:scale-90 transition-transform" />
              </button>

              <button
                onClick={() => onNumberClick('0')}
                className="relative rounded-xl md:rounded-2xl bg-[#2d1b54] border-b-[3px] md:border-b-[6px] border-[#1c1134] shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:bg-[#3b2d71] active:border-b-0 active:translate-y-[3px] md:active:translate-y-[6px] transition-all flex items-center justify-center group overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-xl md:rounded-t-2xl pointer-events-none" />
                <span className="text-xl md:text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] group-active:scale-95 transition-transform">
                  0
                </span>
              </button>

              {status === 'incorrect' && onTryAgain ? (
                <button
                  onClick={onTryAgain}
                  className="relative rounded-xl md:rounded-2xl bg-orange-500 border-b-[3px] md:border-b-[6px] border-orange-700 shadow-[0_5px_15px_rgba(249,115,22,0.4)] hover:bg-orange-400 active:border-b-0 active:translate-y-[3px] md:active:translate-y-[6px] transition-all flex items-center justify-center group"
                >
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-xl md:rounded-t-2xl pointer-events-none" />
                  <span className="text-xs md:text-2xl font-black text-white text-center leading-tight drop-shadow-md group-active:scale-95 transition-transform uppercase tracking-wider px-1">
                    Opnieuw
                  </span>
                </button>
              ) : (
                <button
                  onClick={onCheck}
                  disabled={checkDisabled}
                  className={cn(
                    'relative rounded-xl md:rounded-2xl border-b-[3px] md:border-b-[6px] transition-all flex items-center justify-center group',
                    !checkDisabled
                      ? 'bg-emerald-500 border-emerald-700 shadow-[0_5px_15px_rgba(16,185,129,0.4)] hover:bg-emerald-400 active:border-b-0 active:translate-y-[3px] md:active:translate-y-[6px]'
                      : 'bg-[#2d1b54] border-[#1c1134] opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-xl md:rounded-t-2xl pointer-events-none" />
                  <Check className={cn('w-7 h-7 md:w-14 md:h-14 drop-shadow-md transition-transform', !checkDisabled ? 'text-white group-active:scale-90' : 'text-white/30')} strokeWidth={4} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
