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
import { NUMBER_BOND_CONFIG, DEFAULT_NUMBER_BOND } from '@/data/difficultyConfig';

type Status = 'idle' | 'incorrect' | 'correct';
type Side = 'left' | 'right';
/**
 * Vraagvarianten:
 * - 'target': klassieke splitsing — één kant getoond als bollen, andere kant invullen
 * - 'left'  : beide kanten als bollen + uitkomst zichtbaar; kind vult linker getal in
 * - 'right' : beide kanten als bollen + uitkomst zichtbaar; kind vult rechter getal in
 * - 'sum'   : beide kanten als bollen + beide getallen zichtbaar; kind vult uitkomst in
 */
type Mode = 'target' | 'left' | 'right' | 'sum';

interface Question {
  mode: Mode;
  target: number;
  leftCount: number;
  rightCount: number;
  /** Voor 'target' mode: welke kant is bekend (de andere is het antwoord). */
  knownSide: Side;
  answer: number;
}

const TOTAL_ROUNDS = 5;

/**
 * Splitsdoos (Split-Box) — een doos met tokens verdeeld door een neon scheidingslijn.
 * Het kind ziet hoeveel tokens aan één kant staan en moet invullen hoeveel er aan de
 * andere kant nodig zijn om samen het doelgetal te vormen.
 */
