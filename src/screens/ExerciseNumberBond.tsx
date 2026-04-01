import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Delete, Sparkles, Heart, HeartCrack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useGame } from '@/context/GameContext';

export function ExerciseNumberBond() {
  const navigate = useNavigate();
  const { addXp } = useGame();
  
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [question, setQuestion] = useState({ target: 8, known: 3, answer: 5 });
  
  const [inputValue, setInputValue] = useState("");
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'incorrect' | 'correct'>('idle');

  const generateQuestion = () => {
    const target = Math.floor(Math.random() * 6) + 5; 
    const known = Math.floor(Math.random() * (target - 1)) + 1; 
    setQuestion({ target, known, answer: target - known });
    setInputValue("");
    setStatus('idle');
    setIsNumpadOpen(false);
  };

  useEffect(() => {
    generateQuestion();
  }, []);
  
  const keys = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ];

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
      addXp(10);
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#fcd34d']
      });
      
      setTimeout(() => {
        if (progress + 20 >= 100) {
          navigate('/map');
        } else {
          generateQuestion();
        }
      }, 2000);
    } else {
      setStatus('incorrect');
      setLives(l => l - 1);
      if (lives - 1 <= 0) {
        setTimeout(() => navigate('/map'), 1500);
      }
    }
  };

  const handleTryAgain = () => {
    setInputValue("");
    setStatus('idle');
  };

  return (
    <div 
      className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] flex flex-col relative overflow-hidden font-sans"
      onClick={() => setIsNumpadOpen(false)}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animation: `pulse ${Math.random() * 2 + 2}s infinite ${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="pt-8 md:pt-12 px-6 flex items-center gap-4 z-10 w-full max-w-2xl mx-auto">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate('/map');
          }}
          className="w-12 h-12 bg-[#2d1b54] rounded-full flex items-center justify-center border-b-[4px] border-[#1c1134] active:border-b-0 active:translate-y-1 transition-all flex-shrink-0 shadow-lg"
        >
          <X className="w-6 h-6 text-[#9d8bce]" />
        </button>
        
        <div className="flex-1 h-6 md:h-8 bg-[#1c1134]/50 backdrop-blur-sm rounded-full overflow-hidden relative border-2 border-[#3b2d71] shadow-inner">
          <motion.div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-400 to-emerald-500"
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/30 rounded-t-full" />
          </motion.div>
        </div>

        <div className="flex gap-1 md:gap-2">
          {[...Array(3)].map((_, i) => (
            i < lives ? 
              <Heart key={i} className="w-6 h-6 md:w-8 md:h-8 text-red-500 fill-red-500 animate-pulse drop-shadow-md" /> : 
              <HeartCrack key={i} className="w-6 h-6 md:w-8 md:h-8 text-[#3b2d71] drop-shadow-md" />
          ))}
        </div>
      </div>

      <motion.div 
        animate={{ y: isNumpadOpen ? -60 : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="flex-1 flex flex-col items-center justify-center z-10 relative px-4 mt-8 md:mt-0 pb-12"
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
      </motion.div>

      <AnimatePresence>
        {isNumpadOpen && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 w-full bg-[#1a103c]/95 backdrop-blur-xl p-4 md:p-6 rounded-t-[3rem] border-t-4 border-[#3b2d71] shadow-[0_-15px_50px_rgba(0,0,0,0.6)] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-center mb-4">
              <button 
                onClick={() => setIsNumpadOpen(false)}
                className="w-16 h-2 bg-[#3b2d71] rounded-full hover:bg-[#4c3b82] transition-colors"
              />
            </div>

            <div className="max-w-sm mx-auto">
              <div className="grid grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
                {keys.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.map((num) => (
                      <button
                        key={num}
                        onClick={() => handleNumberClick(num)}
                        className="relative aspect-square rounded-2xl bg-[#2d1b54] border-b-[6px] border-[#1c1134] shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:bg-[#3b2d71] active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center group overflow-hidden"
                      >
                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl pointer-events-none" />
                        <span className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] group-active:scale-95 transition-transform">
                          {num}
                        </span>
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <button
                  onClick={() => {
                    setInputValue(prev => prev.slice(0, -1));
                    if (status === 'incorrect') setStatus('idle');
                  }}
                  className="relative aspect-square rounded-2xl bg-[#be123c] border-b-[6px] border-[#881337] shadow-[0_5px_15px_rgba(225,29,72,0.3)] hover:bg-[#e11d48] active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center group"
                >
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
                  <Delete className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md group-active:scale-90 transition-transform" />
                </button>

                <button
                  onClick={() => handleNumberClick('0')}
                  className="relative aspect-square rounded-2xl bg-[#2d1b54] border-b-[6px] border-[#1c1134] shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:bg-[#3b2d71] active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center group overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-2xl pointer-events-none" />
                  <span className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] group-active:scale-95 transition-transform">
                    0
                  </span>
                </button>

                {status === 'incorrect' ? (
                  <button
                    onClick={handleTryAgain}
                    className="relative aspect-square rounded-2xl bg-orange-500 border-b-[6px] border-orange-700 shadow-[0_5px_15px_rgba(249,115,22,0.4)] hover:bg-orange-400 active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center group"
                  >
                    <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none" />
                    <span className="text-xl md:text-2xl font-black text-white text-center leading-tight drop-shadow-md group-active:scale-95 transition-transform uppercase tracking-wider px-1">
                      Probeer<br/>Opnieuw
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleCheck}
                    disabled={!inputValue}
                    className={cn(
                      "relative aspect-square rounded-2xl border-b-[6px] transition-all flex items-center justify-center group",
                      inputValue 
                        ? "bg-emerald-500 border-emerald-700 shadow-[0_5px_15px_rgba(16,185,129,0.4)] hover:bg-emerald-400 active:border-b-0 active:translate-y-[6px]" 
                        : "bg-[#2d1b54] border-[#1c1134] opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none" />
                    <Check className={cn("w-12 h-12 md:w-14 md:h-14 drop-shadow-md transition-transform", inputValue ? "text-white group-active:scale-90" : "text-white/30")} strokeWidth={4} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
