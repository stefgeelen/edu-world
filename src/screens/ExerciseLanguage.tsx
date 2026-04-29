import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
// addXp removed — XP handled by complete_exercise RPC
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useSpeech } from '@/hooks/useSpeech';

const WORD_POOL = ['boom', 'roos', 'vis', 'maan', 'vuur', 'huis', 'boek', 'kat', 'hond', 'zon', 'ster', 'wolk', 'gras', 'berg', 'meer'];

export function ExerciseLanguage() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());
  const { speak } = useSpeech();
  
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [correctWord, setCorrectWord] = useState<string>('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'incorrect' | 'correct'>('idle');
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);

  const generateQuestion = () => {
    const shuffled = [...WORD_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    const answer = selected[Math.floor(Math.random() * 4)];
    setCurrentWords(selected);
    setCorrectWord(answer);
    setSelectedWord(null);
    setStatus('idle');
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  useEffect(() => {
    if (correctWord) {
      const timer = setTimeout(() => playAudio(), 500);
      return () => clearTimeout(timer);
    }
  }, [correctWord]);

  const playAudio = useCallback(() => {
    if (isPlaying || !correctWord) return;
    setIsPlaying(true);

    speak(correctWord).finally(() => setIsPlaying(false));
  }, [isPlaying, correctWord, speak]);

  const handleWordSelect = (word: string) => {
    if (status !== 'idle') return;

    setSelectedWord(word);
    
    if (word === correctWord) {
      setStatus('correct');
      setProgress(p => p + 20);
      correctCount.current += 1;
      // XP handled by complete_exercise RPC
      
      triggerConfetti('large', { colors: ['#10b981', '#f59e0b', '#3b82f6'], originY: 0.6 });
      
      setTimeout(() => {
        if (progress + 20 >= 100) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: 5, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
          }
          navigate('/app/map');
        } else {
          generateQuestion();
        }
      }, 2000);
    } else {
      setStatus('incorrect');
      setLives(l => l - 1);
      
      setTimeout(() => {
        if (lives - 1 <= 0) {
          navigate('/app/map');
        } else {
          setStatus('idle');
          setSelectedWord(null);
        }
      }, 1500);
    }
  };

  if (currentWords.length === 0) return null;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/map')}
    >
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center z-10 relative px-6 mt-8 md:mt-12 w-full max-w-md mx-auto">
        
        {/* Speaker Button */}
        <div className="relative mb-12">
          <AnimatePresence>
            {isPlaying && (
              <>
                <motion.div 
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 bg-orange-400 rounded-full pointer-events-none"
                />
                <motion.div 
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="absolute inset-0 bg-amber-400 rounded-full pointer-events-none"
                />
              </>
            )}
          </AnimatePresence>

          <motion.button
            onClick={playAudio}
            animate={{ scale: isPlaying ? 0.95 : 1 }}
            className="relative w-32 h-32 md:w-40 md:h-40 bg-orange-500 rounded-full flex items-center justify-center border-b-[10px] border-orange-700 shadow-[0_15px_35px_rgba(249,115,22,0.4)] active:border-b-0 active:translate-y-[10px] transition-all group z-10"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2 pointer-events-none" />
            <Volume2 
              className={cn(
                "w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-md transition-transform",
                isPlaying ? "animate-pulse" : "group-hover:scale-110"
              )} 
              strokeWidth={2.5} 
            />
          </motion.button>
        </div>

        {/* Word Cards List */}
        <div className="w-full flex flex-col gap-4">
          {currentWords.map((word, index) => {
            const isSelected = selectedWord === word;
            const isCorrect = isSelected && status === 'correct';
            const isIncorrect = isSelected && status === 'incorrect';

            return (
              <motion.button
                key={word}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  x: isIncorrect ? [-5, 5, -4, 4, -2, 2, 0] : 0 
                }}
                transition={{ 
                  delay: index * 0.1,
                  x: { duration: 0.5 }
                }}
                onClick={() => handleWordSelect(word)}
                disabled={status !== 'idle'}
                className={cn(
                  "relative w-full py-5 md:py-6 rounded-3xl border-b-[8px] flex items-center justify-center transition-all duration-200 transform-gpu overflow-hidden",
                  !isSelected && status === 'idle' && "bg-[#2d1b54] border-[#1c1134] shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:bg-[#3b2d71] active:border-b-0 active:translate-y-[8px]",
                  isCorrect && "bg-emerald-400 border-emerald-600 shadow-[0_8px_25px_rgba(16,185,129,0.5)] z-10 scale-105",
                  isIncorrect && "bg-red-400 border-red-600 shadow-[0_8px_25px_rgba(239,68,68,0.5)] z-10",
                  !isSelected && status !== 'idle' && "bg-[#1c1134]/50 border-[#1c1134]/30 opacity-50 cursor-not-allowed"
                )}
              >
                {(isCorrect || isIncorrect || status === 'idle') && (
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                )}
                
                <span className={cn(
                  "text-3xl md:text-4xl font-black tracking-widest",
                  (isCorrect || isIncorrect) ? "text-white drop-shadow-md" : "text-white/90"
                )}
                style={{ textTransform: 'lowercase' }}
                >
                  {word}
                </span>

                {isCorrect && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-6 w-8 h-8 rounded-full bg-white/30 flex items-center justify-center"
                  >
                    <Star className="w-5 h-5 text-white fill-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Guide Fox Character */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
        className="absolute -bottom-4 -right-4 w-40 h-40 md:w-48 md:h-48 z-20 pointer-events-none"
      >
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute -top-12 -left-20 md:-top-16 md:-left-24 bg-[#1c1134]/80 backdrop-blur-md px-4 py-2 md:px-5 md:py-3 rounded-2xl rounded-br-none shadow-lg border-2 border-[#3b2d71]"
        >
          <p className="text-sm md:text-base font-bold text-white/90 whitespace-nowrap">
            {status === 'idle' ? "Wat hoor je?" : status === 'correct' ? "Super goed!" : "Probeer nog eens!"}
          </p>
        </motion.div>

        <div className="w-full h-full rounded-tl-full bg-[#1c1134]/40 backdrop-blur-sm p-4 shadow-[-10px_-10px_30px_rgba(0,0,0,0.2)] border-t-4 border-l-4 border-[#3b2d71]/60">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#3b2d71] shadow-inner bg-[#2d1b54]">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1655210913485-73249fac3700?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzRCUyMGNhcnRvb24lMjBjdXRlJTIwZm94JTIwY2hhcmFjdGVyJTIwd2hpdGUlMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc3NDI5Nzk1MXww&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="Cartoon Fox" 
              className="w-full h-full object-cover transform scale-110 translate-y-2"
            />
          </div>
        </div>
      </motion.div>
    </ExerciseShell>
  );
}
