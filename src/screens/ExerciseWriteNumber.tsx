import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
// addXp removed — XP handled by complete_exercise RPC
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { supabase } from '@/integrations/supabase/client';

function getRandomTarget() {
  return Math.floor(Math.random() * 10) + 1;
}

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
                    ? 'bg-gradient-to-br from-violet-400 to-violet-600 border-violet-700 shadow-violet-200/30'
                    : 'bg-[#1c1134] border-[#3b2d71]'
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
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const correctCount = useRef(0);
  const startTimeRef = useRef(Date.now());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef(false);

  const [target, setTarget] = useState(getRandomTarget);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'drawn' | 'checking' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedbackText, setFeedbackText] = useState('');

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
    ctx.fillStyle = '#a78bfa';
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
    ctx.strokeStyle = '#a78bfa';
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
    setFeedbackText('');
  };

  const generateNew = () => {
    clearCanvas();
    setTarget(getRandomTarget());
    setStatus('idle');
    setFeedbackText('');
  };

  const getCanvasBase64 = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1]; // strip "data:image/png;base64,"
  };

  const handleConfirm = async () => {
    if (!hasDrawn || status === 'checking') return;
    setStatus('checking');
    setFeedbackText('');

    const imageBase64 = getCanvasBase64();
    if (!imageBase64) {
      setStatus('drawn');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('recognize-digit', {
        body: { imageBase64, target },
      });

      if (error) throw error;

      if (data.isCorrect) {
        setStatus('correct');
        correctCount.current += 1;
        // XP handled by complete_exercise RPC
        triggerConfetti('medium', { colors: ['#8b5cf6', '#a78bfa', '#fcd34d', '#60a5fa'] });
        const nextProgress = progress + 20;
        setProgress(nextProgress);
        setFeedbackText(`Geweldig! Je hebt het getal ${target} geschreven! +15 XP`);
        setTimeout(() => {
          if (nextProgress >= 100) {
            if (exerciseId) {
              const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
              completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: 5, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
            }
            navigate('/app/stage/fluisterbos');
          } else {
            generateNew();
          }
        }, 1800);
      } else {
        setStatus('incorrect');
        const recognized = data.recognized;
        const nextLives = lives - 1;
        setLives(nextLives);

        if (recognized !== null) {
          setFeedbackText(`Hmm, ik zie het getal ${recognized}, maar we zoeken ${target}. Probeer het nog eens!`);
        } else {
          setFeedbackText(`Oeps! Ik kon het getal niet herkennen. Schrijf het getal ${target} nog eens!`);
        }

        setTimeout(() => {
          if (nextLives <= 0) {
            navigate('/app/stage/fluisterbos');
          } else {
            clearCanvas();
            setStatus('idle');
          }
        }, 2200);
      }
    } catch (err) {
      console.error('Recognition error:', err);
      setFeedbackText('Er ging iets mis. Probeer het nog eens!');
      setStatus('drawn');
    }
  };

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/stage/fluisterbos')}
    >
      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col px-4 pt-5 gap-4 max-w-md mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        {/* Instruction card with dots */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-[#9d8bce] mb-3 flex items-center gap-1.5">
            <span className="text-lg">✏️</span>
            Schrijf het getal dat je ziet met je vinger!
          </p>

          <motion.div
            key={target}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="bg-[#1c1134]/60 backdrop-blur-sm rounded-3xl border-2 border-[#3b2d71] shadow-md p-5 flex items-center justify-between"
          >
            <div>
              <p className="font-black text-white mb-1">Hoeveel stippen zie je?</p>
              <TenFrameDots count={target} />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shadow-lg ml-4 flex-shrink-0 ring-4 ring-violet-200/20">
              <span className="font-black text-white" style={{ fontSize: 36 }}>?</span>
            </div>
          </motion.div>
        </div>

        {/* Drawing canvas */}
        <div className="flex-shrink-0" style={{ height: 260 }}>
          <div className={cn(
            'relative w-full h-full rounded-3xl overflow-hidden border-2 transition-colors duration-300',
            status === 'correct'
              ? 'border-emerald-400/50 bg-[#1c1134]'
              : status === 'incorrect'
                ? 'border-red-400/50 bg-[#1c1134]'
                : status === 'checking'
                  ? 'border-amber-400/50 bg-[#1c1134]'
                  : hasDrawn
                    ? 'border-[#4c3b82] bg-[#1c1134]'
                    : 'border-dashed border-[#3b2d71] bg-[#1c1134]/80',
          )}>
            {/* Lined paper background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.05]"
              style={{
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #a78bfa 39px, #a78bfa 40px)',
                backgroundPositionY: '20px',
              }}
            />

            {/* Empty hint */}
            {!hasDrawn && status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 z-0">
                <span className="text-5xl opacity-15">✏️</span>
                <p className="text-[#4c3b82] font-bold text-sm">Schrijf hier je getal</p>
              </div>
            )}

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: status === 'checking' ? 'wait' : 'crosshair' }}
            />

            {/* Status overlay */}
            <AnimatePresence>
              {status === 'correct' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-emerald-400/15 backdrop-blur-[1px] pointer-events-none"
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
                  className="absolute inset-0 flex items-center justify-center bg-red-400/15 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-red-400 to-rose-500 rounded-full p-4 shadow-xl ring-4 ring-red-200/30">
                    <X className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                </motion.div>
              )}
              {status === 'checking' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-[#1c1134]/40 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-violet-400 to-violet-600 rounded-full p-4 shadow-xl ring-4 ring-violet-200/30">
                    <Loader2 className="w-10 h-10 text-white animate-spin" strokeWidth={3} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Feedback banners */}
        <AnimatePresence>
          {feedbackText && (status === 'incorrect' || status === 'correct') && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-sm border-2',
                status === 'correct'
                  ? 'bg-emerald-500/20 border-emerald-400/30'
                  : 'bg-orange-500/20 border-orange-400/30'
              )}
            >
              {status === 'correct' ? (
                <span className="text-lg">🎉</span>
              ) : (
                <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0" />
              )}
              <p className={cn(
                'text-sm font-bold',
                status === 'correct' ? 'text-emerald-400' : 'text-orange-300'
              )}>
                {feedbackText}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 h-2" />
      </div>

      {/* ── Sticky action bar ── */}
      <div className="flex-shrink-0 bg-[#1a103c]/90 backdrop-blur-sm border-t-2 border-[#3b2d71] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] relative z-10">
        <div className="max-w-md mx-auto w-full flex items-center gap-3">
          <button
            onClick={clearCanvas}
            disabled={!hasDrawn || status === 'checking'}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all flex-shrink-0',
              hasDrawn && status !== 'checking'
                ? 'bg-[#2d1b54] border-[#4c3b82] text-white/80 hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-400 active:scale-95'
                : 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed'
            )}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            Wis alles
          </button>

          <motion.button
            whileTap={{ scale: hasDrawn && (status === 'idle' || status === 'drawn') ? 0.94 : 1 }}
            onClick={handleConfirm}
            disabled={!hasDrawn || (status !== 'idle' && status !== 'drawn')}
            className={cn(
              'ml-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95',
              hasDrawn && (status === 'idle' || status === 'drawn')
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-700'
                : 'bg-[#1c1134] text-[#3b2d71] border border-[#3b2d71] cursor-not-allowed'
            )}
          >
            {status === 'checking' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" strokeWidth={3} />
            )}
            {status === 'checking' ? 'Controleren...' : 'Controleer'}
          </motion.button>
        </div>
      </div>
    </ExerciseShell>
  );
}
