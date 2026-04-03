import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Star, Heart, HeartCrack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useGame } from '@/context/GameContext';

const WORD_POOL = ['boom', 'roos', 'vis', 'maan', 'vuur', 'huis', 'boek', 'kat', 'hond', 'zon', 'ster', 'wolk', 'gras', 'berg', 'meer'];

export function ExerciseLanguage() {
  const navigate = useNavigate();
  const { addXp } = useGame();
  
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

  // Auto-play word when correctWord changes
  useEffect(() => {
    if (correctWord) {
      const timer = setTimeout(() => handlePlayAudio(), 500);
      return () => clearTimeout(timer);
    }
  }, [correctWord]);

  const handlePlayAudio = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(correctWord);
    utterance.lang = 'nl-NL';
    utterance.rate = 0.75;
    
    // Try to find a Dutch voice explicitly
    const voices = window.speechSynthesis.getVoices();
    const dutchVoice = voices.find(v => v.lang === 'nl-NL') 
      || voices.find(v => v.lang.startsWith('nl'));
    if (dutchVoice) {
      utterance.voice = dutchVoice;
    }
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleWordSelect = (word: string) => {
    if (status !== 'idle') return;

    setSelectedWord(word);
    
    if (word === correctWord) {
      setStatus('correct');
      setProgress(p => p + 20);
      addXp(10);
      
      triggerConfetti('large', { colors: ['#10b981', '#f59e0b', '#3b82f6'], originY: 0.6 });
      
      setTimeout(() => {
        if (progress + 20 >= 100) {
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
    <div className="h-full w-full bg-gradient-to-b from-[#dcfce7] via-[#bbf7d0] to-[#86efac] flex flex-col relative overflow-hidden font-sans">
      
      {/* Background magical particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-40"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 6 + 4}px`,
              height: `${Math.random() * 6 + 4}px`,
              animation: `float ${Math.random() * 3 + 3}s infinite alternate ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Unified Header with Progress Bar and Lives */}
      <div className="pt-8 md:pt-12 px-6 flex items-center gap-4 z-20 w-full max-w-2xl mx-auto">
        <button 
          onClick={() => navigate('/app/map')}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-b-[4px] border-slate-200 active:border-b-0 active:translate-y-1 transition-all flex-shrink-0 shadow-md"
        >
          <X className="w-6 h-6 text-slate-400" />
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1 h-6 md:h-8 bg-white/60 backdrop-blur-md rounded-full overflow-hidden relative border-2 border-white/80 shadow-inner">
          <motion.div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-400 to-emerald-500"
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/30 rounded-t-full" />
          </motion.div>
        </div>

        {/* Lives */}
        <div className="flex gap-1 md:gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-full border-2 border-white/80 shadow-sm">
          {[...Array(3)].map((_, i) => (
            i < lives ? 
              <Heart key={i} className="w-5 h-5 md:w-6 md:h-6 text-red-500 fill-red-500 animate-pulse drop-shadow-md" /> : 
              <HeartCrack key={i} className="w-5 h-5 md:w-6 md:h-6 text-slate-300 drop-shadow-sm" />
          ))}
        </div>
      </div>

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
            onClick={handlePlayAudio}
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
                  !isSelected && status === 'idle' && "bg-white border-slate-300 shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:bg-slate-50 active:border-b-0 active:translate-y-[8px]",
                  isCorrect && "bg-emerald-400 border-emerald-600 shadow-[0_8px_25px_rgba(16,185,129,0.5)] z-10 scale-105",
                  isIncorrect && "bg-red-400 border-red-600 shadow-[0_8px_25px_rgba(239,68,68,0.5)] z-10",
                  !isSelected && status !== 'idle' && "bg-white/50 border-slate-200/50 opacity-50 cursor-not-allowed"
                )}
              >
                {(isCorrect || isIncorrect || status === 'idle') && (
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                )}
                
                <span className={cn(
                  "text-3xl md:text-4xl font-black tracking-widest uppercase",
                  (isCorrect || isIncorrect) ? "text-white drop-shadow-md" : "text-[#1e293b]"
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

      {/* Guide Fox Character in Bottom Right */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
        className="absolute -bottom-4 -right-4 w-40 h-40 md:w-48 md:h-48 z-20 pointer-events-none"
      >
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute -top-12 -left-20 md:-top-16 md:-left-24 bg-white px-4 py-2 md:px-5 md:py-3 rounded-2xl rounded-br-none shadow-lg border-2 border-slate-100"
        >
          <p className="text-sm md:text-base font-bold text-slate-700 whitespace-nowrap">
            {status === 'idle' ? "Wat hoor je?" : status === 'correct' ? "Super goed!" : "Probeer nog eens!"}
          </p>
        </motion.div>

        <div className="w-full h-full rounded-tl-full bg-white/40 backdrop-blur-sm p-4 shadow-[-10px_-10px_30px_rgba(0,0,0,0.05)] border-t-4 border-l-4 border-white/60">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-inner bg-orange-100">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1655210913485-73249fac3700?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzRCUyMGNhcnRvb24lMjBjdXRlJTIwZm94JTIwY2hhcmFjdGVyJTIwd2hpdGUlMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc3NDI5Nzk1MXww&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="Cartoon Fox" 
              className="w-full h-full object-cover transform scale-110 translate-y-2"
            />
          </div>
        </div>
      </motion.div>
      
    </div>
  );
}
