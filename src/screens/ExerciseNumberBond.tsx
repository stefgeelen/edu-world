import React, { useState, useEffect, useRef } from 'react';
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


export function ExerciseNumberBond() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { key: difficultyKey, stage } = useDifficultyLevel();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());

  const bondConfig = NUMBER_BOND_CONFIG[difficultyKey] ?? DEFAULT_NUMBER_BOND;

  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [question, setQuestion] = useState({ target: 8, known: 3, answer: 5 });

  const [inputValue, setInputValue] = useState("");
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'incorrect' | 'correct'>('idle');
  const [numpadHeight, setNumpadHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generateQuestion = () => {
    const { minTarget, maxTarget } = bondConfig;
    const target = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;
    const known = Math.floor(Math.random() * (target - 1)) + 1; 
    setQuestion({ target, known, answer: target - known });
    setInputValue("");
    setStatus('idle');
    setIsNumpadOpen(false);
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  useEffect(() => {
    if (!isNumpadOpen || !scrollRef.current) return;
    const el = scrollRef.current;
    const timer = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 50);
    return () => clearTimeout(timer);
  }, [isNumpadOpen]);

  const handleNumberClick = (num: number | string) => {
    if (status === 'incorrect') {
      setStatus('idle');
      setInputValue(num.toString());
    } else {
      setInputValue(prev => prev.length < 2 ? prev + num : prev);
    }
  };

  const handleCheck = () => {
    if (!inputValue) return;
    
    if (parseInt(inputValue) === question.answer) {
      setStatus('correct');
      setIsNumpadOpen(false);
      setProgress(p => p + 20);
      correctCount.current += 1;
      // XP handled by complete_exercise RPC
      
      triggerConfetti('large', { colors: ['#10b981', '#34d399', '#fcd34d'], originY: 0.6 });
      
      setTimeout(() => {
        if (progress + 20 >= 100) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: 5, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
          }
          navigate(`/app/stage/fluisterbos/${stage}`);
        } else {
          generateQuestion();
        }
      }, 2000);
    } else {
      setStatus('incorrect');
      setLives(l => l - 1);
      if (lives - 1 <= 0) {
        setTimeout(() => navigate(`/app/stage/fluisterbos/${stage}`), 1500);
      }
    }
  };

  const handleTryAgain = () => {
    setInputValue("");
    setStatus('idle');
  };

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
        style={{ paddingBottom: isNumpadOpen ? numpadHeight + 16 : 48 }}
      >
        <div className="mb-12 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
            Maak samen {question.target}!
          </h2>
        </div>

        <div className="relative w-full max-w-[300px] md:max-w-[400px] aspect-square flex flex-col items-center">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path 
              d="M 50 30 Q 30 50, 25 70" 
              fill="none" 
              stroke={status === 'correct' ? "#10b981" : "#4c3b82"} 
              strokeWidth="6" 
              strokeLinecap="round"
              className="drop-shadow-lg transition-colors duration-500"
            />
            <path 
              d="M 50 30 Q 70 50, 75 70" 
              fill="none" 
              stroke={
                status === 'incorrect' ? "#f97316" : 
                status === 'correct' ? "#10b981" : 
                "#4c3b82"
              } 
              strokeWidth="6" 
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-500",
                status === 'incorrect' && "drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]"
              )}
            />
          </svg>

          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-emerald-400 border-b-[8px] border-emerald-600 shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex items-center justify-center z-10 mb-auto ring-4 ring-emerald-200">
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            <span className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]">
              {question.target}
            </span>
          </div>

          <div className="w-full flex justify-between px-2 md:px-8 absolute bottom-0">
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-cyan-400 border-b-[8px] border-cyan-600 shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex items-center justify-center z-10 ring-4 ring-cyan-200">
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
              <span className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]">
                {question.known}
              </span>
            </div>

            <motion.button 
              onClick={(e) => {
                e.stopPropagation();
                setIsNumpadOpen(true);
                if (status === 'incorrect') {
                  setStatus('idle');
                  setInputValue('');
                }
              }}
              animate={
                status === 'incorrect' ? { x: [-5, 5, -4, 4, -2, 2, 0] } :
                status === 'correct' ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } :
                { scale: isNumpadOpen && !inputValue ? 1.05 : 1 }
              }
              transition={
                status === 'incorrect' ? { duration: 0.5, ease: "easeInOut" } :
                status === 'correct' ? { duration: 0.5, ease: "easeOut" } :
                { duration: 0.2 }
              }
              className={cn(
                "relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center z-10 transition-all duration-300 transform-gpu cursor-pointer outline-none",
                status === 'correct' ? "bg-emerald-400 border-b-[8px] border-emerald-600 ring-4 ring-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.8)]" :
                status === 'incorrect' ? "bg-orange-500 border-b-[8px] border-orange-700 ring-4 ring-orange-300 shadow-[0_0_30px_rgba(249,115,22,0.6)]" :
                inputValue ? "bg-purple-500 border-b-[8px] border-purple-700 ring-4 ring-purple-300 shadow-xl" :
                "bg-[#2d1b54]/40 border-4 border-dashed border-[#a78bfa] hover:bg-[#3b2d71]/60 shadow-inner group"
              )}
            >
              {(inputValue || status !== 'idle') && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
              )}
              
              {!inputValue && status === 'idle' && !isNumpadOpen && (
                <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping pointer-events-none" />
              )}

              {inputValue ? (
                <span className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">
                  {inputValue}
                </span>
              ) : (
                <span className={cn(
                  "text-5xl md:text-6xl font-black text-[#a78bfa]/50 transition-colors",
                  isNumpadOpen && "text-[#a78bfa]"
                )}>
                  ?
                </span>
              )}

              <AnimatePresence>
                {status === 'incorrect' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="absolute -bottom-14 whitespace-nowrap flex items-center gap-2 bg-orange-100/10 backdrop-blur-md px-4 py-2 rounded-full border border-orange-400/30 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span className="text-sm font-bold text-orange-300 tracking-wide uppercase">Bijna!</span>
                    <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
      </div>

      <ExerciseNumpad
        isOpen={isNumpadOpen}
        onClose={() => setIsNumpadOpen(false)}
        inputValue={inputValue}
        onNumberClick={handleNumberClick}
        onDelete={() => {
          setInputValue(prev => prev.slice(0, -1));
          if (status === 'incorrect') setStatus('idle');
        }}
        onCheck={handleCheck}
        status={status}
        onTryAgain={handleTryAgain}
        checkDisabled={!inputValue}
        onHeightChange={setNumpadHeight}
      />
    </ExerciseShell>
  );
}
