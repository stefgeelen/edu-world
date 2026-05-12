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
import { SUM_SPLIT_CONFIG, DEFAULT_SUM_SPLIT } from '@/data/difficultyConfig';
import { randomInt } from '@/lib/random';

type Slot = 'left' | 'right';
type SlotStatus = 'idle' | 'correct' | 'incorrect';

interface Question {
  num1: number;
  num2: number;
  total: number;
  leftPart: number; // = 10 - num1
  rightPart: number; // = num2 - leftPart
}

function generateQuestion(minSum: number, maxSum: number): Question {
  // num1 in 6..9, num2 chosen so num1+num2 between minSum..maxSum and num2 < 10
  // and leftPart (10-num1) >= 1 and rightPart >= 1.
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
  // Fallback
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
  const [leftStatus, setLeftStatus] = useState<SlotStatus>('idle');
  const [rightStatus, setRightStatus] = useState<SlotStatus>('idle');
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion(config.minSum, config.maxSum));
    setLeftValue('');
    setRightValue('');
    setLeftStatus('idle');
    setRightStatus('idle');
    setActiveSlot(null);
    setIsNumpadOpen(false);
  }, [config.minSum, config.maxSum]);

  const openSlot = (slot: Slot) => {
    if (leftStatus === 'correct' && rightStatus === 'correct') return;
    setActiveSlot(slot);
    setIsNumpadOpen(true);
    if (slot === 'left' && leftStatus === 'incorrect') {
      setLeftStatus('idle');
      setLeftValue('');
    }
    if (slot === 'right' && rightStatus === 'incorrect') {
      setRightStatus('idle');
      setRightValue('');
    }
  };

  const handleNumberClick = (num: number | string) => {
    if (!activeSlot) return;
    const setter = activeSlot === 'left' ? setLeftValue : setRightValue;
    const statusSetter = activeSlot === 'left' ? setLeftStatus : setRightStatus;
    statusSetter(s => (s === 'incorrect' ? 'idle' : s));
    setter(prev => {
      // If incorrect or correct (shouldn't reach here when correct), replace; else append
      if (prev.length >= 2) return prev;
      return prev + num.toString();
    });
  };

  const handleDelete = () => {
    if (!activeSlot) return;
    const setter = activeSlot === 'left' ? setLeftValue : setRightValue;
    const statusSetter = activeSlot === 'left' ? setLeftStatus : setRightStatus;
    setter(prev => prev.slice(0, -1));
    statusSetter(s => (s === 'incorrect' ? 'idle' : s));
  };

  const handleTryAgain = () => {
    if (!activeSlot) return;
    if (activeSlot === 'left') {
      setLeftValue('');
      setLeftStatus('idle');
    } else {
      setRightValue('');
      setRightStatus('idle');
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

  const handleCheck = () => {
    if (!activeSlot) return;
    const value = activeSlot === 'left' ? leftValue : rightValue;
    if (!value) return;

    const expected = activeSlot === 'left' ? question.leftPart : question.rightPart;
    const correct = parseInt(value, 10) === expected;

    if (correct) {
      if (activeSlot === 'left') {
        setLeftStatus('correct');
        // If right already correct (unlikely as we go left first), finish question
        if (rightStatus === 'correct') {
          completeQuestion();
        } else {
          // Move on to right slot
          setTimeout(() => {
            setActiveSlot('right');
            setIsNumpadOpen(true);
          }, 600);
        }
      } else {
        setRightStatus('correct');
        if (leftStatus === 'correct') {
          completeQuestion();
        } else {
          setTimeout(() => {
            setActiveSlot('left');
            setIsNumpadOpen(true);
          }, 600);
        }
      }
    } else {
      if (activeSlot === 'left') setLeftStatus('incorrect');
      else setRightStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        setTimeout(() => navigate(`/app/stage/fluisterbos/${stage}`), 1500);
      }
    }
  };

  const completeQuestion = () => {
    setIsNumpadOpen(false);
    correctCount.current += 1;
    triggerConfetti('large', { colors: ['#10b981', '#34d399', '#fcd34d'], originY: 0.6 });
    const newProgress = progress + 20;
    setProgress(newProgress);
    setTimeout(() => {
      if (!finishExerciseIfDone(newProgress)) {
        nextQuestion();
      }
    }, 1600);
  };

  // When numpad is closed and a slot still has wrong/incorrect status, leave as-is
  useEffect(() => {
    if (!isNumpadOpen) setActiveSlot(null);
  }, [isNumpadOpen]);

  const renderSlot = (slot: Slot) => {
    const value = slot === 'left' ? leftValue : rightValue;
    const status = slot === 'left' ? leftStatus : rightStatus;
    const isActive = activeSlot === slot && isNumpadOpen;

    return (
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          openSlot(slot);
        }}
        animate={
          status === 'incorrect' ? { x: [-5, 5, -4, 4, -2, 2, 0] } :
          status === 'correct' ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } :
          { scale: isActive && !value ? 1.05 : 1 }
        }
        transition={
          status === 'incorrect' ? { duration: 0.5, ease: 'easeInOut' } :
          status === 'correct' ? { duration: 0.5, ease: 'easeOut' } :
          { duration: 0.2 }
        }
        className={cn(
          'relative w-20 h-20 md:w-28 md:h-28 rounded-2xl flex items-center justify-center z-10 transition-all duration-300 transform-gpu cursor-pointer outline-none',
          status === 'correct' ? 'bg-emerald-400 border-b-[8px] border-emerald-600 ring-4 ring-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.8)]' :
          status === 'incorrect' ? 'bg-orange-500 border-b-[8px] border-orange-700 ring-4 ring-orange-300 shadow-[0_0_30px_rgba(249,115,22,0.6)]' :
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
        {value ? (
          <span className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">
            {value}
          </span>
        ) : (
          <span className={cn(
            'text-4xl md:text-5xl font-black text-[#a78bfa]/50 transition-colors',
            isActive && 'text-[#a78bfa]'
          )}>?</span>
        )}
      </motion.button>
    );
  };

  const activeStatus = activeSlot === 'left' ? leftStatus : activeSlot === 'right' ? rightStatus : 'idle';
  const activeValue = activeSlot === 'left' ? leftValue : activeSlot === 'right' ? rightValue : '';

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(`/app/stage/fluisterbos/${stage}`)}
      onClick={() => setIsNumpadOpen(false)}
    >
      <motion.div
        animate={{ y: isNumpadOpen ? -60 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex-1 flex flex-col items-center justify-center z-10 relative px-4 mt-8 md:mt-0 pb-12"
      >
        <div className="mb-8 text-center">
          <h2 className="text-xl md:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
            Splits om door 10 te springen!
          </h2>
        </div>

        {/* Sum statement */}
        <motion.div
          key={`${question.num1}-${question.num2}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1c1134]/60 backdrop-blur-sm rounded-[2rem] px-6 py-4 md:px-10 md:py-6 shadow-[0_15px_40px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71] mb-8"
        >
          <div className="text-5xl md:text-7xl font-black tracking-tight flex items-center gap-2 md:gap-4">
            <span className="text-cyan-400 drop-shadow-sm">{question.num1}</span>
            <span className="text-amber-400">+</span>
            <span className="text-emerald-400 drop-shadow-sm">{question.num2}</span>
            <span className="text-[#9d8bce]">=</span>
            <span className="text-[#a78bfa]">{question.total}</span>
          </div>
        </motion.div>

        {/* Split fork: from second number down to two slots */}
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
            {renderSlot('left')}
            {renderSlot('right')}
          </div>

          <AnimatePresence>
            {(leftStatus === 'incorrect' || rightStatus === 'incorrect') && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="mt-6 flex items-center gap-2 bg-orange-100/10 backdrop-blur-md px-4 py-2 rounded-full border border-orange-400/30 shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="text-sm font-bold text-orange-300 tracking-wide uppercase">Bijna!</span>
                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-sm md:text-base text-[#a78bfa] font-semibold max-w-xs">
            Hoeveel heb je nodig om eerst tot 10 te komen? En hoeveel blijft er over?
          </p>
        </div>
      </motion.div>

      <ExerciseNumpad
        isOpen={isNumpadOpen}
        onClose={() => setIsNumpadOpen(false)}
        inputValue={activeValue}
        onNumberClick={handleNumberClick}
        onDelete={handleDelete}
        onCheck={handleCheck}
        status={activeStatus}
        onTryAgain={handleTryAgain}
        checkDisabled={!activeValue}
      />
    </ExerciseShell>
  );
}
