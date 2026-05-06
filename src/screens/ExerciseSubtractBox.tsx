import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExerciseNumpad } from '@/components/exercise/ExerciseNumpad';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { SUBTRACT_BOX_CONFIG, DEFAULT_SUBTRACT_BOX } from '@/data/difficultyConfig';

type Status = 'idle' | 'incorrect' | 'correct';
/**
 * Vraagvarianten:
 * - 'result'    : klassiek aftrekken — totaal en aftrekker zichtbaar; kind vult uitkomst in (5 - 3 = ?)
 * - 'subtrahend': totaal en uitkomst zichtbaar; kind vult de aftrekker in (6 - ? = 2)
 */
type Mode = 'result' | 'subtrahend';

interface Question {
  mode: Mode;
  total: number;       // minuend
  subtract: number;    // subtrahend (aantal doorgestreept)
  result: number;      // total - subtract
  answer: number;
}

const TOTAL_ROUNDS = 5;

/**
 * Aftrekdoos — een doos met tokens waarvan een aantal is doorgestreept (afgetrokken).
 * Kind vult het ontbrekende getal in via het gedeelde numpad. Zelfde visuele taal als
 * de Splitsdoos, maar zonder verticale scheidingslijn.
 */
export function ExerciseSubtractBox() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { key: difficultyKey } = useDifficultyLevel();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());

  const cfg = SUBTRACT_BOX_CONFIG[difficultyKey] ?? DEFAULT_SUBTRACT_BOX;

  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [question, setQuestion] = useState<Question>({
    mode: 'result',
    total: 5,
    subtract: 2,
    result: 3,
    answer: 3,
  });

  const [inputValue, setInputValue] = useState('');
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const generateQuestion = useCallback(() => {
    const minTotal = 2;
    const maxTotal = Math.max(minTotal, cfg.maxTotal);
    const total = Math.floor(Math.random() * (maxTotal - minTotal + 1)) + minTotal;
    const subtract = Math.floor(Math.random() * (total - 1)) + 1; // 1..total-1
    const result = total - subtract;

    // 70% kans op 'result' mode (meest natuurlijk), 30% op 'subtrahend' mode
    const mode: Mode = Math.random() < 0.7 ? 'result' : 'subtrahend';
    const answer = mode === 'result' ? result : subtract;

    setQuestion({ mode, total, subtract, result, answer });
    setInputValue('');
    setStatus('idle');
    setIsNumpadOpen(false);
  }, [cfg]);

  useEffect(() => {
    generateQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNumberClick = (num: number | string) => {
    if (status === 'incorrect') {
      setStatus('idle');
      setInputValue(num.toString());
    } else {
      setInputValue((prev) => (prev.length < 2 ? prev + num : prev));
    }
  };

  const handleCheck = () => {
    if (!inputValue) return;

    if (parseInt(inputValue, 10) === question.answer) {
      setStatus('correct');
      setIsNumpadOpen(false);
      const newProgress = progress + 100 / TOTAL_ROUNDS;
      setProgress(newProgress);
      correctCount.current += 1;

      triggerConfetti('large', { colors: ['#10b981', '#a78bfa', '#34d399'], originY: 0.6 });

      setTimeout(() => {
        if (newProgress >= 100) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({
              exerciseId,
              score: correctCount.current,
              maxScore: TOTAL_ROUNDS,
              stars: lives === 3 ? 3 : lives === 2 ? 2 : 1,
              timeSpent,
            });
          }
          navigate('/app/map');
        } else {
          generateQuestion();
        }
      }, 1800);
    } else {
      setStatus('incorrect');
      setLives((l) => l - 1);
      if (lives - 1 <= 0) {
        setTimeout(() => navigate('/app/map'), 1500);
      }
    }
  };

  const handleTryAgain = () => {
    setInputValue('');
    setStatus('idle');
  };

  // Keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        setInputValue((prev) => prev.slice(0, -1));
        if (status === 'incorrect') setStatus('idle');
      } else if (e.key === 'Enter') {
        handleCheck();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, status, question]);

  const { mode, total, subtract, result } = question;

  const totalIsInput = false; // totaal is altijd zichtbaar
  const subtractIsInput = mode === 'subtrahend';
  const resultIsInput = mode === 'result';

  const openNumpad = () => {
    setIsNumpadOpen(true);
    if (status === 'incorrect') {
      setStatus('idle');
      setInputValue('');
    }
  };

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/map')}
      onClick={() => setIsNumpadOpen(false)}
    >
      <motion.div
        animate={{ y: isNumpadOpen ? -40 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex-1 flex flex-col items-center justify-center z-10 relative px-4 mt-6 md:mt-0 pb-12"
      >
        <div className="mb-6 md:mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
            Streep weg en tel hoeveel er over zijn!
          </h2>
        </div>

        {/* Tray (zonder scheidingslijn) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[640px] aspect-[2/1] rounded-[28px] md:rounded-[36px] bg-gradient-to-b from-[#3b2d71] to-[#2d1b54] border-b-[8px] md:border-b-[10px] border-[#1c1134] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1/4 bg-gradient-to-b from-white/15 to-transparent rounded-t-[28px] md:rounded-t-[36px] pointer-events-none" />

          <div className="absolute inset-3 md:inset-5 rounded-2xl md:rounded-3xl bg-[#1a103c]/70 shadow-[inset_0_6px_18px_rgba(0,0,0,0.6)] flex items-center justify-center p-3 md:p-5">
            <TokenGrid total={total} crossedOut={subtract} status={status} />
          </div>
        </div>

        {/* Equation: total − subtract = result */}
        <div className="mt-6 md:mt-8 w-full max-w-[640px] flex justify-center items-center gap-2 md:gap-4 flex-wrap">
          <NumberLabel
            value={total}
            isInput={totalIsInput}
            inputValue={inputValue}
            status={status}
            isNumpadOpen={isNumpadOpen}
            onTap={openNumpad}
          />
          <div className="text-3xl md:text-4xl font-black text-[#a78bfa]/70 select-none">−</div>
          <NumberLabel
            value={subtractIsInput ? null : subtract}
            isInput={subtractIsInput}
            inputValue={inputValue}
            status={status}
            isNumpadOpen={isNumpadOpen}
            onTap={openNumpad}
            tone="orange"
          />
          <div className="text-3xl md:text-4xl font-black text-[#a78bfa]/70 select-none">=</div>
          <NumberLabel
            value={resultIsInput ? null : result}
            isInput={resultIsInput}
            inputValue={inputValue}
            status={status}
            isNumpadOpen={isNumpadOpen}
            onTap={openNumpad}
            tone="emerald"
          />
        </div>
      </motion.div>

      <ExerciseNumpad
        isOpen={isNumpadOpen}
        onClose={() => setIsNumpadOpen(false)}
        inputValue={inputValue}
        onNumberClick={handleNumberClick}
        onDelete={() => {
          setInputValue((prev) => prev.slice(0, -1));
          if (status === 'incorrect') setStatus('idle');
        }}
        onCheck={handleCheck}
        status={status}
        onTryAgain={handleTryAgain}
        checkDisabled={!inputValue}
      />
    </ExerciseShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

interface TokenGridProps {
  total: number;
  crossedOut: number;
  status: Status;
}

function TokenGrid({ total, crossedOut, status }: TokenGridProps) {
  // Kies kolommen op basis van totaal: tot 6 → 3 cols (2 rijen), tot 10 → 5 cols, daarboven → 5 cols
  const cols = total <= 6 ? Math.min(3, total) : 5;
  const tokens = Array.from({ length: total });

  return (
    <div
      className="grid gap-2 md:gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {tokens.map((_, i) => {
        const isCrossed = i < crossedOut;
        // Bij correct antwoord: doorgestreepte tokens faden weg, overblijvende lichten groen op
        const showCrossed = status !== 'correct';
        return (
          <div key={i} className="relative w-9 h-9 md:w-12 md:h-12">
            <AnimatePresence>
              {(!isCrossed || showCrossed) && (
                <motion.div
                  initial={{ scale: 1 }}
                  animate={
                    !isCrossed && status === 'correct'
                      ? { scale: [1, 1.25, 1] }
                      : { scale: 1, opacity: isCrossed ? 0.55 : 1 }
                  }
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    delay: !isCrossed && status === 'correct' ? i * 0.06 : 0,
                    type: 'spring',
                    damping: 12,
                    stiffness: 280,
                  }}
                  className={cn(
                    'absolute inset-0 rounded-full bg-gradient-to-br shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_-3px_4px_rgba(0,0,0,0.25)]',
                    !isCrossed && status === 'correct'
                      ? 'from-emerald-300 to-emerald-500 ring-2 ring-emerald-200/60 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                      : 'from-cyan-300 to-cyan-500'
                  )}
                >
                  {/* highlight */}
                  <div className="absolute top-1 left-1.5 w-2 h-2 md:w-3 md:h-3 rounded-full bg-white/70 blur-[1px]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Doorstreep diagonale lijn — alleen tonen zolang status !== 'correct' */}
            {isCrossed && status !== 'correct' && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
                className="absolute top-1/2 left-[-10%] w-[120%] h-[3px] md:h-[4px] bg-white rounded-full origin-left -rotate-45 shadow-[0_0_4px_rgba(255,255,255,0.6)] pointer-events-none"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface NumberLabelProps {
  value: number | null;
  isInput: boolean;
  inputValue: string;
  status: Status;
  isNumpadOpen: boolean;
  onTap: () => void;
  tone?: 'cyan' | 'emerald' | 'orange';
}

function NumberLabel({ value, isInput, inputValue, status, isNumpadOpen, onTap, tone = 'cyan' }: NumberLabelProps) {
  if (!isInput) {
    const toneClasses =
      tone === 'emerald'
        ? 'bg-emerald-400 border-emerald-600 ring-emerald-200/50'
        : tone === 'orange'
        ? 'bg-orange-400 border-orange-600 ring-orange-200/50'
        : 'bg-cyan-400 border-cyan-600 ring-cyan-200/50';
    return (
      <div className={cn(
        'relative w-20 h-20 md:w-24 md:h-24 rounded-2xl border-b-[6px] ring-4 shadow-[0_10px_25px_rgba(0,0,0,0.4)] flex items-center justify-center',
        toneClasses,
      )}>
        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none" />
        <span className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)]">
          {value}
        </span>
      </div>
    );
  }

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      animate={
        status === 'incorrect'
          ? { x: [-5, 5, -4, 4, -2, 2, 0] }
          : status === 'correct'
          ? { scale: [1, 1.15, 1] }
          : { scale: 1 }
      }
      transition={{ duration: 0.4 }}
      className={cn(
        'relative w-20 h-20 md:w-24 md:h-24 min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center transition-all duration-300 outline-none active:scale-[0.95]',
        status === 'correct'
          ? 'bg-emerald-400 border-b-[6px] border-emerald-600 ring-4 ring-emerald-200/60 shadow-[0_0_30px_rgba(16,185,129,0.8)]'
          : status === 'incorrect'
          ? 'bg-orange-500 border-b-[6px] border-orange-700 ring-4 ring-orange-300/60 shadow-[0_0_30px_rgba(249,115,22,0.6)]'
          : inputValue
          ? 'bg-purple-500 border-b-[6px] border-purple-700 ring-4 ring-purple-300/60 shadow-xl'
          : 'bg-[#2d1b54]/40 border-4 border-dashed border-[#a78bfa] hover:bg-[#3b2d71]/60 shadow-inner'
      )}
    >
      {(inputValue || status !== 'idle') && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
      )}
      {!inputValue && status === 'idle' && !isNumpadOpen && (
        <div className="absolute inset-0 rounded-2xl border-4 border-white/20 animate-pulse pointer-events-none" />
      )}

      {inputValue ? (
        <span className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)]">
          {inputValue}
        </span>
      ) : (
        <span
          className={cn(
            'text-4xl md:text-5xl font-black transition-colors',
            isNumpadOpen ? 'text-[#a78bfa]' : 'text-[#a78bfa]/60'
          )}
        >
          ?
        </span>
      )}

      <AnimatePresence>
        {status === 'incorrect' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="absolute -bottom-12 whitespace-nowrap flex items-center gap-2 bg-orange-100/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-orange-400/30 shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span className="text-xs font-bold text-orange-300 tracking-wide uppercase">Bijna!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
