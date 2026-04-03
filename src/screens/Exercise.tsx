import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Heart, HeartCrack, Loader2 } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';

export function Exercise() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedAvatar, addXp } = useGame();
  
  const [question, setQuestion] = useState({ num1: 5, num2: 4, operator: '×', answer: 20 });
  const [options, setOptions] = useState([18, 20, 24, 15]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);

  const generateQuestion = () => {
    const levelMultipler = Number(id) || 1;
    const max = 10 + (levelMultipler * 5);
    const num1 = Math.floor(Math.random() * max) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    let ans = 0;
    if (op === '+') ans = num1 + num2;
    if (op === '-') ans = num1 - num2;
    if (op === '×') ans = num1 * num2;

    const newOptions = new Set([ans]);
    while (newOptions.size < 4) {
      newOptions.add(ans + Math.floor(Math.random() * 10) - 5);
    }

    setQuestion({ num1, num2, operator: op, answer: ans });
    setOptions(Array.from(newOptions).sort(() => Math.random() - 0.5));
    setSelectedOption(null);
    setStatus('idle');
  };

  useEffect(() => {
    generateQuestion();
  }, [id]);

  const handleSelect = (option: number) => {
    if (status !== 'idle') return;
    
    setSelectedOption(option);
    if (option === question.answer) {
      setStatus('correct');
      setProgress(p => p + 20);
      triggerConfetti('small', { colors: ['#3b82f6', '#14b8a6', '#f59e0b'], originY: 0.6 });
      addXp(10);
      
      setTimeout(() => {
        if (progress + 20 >= 100) {
          navigate('/app/dashboard'); // Or a success screen
        } else {
          generateQuestion();
        }
      }, 1500);
      
    } else {
      setStatus('incorrect');
      setLives(l => l - 1);
      
      setTimeout(() => {
        if (lives - 1 <= 0) {
          navigate('/app/dashboard'); // Or fail screen
        } else {
          setSelectedOption(null);
          setStatus('idle');
        }
      }, 1500);
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-amber-100 via-yellow-50 to-orange-50 flex flex-col overflow-hidden relative">
      
      {/* Forest / magic particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {['🌳','🍂','🌟','🍃','✨','🦋','🌸','⭐'].map((icon, i) => (
          <span key={i} className="absolute select-none" style={{
            left: `${[5, 16, 30, 46, 60, 72, 84, 92][i]}%`,
            top:  `${[8, 72, 20, 85, 12, 55, 35, 70][i]}%`,
            fontSize: `${[18, 14, 20, 16, 22, 14, 18, 16][i]}px`,
            opacity: 0.10,
            transform: `rotate(${i * 22}deg)`,
          }}>{icon}</span>
        ))}
      </div>

      {/* Header */}
      <div className="pt-8 md:pt-12 px-6 md:px-12 lg:px-16 flex items-center gap-4 z-10 max-w-7xl mx-auto w-full">
        <button 
          onClick={() => navigate('/app/map')}
          className="p-3 md:p-4 bg-white/80 hover:bg-white rounded-2xl shadow-md border-2 border-amber-200 transition-colors backdrop-blur-sm"
        >
          <X className="w-6 h-6 md:w-7 md:h-7 text-amber-600" />
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1 h-6 md:h-8 bg-amber-200/60 rounded-full overflow-hidden relative shadow-inner border border-amber-300/50">
          <motion.div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-400 to-orange-500"
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring' }}
          >
            <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }} />
          </motion.div>
        </div>

        {/* Lives */}
        <div className="flex gap-1 md:gap-2">
          {[...Array(3)].map((_, i) => (
            i < lives ? 
              <Heart key={i} className="w-6 h-6 md:w-8 md:h-8 text-red-500 fill-red-500" /> : 
              <HeartCrack key={i} className="w-6 h-6 md:w-8 md:h-8 text-amber-300" />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 md:px-12 lg:px-16 justify-center max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full z-10 relative mt-8 md:mt-12">
        
        {/* Math Problem */}
        <motion.div 
          key={`${question.num1}${question.operator}${question.num2}`}
          initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="bg-white/90 backdrop-blur-sm rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 lg:p-16 shadow-[0_20px_60px_rgba(245,158,11,0.15)] border-2 border-amber-200 flex items-center justify-center min-h-[200px] md:min-h-[280px] lg:min-h-[320px] mb-8 md:mb-12 relative overflow-hidden"
        >
          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-5 h-5 rounded-full bg-amber-200 shadow-inner" />
          <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-orange-200 shadow-inner" />
          <div className="absolute bottom-4 left-4 w-5 h-5 rounded-full bg-yellow-200 shadow-inner" />
          <div className="absolute bottom-4 right-4 w-5 h-5 rounded-full bg-amber-200 shadow-inner" />
          
          <h2 className="text-6xl md:text-8xl lg:text-9xl xl:text-[10rem] font-black text-slate-800 tracking-tight flex items-center gap-3 md:gap-6">
            <span className="text-blue-500 drop-shadow-sm">{question.num1}</span>
            <span className="text-amber-400">{question.operator}</span>
            <span className="text-teal-500 drop-shadow-sm">{question.num2}</span>
            <span className="text-amber-300">=</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 border-b-4 md:border-b-8 border-dashed border-amber-300 w-20 md:w-32 lg:w-40 text-center">
              ?
            </span>
          </h2>
        </motion.div>

        {/* Options — each button gets its own vivid color */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {options.map((option, i) => {
            const isSelected = selectedOption === option;
            const isCorrect = status === 'correct' && option === question.answer;
            const isWrong = status === 'incorrect' && isSelected;
            const COLORS = [
              'from-blue-400 to-blue-500 border-blue-600 hover:from-blue-500 hover:to-blue-600',
              'from-violet-400 to-violet-500 border-violet-600 hover:from-violet-500 hover:to-violet-600',
              'from-teal-400 to-teal-500 border-teal-600 hover:from-teal-500 hover:to-teal-600',
              'from-rose-400 to-rose-500 border-rose-600 hover:from-rose-500 hover:to-rose-600',
            ];
            return (
              <motion.button
                key={i}
                whileHover={{ scale: status === 'idle' ? 1.04 : 1 }}
                whileTap={{ scale: status === 'idle' ? 0.96 : 1 }}
                onClick={() => handleSelect(option)}
                disabled={status !== 'idle'}
                className={cn(
                  "relative h-24 md:h-28 lg:h-32 rounded-3xl text-4xl md:text-5xl lg:text-6xl font-black transition-all duration-200 flex items-center justify-center overflow-hidden shadow-lg border-b-[6px]",
                  !isSelected && status === 'idle'
                    ? `bg-gradient-to-br ${COLORS[i]} text-white hover:-translate-y-1 hover:border-b-[8px] hover:shadow-xl`
                    : '',
                  isCorrect ? "bg-gradient-to-br from-green-400 to-emerald-500 border-green-600 border-b-[6px] text-white scale-105 shadow-xl" : '',
                  isWrong   ? "bg-gradient-to-br from-red-400 to-rose-500 border-red-600 border-b-[6px] text-white" : '',
                )}
              >
                <div className="absolute inset-x-0 top-0 h-1/3 bg-white/20 rounded-t-3xl pointer-events-none" />
                <span className="relative z-10 drop-shadow-sm">{option}</span>
                {isCorrect && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-emerald-400/80 rounded-3xl"
                  >
                    <Check className="w-12 h-12 md:w-14 md:h-14 text-white drop-shadow" strokeWidth={4} />
                  </motion.div>
                )}
                {isWrong && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-red-500/80 rounded-3xl"
                  >
                    <X className="w-12 h-12 md:w-14 md:h-14 text-white drop-shadow" strokeWidth={4} />
                  </motion.div>
                )}
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
            {/* Speech Bubble */}
            <motion.div 
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute -top-12 left-24 md:-top-16 md:left-32 bg-white px-5 py-3 md:px-6 md:py-4 rounded-2xl rounded-bl-none shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-2 border-slate-100 w-48 md:w-56"
            >
              <p className="text-sm md:text-base font-bold text-slate-700">
                {status === 'idle' && "Jij kan dit!"}
                {status === 'correct' && <span className="text-teal-500">Goed gedaan! +10 XP</span>}
                {status === 'incorrect' && <span className="text-red-500">Oeps! Probeer opnieuw!</span>}
              </p>
            </motion.div>
            
            {/* Avatar image */}
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-8 border-white shadow-2xl overflow-hidden bg-white/50 backdrop-blur-md">
              {selectedAvatar ? (
                <img 
                  src={selectedAvatar.imageUrl} 
                  alt="avatar" 
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500",
                    status === 'correct' && "scale-110",
                    status === 'incorrect' && "grayscale opacity-80"
                  )} 
                />
              ) : (
                <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-blue-500" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Footer / Continue button logic */}
      <div className="h-32 pointer-events-none" />
    </div>
  );
}