export function ExerciseSplitBox() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { key: difficultyKey } = useDifficultyLevel();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());

  const cfg = NUMBER_BOND_CONFIG[difficultyKey] ?? DEFAULT_NUMBER_BOND;

  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [question, setQuestion] = useState<Question>({
    mode: 'target',
    target: 8,
    leftCount: 5,
    rightCount: 3,
    knownSide: 'left',
    answer: 3,
  });

  const [inputValue, setInputValue] = useState('');
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const generateQuestion = useCallback(() => {
    const { minTarget, maxTarget } = cfg;
    const target = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;
    const leftCount = Math.floor(Math.random() * (target - 1)) + 1; // 1..target-1
    const rightCount = target - leftCount;

    const modes: Mode[] = ['target', 'left', 'right', 'sum'];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const knownSide: Side = Math.random() < 0.5 ? 'left' : 'right';

    let answer: number;
    if (mode === 'target' || mode === 'sum') answer = target;
    else if (mode === 'left') answer = leftCount;
    else answer = rightCount;

    // Voor 'target' mode bepaalt knownSide welke kant zichtbaar is; answer = andere kant.
    if (mode === 'target') {
      answer = knownSide === 'left' ? rightCount : leftCount;
    }

    setQuestion({ mode, target, leftCount, rightCount, knownSide, answer });
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

  const { mode, leftCount, rightCount, target } = question;
  // In 'target' mode toont één kant bollen, andere kant '?'. In andere modes tonen beide bollen.
  const showLeftTokens = mode !== 'target' || question.knownSide === 'left' || status === 'correct';
  const showRightTokens = mode !== 'target' || question.knownSide === 'right' || status === 'correct';
  const leftIsAnswerSide = mode === 'target' && question.knownSide === 'right';
  const rightIsAnswerSide = mode === 'target' && question.knownSide === 'left';

  const leftLabelIsInput = mode === 'left';
  const rightLabelIsInput = mode === 'right';
  const sumIsInput = mode === 'sum' || mode === 'target';

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
            {mode === 'target' ? (
              <>
                Maak samen{' '}
                <span className="inline-block px-3 py-1 mx-1 rounded-2xl bg-emerald-400 text-white border-b-[4px] border-emerald-600 shadow-lg">
                  {target}
                </span>
                !
              </>
            ) : (
              'Vul de som in!'
            )}
          </h2>
        </div>

        {/* Tray */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[640px] aspect-[2/1] rounded-[28px] md:rounded-[36px] bg-gradient-to-b from-[#3b2d71] to-[#2d1b54] border-b-[8px] md:border-b-[10px] border-[#1c1134] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1/4 bg-gradient-to-b from-white/15 to-transparent rounded-t-[28px] md:rounded-t-[36px] pointer-events-none" />

          <div className="absolute inset-3 md:inset-5 rounded-2xl md:rounded-3xl bg-[#1a103c]/70 shadow-[inset_0_6px_18px_rgba(0,0,0,0.6)] flex">
            <SplitHalf
              count={leftCount}
              showQuestion={!showLeftTokens}
              status={status}
              isAnswerSide={leftIsAnswerSide}
            />
            <SplitHalf
              count={rightCount}
              showQuestion={!showRightTokens}
              status={status}
              isAnswerSide={rightIsAnswerSide}
            />
          </div>

          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.1 }}
            className={cn(
              'absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-1.5 md:w-2 rounded-full origin-center transition-colors duration-500',
              status === 'correct'
                ? 'bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.9)]'
                : status === 'incorrect'
                ? 'bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.7)]'
                : 'bg-[#a78bfa] shadow-[0_0_18px_rgba(167,139,250,0.7)]'
            )}
          />
        </div>

        {/* Equation: left + right = sum */}
        <div className="mt-6 md:mt-8 w-full max-w-[640px] flex justify-center items-center gap-2 md:gap-4 flex-wrap">
          <NumberLabel
            value={leftLabelIsInput ? null : leftCount}
            isInput={leftLabelIsInput}
            inputValue={inputValue}
            status={status}
            isNumpadOpen={isNumpadOpen}
            onTap={openNumpad}
          />
          <div className="text-3xl md:text-4xl font-black text-[#a78bfa]/70 select-none">+</div>
          <NumberLabel
            value={rightLabelIsInput ? null : rightCount}
            isInput={rightLabelIsInput}
            inputValue={inputValue}
            status={status}
            isNumpadOpen={isNumpadOpen}
            onTap={openNumpad}
          />
          <div className="text-3xl md:text-4xl font-black text-[#a78bfa]/70 select-none">=</div>
          <NumberLabel
            value={sumIsInput ? null : target}
            isInput={sumIsInput}
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

interface SplitHalfProps {
  count: number;
  showQuestion: boolean;
  status: Status;
  isAnswerSide: boolean;
}

function SplitHalf({ count, showQuestion, status, isAnswerSide }: SplitHalfProps) {
  // Render up to `count` token spheres in a centered grid (max 10 per side → 2 rows × 5)
  const cols = Math.min(5, Math.max(1, Math.ceil(count / 2)));
  const tokens = Array.from({ length: count });

  if (showQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-6xl md:text-8xl font-black text-[#a78bfa]/60 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-pulse">
          ?
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-2 md:p-4">
      <div
        className="grid gap-1.5 md:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tokens.map((_, i) => (
          <motion.div
            key={i}
            initial={isAnswerSide && status === 'correct' ? { scale: 0 } : { scale: 1 }}
            animate={
              isAnswerSide && status === 'correct'
                ? { scale: [0, 1.25, 1] }
                : { scale: 1 }
            }
            transition={{
              delay: isAnswerSide && status === 'correct' ? i * 0.06 : 0,
              type: 'spring',
              damping: 12,
              stiffness: 280,
            }}
            className={cn(
              'relative w-7 h-7 md:w-10 md:h-10 rounded-full transition-all duration-300',
              'bg-gradient-to-br shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_-3px_4px_rgba(0,0,0,0.25)]',
              isAnswerSide && status === 'correct'
                ? 'from-emerald-300 to-emerald-500 ring-2 ring-emerald-200/60 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                : isAnswerSide
                ? 'from-purple-300 to-purple-500'
                : 'from-cyan-300 to-cyan-500',
              'hover:scale-110 hover:-translate-y-0.5'
            )}
          >
            {/* highlight */}
            <div className="absolute top-1 left-1.5 w-2 h-2 md:w-3 md:h-3 rounded-full bg-white/70 blur-[1px]" />
          </motion.div>
        ))}
      </div>
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
}

function NumberLabel({ value, isInput, inputValue, status, isNumpadOpen, onTap }: NumberLabelProps) {
  if (!isInput) {
    return (
      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-cyan-400 border-b-[6px] border-cyan-600 ring-4 ring-cyan-200/50 shadow-[0_10px_25px_rgba(0,0,0,0.4)] flex items-center justify-center">
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
