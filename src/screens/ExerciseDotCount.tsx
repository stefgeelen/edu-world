import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Undo2, Trash2, Heart, HeartCrack, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useGame } from '@/context/GameContext';

interface Dot {
  id: string;
  x: number;
  y: number;
}

function getRandomTarget() {
  return Math.floor(Math.random() * 10) + 1;
}

export function ExerciseDotCount() {
  const navigate = useNavigate();
  const { addXp } = useGame();
  const areaRef = useRef<HTMLDivElement>(null);

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
    // clamp so dots don't go off edge
    const cx = Math.min(Math.max(x, 6), 94);
    const cy = Math.min(Math.max(y, 8), 92);
    setDots(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, x: cx, y: cy }]);
  }, [status]);

  const handleAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    addDotAt(e.clientX, e.clientY);
  };

  const handleAreaTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return;
    addDotAt(touch.clientX, touch.clientY);
  };

  const handleDeleteLast = () => {
    if (status !== 'idle') return;
    setDots(prev => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    if (dots.length === 0 || status !== 'idle') return;

    if (dots.length === target) {
      setStatus('correct');
      addXp(15);
      confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#14b8a6', '#34d399', '#fcd34d', '#60a5fa'],
      });
      const nextProgress = progress + 20;
      setProgress(nextProgress);
      setTimeout(() => {
        if (nextProgress >= 100) {
          navigate('/stage/fluisterbos');
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
          navigate('/stage/fluisterbos');
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
    <div className="h-full w-full bg-gradient-to-b from-teal-100 via-emerald-50 to-cyan-50 flex flex-col overflow-hidden relative">

      {/* ── Floating forest decorations ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {['🌿','🍃','✨','🌟','💧','🌱','⭐','🍀'].map((icon, i) => (
          <span key={i} className="absolute select-none" style={{
            left: `${[6, 18, 30, 44, 58, 70, 82, 90][i]}%`,
            top:  `${[12, 72, 28, 85, 18, 60, 40, 78][i]}%`,
            fontSize: `${[20, 16, 22, 14, 18, 24, 16, 20][i]}px`,
            opacity: 0.12,
            transform: `rotate(${i * 22}deg)`,
          }}>{icon}</span>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-4 pt-10 pb-4 flex-shrink-0 shadow-lg relative z-10">
        <div className="flex items-center gap-3 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate('/stage/fluisterbos')}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-2xl transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          {/* Progress bar */}
          <div className="flex-1 h-3.5 bg-white/30 rounded-full overflow-hidden shadow-inner">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', damping: 20 }}
              className="h-full bg-white rounded-full shadow-sm"
            />
          </div>

          {/* Lives */}
          <div className="flex gap-1 flex-shrink-0">
            {[...Array(3)].map((_, i) =>
              i < lives
                ? <Heart key={i} className="w-5 h-5 text-red-300 fill-red-300 drop-shadow" />
                : <HeartCrack key={i} className="w-5 h-5 text-white/30" />
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col px-4 pt-5 gap-4 max-w-md mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        {/* Instruction + number */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-teal-700 mb-3 flex items-center gap-1.5">
            <span className="text-lg">🌲</span>
            Tik op het veld om stippen te plaatsen!
          </p>

          <motion.div
            key={target}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="bg-white/90 rounded-3xl border-2 border-teal-200 shadow-md p-5 flex items-center gap-5"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0 ring-4 ring-teal-200">
              <span className="font-black text-white drop-shadow-md" style={{ fontSize: 44 }}>{target}</span>
            </div>
            <div>
              <p className="font-black text-slate-800 mb-0.5">Maak dit getal!</p>
              <p className="text-sm text-slate-500 leading-snug">
                Zet precies <span className="font-black text-teal-600">{target}</span> {target === 1 ? 'stip' : 'stippen'} in het veld hieronder.
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
            onClick={handleAreaClick}
            onTouchStart={handleAreaTouch}
            className={cn(
              'relative w-full h-full rounded-3xl overflow-hidden select-none touch-none cursor-crosshair transition-all duration-300 shadow-inner',
              status === 'correct'
                ? 'bg-teal-50 border-2 border-teal-400 shadow-teal-100'
                : status === 'incorrect'
                  ? 'bg-red-50 border-2 border-red-300'
                  : isOver
                    ? 'bg-orange-50 border-2 border-dashed border-orange-400'
                    : 'bg-white/80 border-2 border-dashed border-teal-300 hover:border-teal-400 hover:bg-white/95',
            )}
          >
            {/* Background hint */}
            {dotCount === 0 && status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                <span className="text-4xl opacity-20">✦</span>
                <p className="text-teal-300 font-bold text-sm">Tik hier om een stip te zetten</p>
              </div>
            )}

            {/* Decorative grid dots */}
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-teal-200 pointer-events-none"
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
                  className="absolute inset-0 flex items-center justify-center bg-teal-400/25 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full p-4 shadow-xl ring-4 ring-teal-200">
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
                  <div className="bg-gradient-to-br from-red-400 to-rose-500 rounded-full p-4 shadow-xl ring-4 ring-red-200">
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
              className="flex-shrink-0 flex items-center gap-2 bg-orange-50 border-2 border-orange-200 rounded-2xl px-4 py-3 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-bold text-orange-700">
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
              className="flex-shrink-0 flex items-center gap-2 bg-teal-50 border-2 border-teal-300 rounded-2xl px-4 py-3 shadow-sm"
            >
              <span className="text-lg">🎉</span>
              <p className="text-sm font-bold text-teal-700">
                Super goed! Precies {target} {target === 1 ? 'stip' : 'stippen'}! +15 XP
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom spacing */}
        <div className="flex-shrink-0 h-2" />
      </div>

      {/* ── Sticky action bar ── */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-t-2 border-teal-100 px-4 py-3 shadow-[0_-4px_20px_rgba(20,184,166,0.12)] relative z-10">
        <div className="max-w-md mx-auto w-full flex items-center gap-2">

          {/* Counter badge */}
          <div className={cn(
            'flex items-center gap-1 px-3 py-2.5 rounded-2xl border-2 font-black text-sm transition-colors flex-shrink-0 shadow-sm',
            isOver
              ? 'bg-orange-50 border-orange-300 text-orange-700'
              : isExact
                ? 'bg-teal-50 border-teal-400 text-teal-700'
                : 'bg-white border-teal-200 text-slate-700'
          )}>
            <span className="text-base leading-none">{dotCount}</span>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-base leading-none">{target}</span>
          </div>

          {/* Delete last dot */}
          <button
            onClick={handleDeleteLast}
            disabled={dotCount === 0 || status !== 'idle'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all flex-shrink-0',
              dotCount > 0 && status === 'idle'
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 active:scale-95'
                : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
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
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 active:scale-95'
                : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
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
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white border border-teal-600'
                : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
            )}
          >
            <Check className="w-4 h-4" strokeWidth={3} />
            Controleer
          </motion.button>
        </div>
      </div>
    </div>
  );
}