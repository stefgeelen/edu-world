import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExerciseNumpad } from '@/components/exercise/ExerciseNumpad';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { SUM_SPLIT_CONFIG, DEFAULT_SUM_SPLIT } from '@/data/difficultyConfig';
import { randomInt } from '@/lib/random';

type Slot = 'left' | 'right' | 'result';
type SlotStatus = 'idle' | 'correct' | 'incorrect';

interface Question {
  num1: number;
  num2: number;
  total: number;
  leftPart: number;
  rightPart: number;
}

function generateQuestion(minSum: number, maxSum: number): Question {
  for (let i = 0; i < 50; i++) {
    const num1 = randomInt(6, 9);
    const minN2 = Math.max(11 - num1, minSum - num1, 2);
    const maxN2 = Math.min(9, maxSum - num1);
    if (maxN2 < minN2) continue;
    const num2 = randomInt(minN2, maxN2);
    const leftPart = 10 - num1;
    const rightPart = num2 - leftPart;
    if (leftPart >= 1 && rightPart >= 1) {
      return { num1, num2, total: num1 + num2, leftPart, rightPart };
    }
  }
  return { num1: 8, num2: 6, total: 14, leftPart: 2, rightPart: 4 };
}

export function ExerciseSumSplit() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { key: difficultyKey, stage } = useDifficultyLevel();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());

  const config = SUM_SPLIT_CONFIG[difficultyKey] ?? DEFAULT_SUM_SPLIT;

  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [question, setQuestion] = useState<Question>(() =>
    generateQuestion(config.minSum, config.maxSum)
  );

  const [leftValue, setLeftValue] = useState('');
  const [rightValue, setRightValue] = useState('');
  const [resultValue, setResultValue] = useState('');
  const [leftStatus, setLeftStatus] = useState<SlotStatus>('idle');
  const [rightStatus, setRightStatus] = useState<SlotStatus>('idle');
  const [resultStatus, setResultStatus] = useState<SlotStatus>('idle');
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [numpadHeight, setNumpadHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Result slot only unlocks once both split values are filled
  const resultUnlocked = !!leftValue && !!rightValue;
  // Validate button activates once all three slots have a value
  const allFilled = !!leftValue && !!rightValue && !!resultValue;
  const hasAnyError = leftStatus === 'incorrect' || rightStatus === 'incorrect' || resultStatus === 'incorrect';

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion(config.minSum, config.maxSum));
    setLeftValue('');
    setRightValue('');
    setResultValue('');
    setLeftStatus('idle');
    setRightStatus('idle');
    setResultStatus('idle');
    setActiveSlot(null);
    setIsNumpadOpen(false);
  }, [config.minSum, config.maxSum]);

  useEffect(() => {
    if (!isNumpadOpen || !scrollRef.current) return;
    const el = scrollRef.current;
    // Result slot is near the top — scroll up. Split slots are lower — scroll down.
    const target = activeSlot === 'result' ? 0 : el.scrollHeight;
    const timer = setTimeout(() => el.scrollTo({ top: target, behavior: 'smooth' }), 50);
    return () => clearTimeout(timer);
  }, [isNumpadOpen, activeSlot]);

  const openSlot = (slot: Slot) => {
    if (slot === 'result' && !resultUnlocked) return;
    if (slot === 'left' && leftStatus === 'correct') return;
    if (slot === 'right' && rightStatus === 'correct') return;
    if (slot === 'result' && resultStatus === 'correct') return;
    // Clear incorrect status when reopening
    if (slot === 'left' && leftStatus === 'incorrect') setLeftStatus('idle');
    if (slot === 'right' && rightStatus === 'incorrect') setRightStatus('idle');
    if (slot === 'result' && resultStatus === 'incorrect') setResultStatus('idle');
    setActiveSlot(slot);
    setIsNumpadOpen(true);
  };

  const handleNumberClick = (num: number | string) => {
    if (!activeSlot) return;
    if (activeSlot === 'left') {
      setLeftValue(prev => prev.length >= 2 ? prev : prev + num.toString());
    } else if (activeSlot === 'right') {
      setRightValue(prev => prev.length >= 2 ? prev : prev + num.toString());
    } else {
      setResultValue(prev => prev.length >= 2 ? prev : prev + num.toString());
    }
  };

  const handleDelete = () => {
    if (!activeSlot) return;
    if (activeSlot === 'left') setLeftValue(prev => prev.slice(0, -1));
    else if (activeSlot === 'right') setRightValue(prev => prev.slice(0, -1));
    else setResultValue(prev => prev.slice(0, -1));
  };

  // Numpad ✓ just confirms the slot and auto-advances to the next empty one
  const handleNumpadConfirm = () => {
    if (!activeSlot) return;
    const nextEmpty = activeSlot === 'left'
      ? (!rightValue ? 'right' : (resultUnlocked && !resultValue ? 'result' : null))
      : activeSlot === 'right'
      ? (resultUnlocked && !resultValue ? 'result' : (!leftValue ? 'left' : null))
      : null;

    if (nextEmpty) {
      setActiveSlot(nextEmpty);
      // Keep numpad open, just switch slot
    } else {
      setIsNumpadOpen(false);
      setActiveSlot(null);
    }
  };

  const finishExerciseIfDone = (newProgress: number) => {
    if (newProgress >= 100) {
      if (exerciseId) {
        const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
        completeExercise.mutate({
          exerciseId,
          score: correctCount.current,
          maxScore: 5,
          stars: lives === 3 ? 3 : lives === 2 ? 2 : 1,
          timeSpent,
        });
      }
      navigate(`/app/stage/fluisterbos/${stage}`);
      return true;
    }
    return false;
  };

  const completeQuestion = () => {
    setIsNumpadOpen(false);
    correctCount.current += 1;
    triggerConfetti('large', { colors: ['#10b981', '#34d399', '#fcd34d'], originY: 0.6 });
    const newProgress = progress + 20;
    setProgress(newProgress);
    setTimeout(() => {
      if (!finishExerciseIfDone(newProgress)) nextQuestion();
    }, 1600);
  };

  // On-screen validate button: checks all three slots at once
  const handleValidateAll = () => {
    if (!allFilled) return;
    setIsNumpadOpen(false);

    const leftCorrect = parseInt(leftValue, 10) === question.leftPart;
    const rightCorrect = parseInt(rightValue, 10) === question.rightPart;
    const resultCorrect = parseInt(resultValue, 10) === question.total;

    setLeftStatus(leftCorrect ? 'correct' : 'incorrect');
    setRightStatus(rightCorrect ? 'correct' : 'incorrect');
    setResultStatus(resultCorrect ? 'correct' : 'incorrect');

    if (leftCorrect && rightCorrect && resultCorrect) {
      setTimeout(() => completeQuestion(), 700);
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        setTimeout(() => navigate(`/app/stage/fluisterbos/${stage}`), 1500);
      }
    }
  };

  const renderSplitSlot = (slot: 'left' | 'right') => {
    const value = slot === 'left' ? leftValue : rightValue;
    const status = slot === 'left' ? leftStatus : rightStatus;
    const isActive = activeSlot === slot && isNumpadOpen;

    return (
      <motion.button
        onClick={(e) => { e.stopPropagation(); openSlot(slot); }}
        animate={
          status === 'incorrect' ? { x: [-5, 5, -4, 4, -2, 2, 0] } :
          status === 'correct' ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } :
          { scale: isActive && !value ? 1.05 : 1 }
        }
        transition={
          status === 'incorrect' ? { duration: 0.5 } :
          status === 'correct' ? { duration: 0.5 } :
          { duration: 0.2 }
        }
        className={cn(
          'relative w-20 h-20 md:w-28 md:h-28 rounded-2xl flex items-center justify-center z-10 transition-all duration-300 transform-gpu cursor-pointer outline-none',
          status === 'correct' ? 'bg-emerald-400 border-b-[8px] border-emerald-600 ring-4 ring-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.8)]' :
          status === 'incorrect' ? 'bg-orange-500 border-b-[8px] border-orange-700 ring-4 ring-orange-300 shadow-[0_0_30px_rgba(249,115,22,0.6)]' :
          isActive ? 'bg-purple-500 border-b-[8px] border-purple-700 ring-4 ring-purple-300 shadow-xl' :
          value ? 'bg-purple-500 border-b-[8px] border-purple-700 ring-4 ring-purple-300 shadow-xl' :
          'bg-[#2d1b54]/40 border-4 border-dashed border-[#a78bfa] hover:bg-[#3b2d71]/60 shadow-inner'
        )}
      >
        {(value || status !== 'idle') && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        )}
        {!value && status === 'idle' && !isActive && (
          <div className="absolute inset-0 rounded-2xl border-4 border-white/20 animate-ping pointer-events-none" />
        )}
        <span className={cn(
          'text-4xl md:text-5xl font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]',
          value ? 'text-white' : isActive ? 'text-[#a78bfa]' : 'text-[#a78bfa]/50'
        )}>
          {value || '?'}
        </span>
      </motion.button>
    );
  };

  const renderResultSlot = () => {
    const isActive = activeSlot === 'result' && isNumpadOpen;
    const locked = !resultUnlocked;

    return (
      <motion.button
        onClick={(e) => { e.stopPropagation(); openSlot('result'); }}
        animate={
          resultStatus === 'incorrect' ? { x: [-5, 5, -4, 4, -2, 2, 0] } :
          resultStatus === 'correct' ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } :
          { scale: isActive && !resultValue ? 1.05 : 1 }
        }
        transition={
          resultStatus === 'incorrect' ? { duration: 0.5 } :
          resultStatus === 'correct' ? { duration: 0.5 } :
          { duration: 0.2 }
        }
        disabled={locked}
        className={cn(
          'relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 transform-gpu outline-none',
          locked
            ? 'bg-[#1c1134]/40 border-4 border-dashed border-[#4c3b82]/50 opacity-50 cursor-not-allowed'
            : resultStatus === 'correct'
              ? 'bg-emerald-400 border-b-[6px] border-emerald-600 ring-4 ring-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.8)] cursor-pointer'
            : resultStatus === 'incorrect'
              ? 'bg-orange-500 border-b-[6px] border-orange-700 ring-4 ring-orange-300 cursor-pointer'
            : isActive || resultValue
              ? 'bg-amber-500 border-b-[6px] border-amber-700 ring-4 ring-amber-300 shadow-xl cursor-pointer'
              : 'bg-[#2d1b54]/60 border-4 border-dashed border-amber-400/70 hover:bg-[#3b2d71]/80 shadow-inner cursor-pointer'
        )}
      >
        {!locked && (resultValue || resultStatus !== 'idle') && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        )}
        {!locked && !resultValue && resultStatus === 'idle' && !isActive && (
          <div className="absolute inset-0 rounded-2xl border-4 border-white/20 animate-ping pointer-events-none" />
        )}
        <span className={cn(
          'text-2xl md:text-3xl font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]',
          locked ? 'text-[#4c3b82]/60' :
          resultValue ? 'text-white' :
          isActive ? 'text-amber-400' : 'text-amber-400/60'
        )}>
          {locked ? '?' : (resultValue || '?')}
        </span>
      </motion.button>
    );
  };

  const activeValue = activeSlot === 'left' ? leftValue
    : activeSlot === 'right' ? rightValue
    : activeSlot === 'result' ? resultValue
    : '';

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(`/app/stage/fluisterbos/${stage}`)}
      onClick={() => setIsNumpadOpen(false)}
    >
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
      <div
        className="min-h-full flex flex-col items-center justify-center z-10 relative px-4 mt-8 md:mt-0"
        style={{ paddingBottom: isNumpadOpen ? numpadHeight + 16 : 16 }}
      >
        <div className="mb-6 text-center">
          <h2 className="text-xl md:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
            Splits om door 10 te springen!
          </h2>
        </div>

        {/* Equation with result slot */}
        <motion.div
          key={`${question.num1}-${question.num2}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1c1134]/60 backdrop-blur-sm rounded-[2rem] px-6 py-4 md:px-10 md:py-6 shadow-[0_15px_40px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71] mb-6"
        >
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-5xl md:text-7xl font-black text-cyan-400 drop-shadow-sm">{question.num1}</span>
            <span className="text-5xl md:text-7xl font-black text-amber-400">+</span>
            <span className="text-5xl md:text-7xl font-black text-emerald-400 drop-shadow-sm">{question.num2}</span>
            <span className="text-5xl md:text-7xl font-black text-[#9d8bce]">=</span>
            {renderResultSlot()}
          </div>
        </motion.div>

        {/* Split fork */}
        <div className="relative w-full max-w-[280px] md:max-w-[360px] flex flex-col items-center">
          <svg className="w-full h-20 md:h-28 pointer-events-none" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path
              d="M 50 0 Q 30 20, 20 38"
              fill="none"
              stroke={leftStatus === 'correct' ? '#10b981' : leftStatus === 'incorrect' ? '#f97316' : '#4c3b82'}
              strokeWidth="4"
              strokeLinecap="round"
              className="transition-colors duration-500"
            />
            <path
              d="M 50 0 Q 70 20, 80 38"
              fill="none"
              stroke={rightStatus === 'correct' ? '#10b981' : rightStatus === 'incorrect' ? '#f97316' : '#4c3b82'}
              strokeWidth="4"
              strokeLinecap="round"
              className="transition-colors duration-500"
            />
          </svg>

          <div className="w-full flex justify-between px-2 -mt-2">
            {renderSplitSlot('left')}
            {renderSplitSlot('right')}
          </div>

          <AnimatePresence>
            {hasAnyError && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="mt-4 flex items-center gap-2 bg-orange-100/10 backdrop-blur-md px-4 py-2 rounded-full border border-orange-400/30 shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="text-sm font-bold text-orange-300 tracking-wide uppercase">Bijna! Probeer opnieuw.</span>
                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Validate button */}
        <motion.button
          onClick={handleValidateAll}
          disabled={!allFilled}
          animate={allFilled && !hasAnyError ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'mt-8 flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg md:text-xl transition-all duration-300 shadow-xl',
            allFilled
              ? 'bg-emerald-500 border-b-[6px] border-emerald-700 text-white hover:bg-emerald-400 active:border-b-0 active:translate-y-1 shadow-[0_6px_20px_rgba(16,185,129,0.5)]'
              : 'bg-[#2d1b54] border-b-[6px] border-[#1c1134] text-[#6b5ca5] cursor-not-allowed opacity-50'
          )}
        >
          <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" />
          Controleer!
        </motion.button>
      </div>
      </div>

      <ExerciseNumpad
        isOpen={isNumpadOpen}
        onClose={() => { setIsNumpadOpen(false); setActiveSlot(null); }}
        inputValue={activeValue}
        onNumberClick={handleNumberClick}
        onDelete={handleDelete}
        onCheck={handleNumpadConfirm}
        status="idle"
        checkDisabled={!activeValue}
        onHeightChange={setNumpadHeight}
      />
    </ExerciseShell>
  );
}
