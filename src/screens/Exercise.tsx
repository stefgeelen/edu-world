import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { MATH_SUMS_CONFIG, DEFAULT_MATH_SUMS, type MathSumsConfig } from '@/data/difficultyConfig';

function generateMathQuestion(config: MathSumsConfig) {
  const { operators, maxNumber, allowNegative, maxDivisor } = config;
  const op = operators[Math.floor(Math.random() * operators.length)];

  let num1: number, num2: number, ans: number;

  if (op === '÷') {
    // Generate clean division: num2 * quotient = num1
    const divisor = Math.floor(Math.random() * (maxDivisor || 10)) + 1;
    const quotient = Math.floor(Math.random() * 10) + 1;
    num1 = divisor * quotient;
    num2 = divisor;
    ans = quotient;
  } else if (op === '×') {
    num1 = Math.floor(Math.random() * Math.min(maxNumber, 12)) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    ans = num1 * num2;
  } else if (op === '-') {
    if (!allowNegative) {
      // Ensure num1 >= num2 so answer >= 0
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
    } else {
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * maxNumber) + 1;
    }
    ans = num1 - num2;
  } else {
    // Addition
    num1 = Math.floor(Math.random() * maxNumber) + 1;
    num2 = Math.floor(Math.random() * (maxNumber - num1)) + 1;
    ans = num1 + num2;
  }

  // Generate 4 unique options including the answer
  const options = new Set([ans]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const candidate = ans + offset;
    if (candidate !== ans && (!allowNegative ? candidate >= 0 : true)) {
      options.add(candidate);
    }
  }

  return {
    question: { num1, num2, operator: op, answer: ans },
    options: Array.from(options).sort(() => Math.random() - 0.5),
  };
}

export function Exercise() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedAvatar } = useGame();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { key: difficultyKey } = useDifficultyLevel();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());

  const config = MATH_SUMS_CONFIG[difficultyKey] ?? DEFAULT_MATH_SUMS;

  const [question, setQuestion] = useState({ num1: 5, num2: 4, operator: '+', answer: 9 });
  const [options, setOptions] = useState([7, 9, 11, 8]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);

  const regenerate = useCallback(() => {
    const { question: q, options: o } = generateMathQuestion(config);
    setQuestion(q);
    setOptions(o);
    setSelectedOption(null);
    setStatus('idle');
  }, [config]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const handleSelect = (option: number) => {
    if (status !== 'idle') return;
    
    setSelectedOption(option);
    if (option === question.answer) {
      setStatus('correct');
      setProgress(p => p + 20);
      correctCount.current += 1;
      triggerConfetti('small', { colors: ['#3b82f6', '#14b8a6', '#f59e0b'], originY: 0.6 });
      
      setTimeout(() => {
        if (progress + 20 >= 100) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: 5, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
          }
          navigate('/app/dashboard');
        } else {
          regenerate();
        }
      }, 1500);
      
    } else {
      setStatus('incorrect');
      setLives(l => l - 1);
      
      setTimeout(() => {
        if (lives - 1 <= 0) {
          navigate('/app/dashboard');
        } else {
          setSelectedOption(null);
          setStatus('idle');
        }
      }, 1500);
    }
  };

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/map')}
    >
      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 md:px-12 lg:px-16 justify-center max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full z-10 relative mt-8 md:mt-12">
        
        {/* Math Problem */}
        <motion.div 
          key={`${question.num1}${question.operator}${question.num2}`}
          initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="bg-[#1c1134]/60 backdrop-blur-sm rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 lg:p-16 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71] flex items-center justify-center min-h-[200px] md:min-h-[280px] lg:min-h-[320px] mb-8 md:mb-12 relative overflow-hidden"
        >
          <h2 className="text-6xl md:text-8xl lg:text-9xl xl:text-[10rem] font-black text-white tracking-tight flex items-center gap-3 md:gap-6">
            <span className="text-cyan-400 drop-shadow-sm">{question.num1}</span>
            <span className="text-amber-400">{question.operator}</span>
            <span className="text-emerald-400 drop-shadow-sm">{question.num2}</span>
            <span className="text-[#9d8bce]">=</span>
            <span className="text-[#a78bfa] border-b-4 md:border-b-8 border-dashed border-[#3b2d71] w-20 md:w-32 lg:w-40 text-center">
              ?
            </span>
          </h2>
        </motion.div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {options.map((option, i) => {
            const isSelected = selectedOption === option;
            const isCorrect = status === 'correct' && isSelected;
            const isWrong = status === 'incorrect' && isSelected;
            const COLORS = [
              'from-blue-500 to-blue-600 border-blue-700',
              'from-violet-500 to-violet-600 border-violet-700',
              'from-teal-500 to-teal-600 border-teal-700',
              'from-rose-500 to-rose-600 border-rose-700',
            ];
            return (
              <motion.button
                key={i}
                whileHover={{ scale: status === 'idle' ? 1.06 : 1 }}
                whileTap={{ scale: status === 'idle' ? 0.95 : 1 }}
                onClick={() => handleSelect(option)}
                disabled={status !== 'idle'}
                className={cn(
                  "relative h-24 md:h-28 lg:h-32 rounded-3xl text-4xl md:text-5xl lg:text-6xl font-black transition-all duration-200 flex items-center justify-center overflow-hidden shadow-lg border-b-[6px]",
                  isCorrect
                    ? "bg-gradient-to-br from-green-400 to-emerald-600 border-green-700 text-white scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                    : isWrong
                    ? "bg-gradient-to-br from-rose-500 to-red-700 border-red-800 text-white shadow-[0_0_30px_rgba(225,29,72,0.5)]"
                    : `bg-gradient-to-br ${COLORS[i]} text-white`,
                  status === 'idle' && "hover:-translate-y-1 hover:border-b-[8px] hover:shadow-xl active:translate-y-0 active:border-b-[4px]",
                )}
              >
                <div className="absolute inset-x-0 top-0 h-1/3 bg-white/20 rounded-t-3xl pointer-events-none" />
                <span className="relative z-10 drop-shadow-sm">{option}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Avatar Feedback */}
      <AnimatePresence>
        <motion.div 
          initial={{ y: 150, x: -50, rotate: -20 }}
          animate={{ y: 0, x: 0, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
          className="absolute -bottom-10 -left-10 md:-bottom-12 md:-left-12 z-20 pointer-events-none"
        >
          <div className="relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute -top-12 left-24 md:-top-16 md:left-32 bg-[#1c1134]/80 backdrop-blur-md px-5 py-3 md:px-6 md:py-4 rounded-2xl rounded-bl-none shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71] w-48 md:w-56"
            >
              <p className="text-sm md:text-base font-bold text-white/90">
                {status === 'idle' && "Jij kan dit!"}
                {status === 'correct' && <span className="text-emerald-400">Goed gedaan! +10 XP</span>}
                {status === 'incorrect' && <span className="text-orange-400">Oeps! Probeer opnieuw!</span>}
              </p>
            </motion.div>
            
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-8 border-[#3b2d71] shadow-2xl overflow-hidden bg-[#1c1134]/50 backdrop-blur-md">
              {selectedAvatar ? (
                <img 
                  src={selectedAvatar.imageUrlHead}
                  alt="avatar"
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500",
                    status === 'correct' && "scale-110",
                    status === 'incorrect' && "grayscale opacity-80"
                  )} 
                />
              ) : (
                <div className="w-full h-full bg-[#2d1b54] flex items-center justify-center">
                  <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-[#9d8bce]" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      <div className="h-32 pointer-events-none" />
    </ExerciseShell>
  );
}
