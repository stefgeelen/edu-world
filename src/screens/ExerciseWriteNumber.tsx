import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Heart, HeartCrack, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useGame } from '@/context/GameContext';

function getRandomTarget() {
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Renders a ten-frame dot pattern for a given number (1–10).
 * Two rows of 5 cells, filled left-to-right.
 */
function TenFrameDots({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1].map(row => (
        <div key={row} className="flex gap-2">
          {[0, 1, 2, 3, 4].map(col => {
            const idx = row * 5 + col;
            const filled = idx < count;
            return (
              <motion.div
                key={col}
                initial={filled ? { scale: 0 } : false}
                animate={filled ? { scale: 1 } : {}}
                transition={{ delay: idx * 0.06, type: 'spring', bounce: 0.5 }}
                className={cn(
                  'w-10 h-10 rounded-full border-2 shadow-sm transition-colors',
                  filled
                    ? 'bg-gradient-to-br from-violet-400 to-violet-600 border-violet-700 shadow-violet-200'
                    : 'bg-slate-100 border-slate-200'
                )}
              >
                {filled && (
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white/40" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ExerciseWriteNumber() {
  const navigate = useNavigate();
  const { addXp } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef(false);

  const [target, setTarget] = useState(getRandomTarget);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'drawn' | 'selfcheck' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);

  // ── Canvas helpers ──────────────────────────────────────────
  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    if (status !== 'idle' && status !== 'drawn') return;
    e.preventDefault();
    const res = getCtx();
    if (!res) return;
    const { canvas, ctx } = res;
    isDrawingRef.current = true;
    const pos = getPos(e, canvas);
    lastPosRef.current = pos;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a5f';
    ctx.fill();
  }, [status]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const res = getCtx();
    if (!res) return;
    const { canvas, ctx } = res;
    const pos = getPos(e, canvas);
    const last = lastPosRef.current;
    if (!last) { lastPosRef.current = pos; return; }

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPosRef.current = pos;

    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setHasDrawn(true);
    }
  }, []);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    if (hasDrawnRef.current) {
      setStatus('drawn');
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', startDraw, { passive: false });
    canvas.addEventListener('mousemove', draw, { passive: false });
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', endDraw);
      canvas.removeEventListener('mouseleave', endDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', endDraw);
    };
  }, [startDraw, draw, endDraw]);

  const clearCanvas = () => {
    const res = getCtx();
    if (!res) return;
    res.ctx.clearRect(0, 0, res.canvas.width, res.canvas.height);
    hasDrawnRef.current = false;
    setHasDrawn(false);
    setStatus('idle');
  };

  const generateNew = () => {
    clearCanvas();
    setTarget(getRandomTarget());
    setStatus('idle');
  };

  const handleConfirm = () => {
    if (!hasDrawn) return;
    // Go to self-check: did the child write the correct number?
    setStatus('selfcheck');
  };

  const handleSelfCheck = (correct: boolean) => {
    if (correct) {
      setStatus('correct');
      addXp(15);
      triggerConfetti('medium', { colors: ['#8b5cf6', '#a78bfa', '#fcd34d', '#60a5fa'] });
      const nextProgress = progress + 20;
      setProgress(nextProgress);
      setTimeout(() => {
        if (nextProgress >= 100) {
          navigate('/app/stage/fluisterbos');
        } else {
          generateNew();
        }
      }, 1800);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      setTimeout(() => {
        if (nextLives <= 0) {
          navigate('/app/stage/fluisterbos');
        } else {
          clearCanvas();
          setStatus('idle');
        }
      }, 1600);
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-violet-100 via-purple-50 to-fuchsia-50 flex flex-col overflow-hidden relative">

      {/* ── Floating magic decorations ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {['✨','🪄','💫','🌸','⭐','✏️','💜','🌺'].map((icon, i) => (
          <span key={i} className="absolute select-none" style={{
            left: `${[7, 20, 33, 50, 63, 76, 87, 93][i]}%`,
            top:  `${[8, 70, 22, 88, 14, 58, 35, 76][i]}%`,
            fontSize: `${[16, 14, 20, 12, 18, 22, 14, 16][i]}px`,
            opacity: 0.12,
            transform: `rotate(${i * 25}deg)`,
          }}>{icon}</span>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 pt-10 pb-4 flex-shrink-0 shadow-lg relative z-10">
        <div className="flex items-center gap-3 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate('/app/stage/fluisterbos')}
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

        {/* Instruction card with dots */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-violet-700 mb-3 flex items-center gap-1.5">
            <span className="text-lg">✏️</span>
            Schrijf het getal dat je ziet met je vinger!
          </p>

          <motion.div
            key={target}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="bg-white/90 rounded-3xl border-2 border-violet-200 shadow-md p-5 flex items-center justify-between"
          >
            <div>
              <p className="font-black text-slate-800 mb-1">Hoeveel stippen zie je?</p>
              <TenFrameDots count={target} />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shadow-lg ml-4 flex-shrink-0 ring-4 ring-violet-200">
              <span className="font-black text-white" style={{ fontSize: 36 }}>?</span>
            </div>
          </motion.div>
        </div>

        {/* Drawing canvas */}
        <div className="flex-shrink-0" style={{ height: 260 }}>
          <div className={cn(
            'relative w-full h-full rounded-3xl overflow-hidden border-2 transition-colors duration-300',
            status === 'correct'
              ? 'border-violet-400 bg-violet-50'
              : status === 'incorrect'
                ? 'border-red-300 bg-red-50'
                : status === 'selfcheck'
                  ? 'border-amber-300 bg-amber-50'
                  : hasDrawn
                    ? 'border-violet-300 bg-white'
                    : 'border-dashed border-violet-200 bg-white/80',
          )}>
            {/* Lined paper background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.07]"
              style={{
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #8b5cf6 39px, #8b5cf6 40px)',
                backgroundPositionY: '20px',
              }}
            />

            {/* Empty hint */}
            {!hasDrawn && status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 z-0">
                <span className="text-5xl opacity-15">✏️</span>
                <p className="text-violet-300 font-bold text-sm">Schrijf hier je getal</p>
              </div>
            )}

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: status === 'selfcheck' ? 'default' : 'crosshair' }}
            />

            {/* Status overlay */}
            <AnimatePresence>
              {status === 'correct' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-violet-400/15 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-violet-400 to-fuchsia-500 rounded-full p-4 shadow-xl ring-4 ring-violet-200">
                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                </motion.div>
              )}
              {status === 'incorrect' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-red-400/15 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-red-400 to-rose-500 rounded-full p-4 shadow-xl ring-4 ring-red-200">
                    <X className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                </motion.div>
              )}
              {status === 'selfcheck' && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-4 bg-gradient-to-t from-amber-50/95 to-transparent pt-10"
                >
                  <p className="font-black text-slate-800 mb-3 text-center">
                    Heb je het getal <span className="text-violet-600">{target}</span> geschreven?
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSelfCheck(false)}
                      className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-red-300 text-red-600 rounded-2xl font-black shadow-sm hover:bg-red-50 transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" strokeWidth={2.5} />
                      Nee, opnieuw
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSelfCheck(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 border-2 border-violet-600 text-white rounded-2xl font-black shadow-sm hover:from-violet-600 hover:to-fuchsia-600 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" strokeWidth={2.5} />
                      Ja, klopt!
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Feedback banners */}
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
                Oeps! Probeer het getal <span className="text-orange-900">{target}</span> nog eens te schrijven!
              </p>
            </motion.div>
          )}
          {status === 'correct' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex-shrink-0 flex items-center gap-2 bg-violet-50 border-2 border-violet-200 rounded-2xl px-4 py-3 shadow-sm"
            >
              <span className="text-lg">🎉</span>
              <p className="text-sm font-bold text-violet-700">
                Geweldig! Je hebt het getal {target} geschreven! +15 XP
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom spacing */}
        <div className="flex-shrink-0 h-2" />
      </div>

      {/* ── Sticky action bar ── */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-t-2 border-violet-100 px-4 py-3 shadow-[0_-4px_20px_rgba(139,92,246,0.12)] relative z-10">
        <div className="max-w-md mx-auto w-full flex items-center gap-3">
          <button
            onClick={clearCanvas}
            disabled={!hasDrawn || status === 'selfcheck'}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all flex-shrink-0',
              hasDrawn && status !== 'selfcheck'
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 active:scale-95'
                : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
            )}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            Wis alles
          </button>

          <motion.button
            whileTap={{ scale: hasDrawn && status === 'idle' ? 0.94 : 1 }}
            onClick={handleConfirm}
            disabled={!hasDrawn || status !== 'idle'}
            className={cn(
              'ml-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95',
              hasDrawn && status === 'idle'
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border border-violet-600'
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