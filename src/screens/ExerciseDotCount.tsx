import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Undo2, Trash2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { DOT_COUNT_CONFIG, DEFAULT_DOT_COUNT } from '@/data/difficultyConfig';

interface Dot {
  id: string;
  x: number;
  y: number;
}

export function ExerciseDotCount() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { key: difficultyKey } = useDifficultyLevel();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());
  const areaRef = useRef<HTMLDivElement>(null);

  const dotConfig = DOT_COUNT_CONFIG[difficultyKey] ?? DEFAULT_DOT_COUNT;

  const getRandomTarget = () =>
    Math.floor(Math.random() * (dotConfig.maxDots - dotConfig.minDots + 1)) + dotConfig.minDots;

  const [target, setTarget] = useState(getRandomTarget);
  const [dots, setDots] = useState<Dot[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [shake, setShake] = useState(false);

  const generateNew = () => {
    setTarget(getRandomTarget());
    setDots([]);
    setStatus('idle');
  };

  const clearAllDots = () => {
    if (status !== 'idle') return;
    setDots([]);
  };

  const addDotAt = useCallback((clientX: number, clientY: number) => {
    if (status !== 'idle' || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const cx = Math.min(Math.max(x, 6), 94);
    const cy = Math.min(Math.max(y, 8), 92);
    setDots(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, x: cx, y: cy }]);
  }, [status]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    addDotAt(e.clientX, e.clientY);
  };

  const handleDeleteLast = () => {
    if (status !== 'idle') return;
    setDots(prev => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    if (dots.length === 0 || status !== 'idle') return;

    if (dots.length === target) {
      setStatus('correct');
      correctCount.current += 1;
      // XP handled by complete_exercise RPC
      triggerConfetti('medium');
      const nextProgress = progress + 20;
      setProgress(nextProgress);
      setTimeout(() => {
        if (nextProgress >= 100) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: 5, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
          }
          navigate('/app/stage/fluisterbos');
        } else {
          generateNew();
        }
      }, 1800);
    } else {
      setStatus('incorrect');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      const nextLives = lives - 1;
      setLives(nextLives);
      setTimeout(() => {
        if (nextLives <= 0) {
          navigate('/app/stage/fluisterbos');
        } else {
          setDots([]);
          setStatus('idle');
        }
      }, 1600);
    }
  };

  const dotCount = dots.length;
  const isOver = dotCount > target;
  const isExact = dotCount === target;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/stage/fluisterbos')}
    >
      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col px-4 pt-5 gap-4 max-w-md mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        {/* Instruction + number */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-[#9d8bce] mb-3 flex items-center gap-1.5">
            <span className="text-lg">🌲</span>
            Tik op het veld om stippen te plaatsen!
          </p>

          <motion.div
            key={target}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="bg-[#1c1134]/60 backdrop-blur-sm rounded-3xl border-2 border-[#3b2d71] shadow-md p-5 flex items-center gap-5"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0 ring-4 ring-teal-200/20">
              <span className="font-black text-white drop-shadow-md" style={{ fontSize: 44 }}>{target}</span>
            </div>
            <div>
              <p className="font-black text-white mb-0.5">Maak dit getal!</p>
              <p className="text-sm text-white/60 leading-snug">
                Zet precies <span className="font-black text-emerald-400">{target}</span> {target === 1 ? 'stip' : 'stippen'} in het veld hieronder.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Dot placement area */}
        <div className="flex-shrink-0" style={{ height: 260 }}>
          <motion.div
            ref={areaRef}
            animate={shake ? { x: [-6, 6, -5, 5, -3, 3, 0] } : {}}
            transition={{ duration: 0.45 }}
            onPointerDown={handlePointerDown}
            className={cn(
              'relative w-full h-full rounded-3xl overflow-hidden select-none touch-none cursor-crosshair transition-all duration-300 shadow-inner',
              status === 'correct'
                ? 'bg-emerald-500/20 border-2 border-emerald-400/50'
                : status === 'incorrect'
                  ? 'bg-red-500/20 border-2 border-red-400/50'
                  : isOver
                    ? 'bg-orange-500/20 border-2 border-dashed border-orange-400/50'
                    : 'bg-[#1c1134]/80 border-2 border-dashed border-[#3b2d71] hover:border-[#4c3b82]',
            )}
          >
            {/* Background hint */}
            {dotCount === 0 && status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                <span className="text-4xl opacity-20">✦</span>
                <p className="text-[#4c3b82] font-bold text-sm">Tik hier om een stip te zetten</p>
              </div>
            )}

            {/* Decorative grid dots */}
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#3b2d71] pointer-events-none"
                style={{
                  left: `${((i % 5) + 1) * 16.5}%`,
                  top: `${(Math.floor(i / 5) + 1) * 24}%`,
                }}
              />
            ))}

            {/* Placed dots */}
            <AnimatePresence>
              {dots.map((dot, idx) => (
                <motion.div
                  key={dot.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0.6, duration: 0.35 }}
                  className={cn(
                    'absolute w-11 h-11 rounded-full flex items-center justify-center shadow-lg pointer-events-none',
                    '-translate-x-1/2 -translate-y-1/2',
                    idx >= target
                      ? 'bg-gradient-to-br from-orange-400 to-red-400 ring-2 ring-orange-600'
                      : 'bg-gradient-to-br from-teal-400 to-emerald-500 ring-2 ring-teal-600',
                  )}
                  style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-white/50" />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Status overlay */}
            <AnimatePresence>
              {status === 'correct' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-emerald-400/25 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full p-4 shadow-xl ring-4 ring-emerald-200/30">
                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                </motion.div>
              )}
              {status === 'incorrect' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-red-400/20 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-red-400 to-rose-500 rounded-full p-4 shadow-xl ring-4 ring-red-200/30">
                    <X className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Feedback message */}
        <AnimatePresence>
          {status === 'incorrect' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex-shrink-0 flex items-center gap-2 bg-orange-500/20 border-2 border-orange-400/30 rounded-2xl px-4 py-3 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-sm font-bold text-orange-300">
                {dotCount < target
                  ? `Bijna! Je hebt ${dotCount} stippen, maar je hebt er ${target} nodig.`
                  : `Oeps! Je hebt ${dotCount} stippen, maar je hebt er ${target} nodig.`}
              </p>
            </motion.div>
          )}
          {status === 'correct' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex-shrink-0 flex items-center gap-2 bg-emerald-500/20 border-2 border-emerald-400/30 rounded-2xl px-4 py-3 shadow-sm"
            >
              <span className="text-lg">🎉</span>
              <p className="text-sm font-bold text-emerald-400">
                Super goed! Precies {target} {target === 1 ? 'stip' : 'stippen'}! +15 XP
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 h-2" />
      </div>

      {/* ── Sticky action bar ── */}
      <div className="flex-shrink-0 bg-[#1a103c]/90 backdrop-blur-sm border-t-2 border-[#3b2d71] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] relative z-10">
        <div className="max-w-md mx-auto w-full flex items-center gap-2">

          {/* Counter badge */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-2.5 rounded-2xl border-2 font-black text-sm transition-colors flex-shrink-0 shadow-sm',
            isOver
              ? 'bg-orange-500/20 border-orange-400/40 text-orange-400'
              : isExact
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400'
                : 'bg-[#1c1134] border-[#3b2d71] text-white/80'
          )}>
            <span className="text-base leading-none">{dotCount}</span>
            <span className="text-[#4c3b82] text-xs">/</span>
            <span className="text-base leading-none">{target}</span>
          </div>

          {/* Delete last dot */}
          <button
            onClick={handleDeleteLast}
            disabled={dotCount === 0 || status !== 'idle'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all flex-shrink-0',
              dotCount > 0 && status === 'idle'
                ? 'bg-[#2d1b54] border-[#4c3b82] text-white/80 hover:bg-amber-500/20 hover:border-amber-400/40 hover:text-amber-400 active:scale-95'
                : 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed'
            )}
          >
            <Undo2 className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Ongedaan</span>
          </button>

          {/* Clear all */}
          <button
            onClick={clearAllDots}
            disabled={dotCount === 0 || status !== 'idle'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all flex-shrink-0',
              dotCount > 0 && status === 'idle'
                ? 'bg-[#2d1b54] border-[#4c3b82] text-white/80 hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-400 active:scale-95'
                : 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed'
            )}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            Wis alles
          </button>

          {/* Check / Confirm */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleConfirm}
            disabled={dotCount === 0 || status !== 'idle'}
            className={cn(
              'ml-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all flex-shrink-0 shadow-md',
              dotCount > 0 && status === 'idle'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-700'
                : 'bg-[#1c1134] text-[#3b2d71] border border-[#3b2d71] cursor-not-allowed'
            )}
          >
            <Check className="w-4 h-4" strokeWidth={3} />
            Controleer
          </motion.button>
        </div>
      </div>
    </ExerciseShell>
  );
}
