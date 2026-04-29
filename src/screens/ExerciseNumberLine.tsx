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
import { useSpeech } from '@/hooks/useSpeech';

// ── Types ──────────────────────────────────────────────────────────────────

interface Slot {
  value: number;
  isBlank: boolean;
  filled: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSlots(): Slot[] {
  const indices = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
  }
  const blanks = new Set([indices[0], indices[1], indices[2]]);
  const result: Slot[] = [];
  for (let n = 0; n <= 10; n++) {
    result.push({ value: n, isBlank: blanks.has(n), filled: false });
  }
  return result;
}

function getPosFromPointer(
  e: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export function ExerciseNumberLine() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());
  const { speak } = useSpeech();

  const [slots, setSlots] = useState<Slot[]>(makeSlots);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [roundDone, setRoundDone] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'correct' | 'incorrect'>('idle');
  const [feedbackText, setFeedbackText] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const drawnOnce = useRef(false);

  const blanks = slots.filter(s => s.isBlank);
  const filled = blanks.filter(s => s.filled);
  const allFilled = blanks.length > 0 && filled.length === blanks.length;
  const remaining = blanks.length - filled.length;

  useEffect(() => {
    if (activeSlot !== null) {
      const t = setTimeout(() => speak(`Schrijf het getal ${activeSlot}`), 300);
      return () => clearTimeout(t);
    }
  }, [activeSlot, speak]);

  useEffect(() => {
    isDrawing.current = false;
    lastPt.current = null;
    drawnOnce.current = false;
    setHasDrawn(false);
    setCheckStatus('idle');
    setFeedbackText('');

    if (activeSlot !== null) {
      const t = setTimeout(() => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [activeSlot]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (checkStatus !== 'idle') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPosFromPointer(e, canvas);
    lastPt.current = pos;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#a78bfa';
    ctx.fill();
  }, [checkStatus]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPosFromPointer(e, canvas);
    const last = lastPt.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    lastPt.current = pos;
    if (!drawnOnce.current) {
      drawnOnce.current = true;
      setHasDrawn(true);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPt.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    isDrawing.current = false;
    lastPt.current = null;
    drawnOnce.current = false;
    setHasDrawn(false);
    setCheckStatus('idle');
    setFeedbackText('');
  }, []);


  const getCanvasBase64 = (): string | null => {
    const c = canvasRef.current;
    if (!c) return null;
    return c.toDataURL('image/png').split(',')[1];
  };

  const handleConfirmDraw = async () => {
    if (!hasDrawn || checkStatus === 'checking' || activeSlot === null) return;
    setCheckStatus('checking');
    setFeedbackText('');

    const imageBase64 = getCanvasBase64();
    if (!imageBase64) { setCheckStatus('idle'); return; }

    try {
      const { data, error } = await supabase.functions.invoke('recognize-digit', {
        body: { imageBase64, target: activeSlot },
      });
      if (error) throw error;

      if (data.isCorrect) {
        setCheckStatus('correct');
        setFeedbackText(`Goed zo! Dat is inderdaad ${activeSlot}!`);
        setTimeout(() => {
          setSlots(prev => prev.map(s => s.value === activeSlot ? { ...s, filled: true } : s));
          setActiveSlot(null);
          setCheckStatus('idle');
          setFeedbackText('');
        }, 1400);
      } else {
        setCheckStatus('incorrect');
        const recognized = data.recognized;
        const nextLives = lives - 1;
        setLives(nextLives);
        setFeedbackText(
          recognized !== null
            ? `Hmm, ik zie ${recognized}, maar we zoeken ${activeSlot}. Probeer het nog eens!`
            : `Ik kon het getal niet herkennen. Schrijf ${activeSlot} nog eens!`
        );
        setTimeout(() => {
          if (nextLives <= 0) {
            navigate('/app/stage/fluisterbos');
          } else {
            clearCanvas();
            setCheckStatus('idle');
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Recognition error:', err);
      setFeedbackText('Mijn ogen werken even niet — teken het getal nog eens!');
      setCheckStatus('idle');
    }
  };

  const handleCheckAll = () => {
    if (!allFilled || roundDone) return;
    setRoundDone(true);
    correctCount.current += 1;
    // XP handled by complete_exercise RPC
    triggerConfetti('large', { colors: ['#818cf8', '#a5b4fc', '#fcd34d', '#34d399', '#60a5fa'], originY: 0.5 });
    const nextProg = progress + 25;
    setProgress(nextProg);
    setTimeout(() => {
      if (nextProg >= 100) {
        if (exerciseId) {
          const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
          completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: 4, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
        }
        navigate('/app/stage/fluisterbos');
      } else {
        setSlots(makeSlots());
        setRoundDone(false);
      }
    }, 2200);
  };

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/stage/fluisterbos')}
    >
      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-4 pt-5 gap-5 max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        {/* Instruction card */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-[#9d8bce] mb-3 flex items-center gap-1.5">
            <span className="text-lg">🔢</span>
            Tik op een vraagteken om het getal te schrijven!
          </p>
          <div className="bg-[#1c1134]/60 backdrop-blur-sm rounded-3xl border-2 border-[#3b2d71] shadow-md p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-md flex-shrink-0 text-2xl ring-2 ring-indigo-200/30">
              📏
            </div>
            <div>
              <p className="font-black text-white mb-0.5">Vul de getallenlijn in!</p>
              <p className="text-sm text-white/60 leading-snug">
                <span className="font-black text-emerald-400">{filled.length}</span>
                {' '}van{' '}
                <span className="font-black text-emerald-400">{blanks.length}</span>
                {' '}lege vakjes ingevuld
              </p>
            </div>
          </div>
        </div>

        {/* Number line */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#0a0618] to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#0a0618] to-transparent pointer-events-none z-10" />
            <div className="overflow-x-auto pb-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex items-center justify-center px-2 sm:px-4 pt-3 pb-1" style={{ minWidth: 'max-content' }}>
                {slots.map((slot, idx) => {
                  const isActive = activeSlot === slot.value;
                  const isGiven = !slot.isBlank;
                  const isFilled = slot.isBlank && slot.filled;
                  const isEmpty = slot.isBlank && !slot.filled;
                  return (
                    <React.Fragment key={slot.value}>
                      {idx > 0 && (
                        <div className={cn(
                          'h-1 sm:h-1.5 w-3 sm:w-5 md:w-7 flex-shrink-0 rounded-full',
                          isFilled ? 'bg-violet-400' : isGiven ? 'bg-[#4c3b82]' : 'bg-[#3b2d71]'
                        )} />
                      )}
                      <button
                        onClick={() => { if (isEmpty && !roundDone) setActiveSlot(slot.value); }}
                        disabled={!isEmpty || roundDone}
                        className={cn(
                          'relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center font-black flex-shrink-0 border-2 transition-all shadow-md text-base sm:text-lg md:text-xl',
                          isGiven && 'bg-gradient-to-b from-indigo-500 to-indigo-700 border-indigo-800 text-white cursor-default',
                          isEmpty && !roundDone && 'bg-[#1c1134] border-dashed border-[#4c3b82] hover:border-[#a78bfa] hover:bg-[#2d1b54] cursor-pointer',
                          isEmpty && roundDone && 'bg-[#1c1134] border-dashed border-[#3b2d71] cursor-default',
                          isFilled && 'bg-gradient-to-b from-violet-400 to-violet-600 border-violet-700 text-white cursor-default',
                          isActive && 'ring-4 ring-[#a78bfa]/50 scale-110 shadow-[#a78bfa]/30',
                        )}
                        style={{ fontSize: undefined }}
                      >
                        {isGiven && <span>{slot.value}</span>}
                        {isFilled && <span>{slot.value}</span>}
                        {isEmpty && (
                          <span className={cn('font-black text-xl', isActive ? 'text-[#a78bfa]' : 'text-[#4c3b82]')}>?</span>
                        )}
                        {isFilled && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                        {isEmpty && !roundDone && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#4c3b82] flex items-center justify-center shadow-sm">
                            <span style={{ fontSize: 9, color: 'white', fontWeight: 900 }}>✏</span>
                          </div>
                        )}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-1 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-700 border border-indigo-800 flex-shrink-0" />
              <span className="text-xs font-bold text-[#9d8bce]">Gegeven</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-lg bg-[#1c1134] border-2 border-dashed border-[#4c3b82] flex-shrink-0" />
              <span className="text-xs font-bold text-[#9d8bce]">Leeg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-lg bg-gradient-to-b from-violet-400 to-violet-600 border border-violet-700 flex-shrink-0" />
              <span className="text-xs font-bold text-violet-400">Ingevuld</span>
            </div>
          </div>
        </div>

        {/* Tip card */}
        {filled.length === 0 && (
          <div className="flex-shrink-0 bg-[#1c1134]/60 border-2 border-[#3b2d71] rounded-2xl px-4 py-3 flex items-start gap-2 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#a78bfa] mt-0.5 flex-shrink-0" />
            <p className="text-sm font-bold text-white/80">
              Tik op een vakje met een <span className="text-[#a78bfa]">?</span> en schrijf het juiste getal met je vinger!
            </p>
          </div>
        )}

        {/* Success card */}
        <AnimatePresence>
          {roundDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-shrink-0 flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-500/40 rounded-2xl px-4 py-3 shadow-md"
            >
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-black text-emerald-400">Geweldig gedaan!</p>
                <p className="text-sm font-bold text-emerald-300/80">De getallenlijn is compleet! +20 XP</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 h-2" />
      </div>

      {/* ── Sticky check bar ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#1a103c]/90 backdrop-blur-sm border-t-2 border-[#3b2d71] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] relative z-10">
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto w-full">
          <button
            onClick={handleCheckAll}
            disabled={!allFilled || roundDone}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black transition-all shadow-md',
              allFilled && !roundDone
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-700'
                : 'bg-[#1c1134] text-[#4c3b82] border border-[#3b2d71] cursor-not-allowed'
            )}
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            {allFilled && !roundDone
              ? 'Controleer mijn antwoorden!'
              : `${remaining} ${remaining === 1 ? 'vakje' : 'vakjes'} nog in te vullen`}
          </button>
        </div>
      </div>

      {/* ── Backdrop ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeSlot !== null && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSlot(null)}
            className="absolute inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* ── Canvas bottom sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {activeSlot !== null && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#1a103c] to-[#0a0618] rounded-t-[2rem] shadow-[0_-8px_48px_rgba(0,0,0,0.5)] z-50 flex flex-col border-t-4 border-[#3b2d71] max-w-2xl mx-auto"
            style={{ height: '65vh', maxHeight: 600 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-[#3b2d71]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
              <div>
                <p className="font-black text-white text-base">Schrijf het getal</p>
                <p className="text-sm text-white/60">
                  Welk getal hoort op plek{' '}
                  <span className="font-black text-[#a78bfa]">{activeSlot}</span>?
                </p>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                className="p-2 bg-[#2d1b54] hover:bg-[#3b2d71] rounded-xl transition-colors"
              >
                <span className="text-[#9d8bce] font-bold text-sm">✕</span>
              </button>
            </div>

            {/* Mini number line context */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div
                className="bg-[#1c1134] rounded-2xl p-2.5 overflow-x-auto flex items-center gap-0 border border-[#3b2d71]"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {slots.map((s, idx) => {
                  const isTarget = s.value === activeSlot;
                  return (
                    <React.Fragment key={s.value}>
                      {idx > 0 && <div className="h-0.5 w-3 flex-shrink-0 bg-[#4c3b82]" />}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 border shadow-sm',
                          isTarget
                            ? 'bg-[#a78bfa] border-[#8b5cf6] text-white ring-2 ring-[#a78bfa]/40 ring-offset-1 ring-offset-[#1c1134]'
                            : !s.isBlank
                              ? 'bg-indigo-500 border-indigo-600 text-white'
                              : s.filled
                                ? 'bg-violet-500 border-violet-600 text-white'
                                : 'bg-[#1c1134] border-dashed border-[#4c3b82] text-[#4c3b82]'
                        )}
                      >
                        {isTarget ? '?' : (s.isBlank && !s.filled) ? '?' : s.value}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ── Drawing canvas ── */}
            <div className="flex-1 px-5 pb-2 min-h-0">
              <div
                className={cn(
                  'relative w-full h-full rounded-2xl border-2 transition-colors duration-300',
                  checkStatus === 'checking'
                    ? 'border-amber-400/50 bg-[#1c1134]'
                    : checkStatus === 'correct'
                      ? 'border-emerald-400/50 bg-[#1c1134]'
                      : checkStatus === 'incorrect'
                        ? 'border-red-400/50 bg-[#1c1134]'
                        : hasDrawn
                          ? 'border-[#4c3b82] bg-[#1c1134]'
                          : 'border-dashed border-[#3b2d71] bg-[#1c1134]'
                )}
              >
                {/* Lined-paper guide */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.05]"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #a78bfa 39px, #a78bfa 40px)',
                    backgroundPositionY: '20px',
                  }}
                />

                {/* Empty hint */}
                {!hasDrawn && checkStatus === 'idle' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                    <span className="text-5xl opacity-10">✏️</span>
                    <p className="text-[#4c3b82] font-bold text-sm">Schrijf hier het getal</p>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={900}
                  height={600}
                  className="absolute inset-0 w-full h-full rounded-2xl"
                  style={{
                    touchAction: 'none',
                    cursor: checkStatus !== 'idle' ? 'default' : 'crosshair',
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />

                {/* Status overlay */}
                <AnimatePresence>
                  {checkStatus === 'correct' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-emerald-400/15 backdrop-blur-[1px] pointer-events-none rounded-2xl"
                    >
                      <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full p-4 shadow-xl ring-4 ring-emerald-200/30">
                        <Check className="w-10 h-10 text-white" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}
                  {checkStatus === 'incorrect' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-red-400/15 backdrop-blur-[1px] pointer-events-none rounded-2xl"
                    >
                      <div className="bg-gradient-to-br from-red-400 to-rose-500 rounded-full p-4 shadow-xl ring-4 ring-red-200/30">
                        <X className="w-10 h-10 text-white" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}
                  {checkStatus === 'checking' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-[#1c1134]/40 backdrop-blur-[1px] pointer-events-none rounded-2xl"
                    >
                      <div className="bg-gradient-to-br from-violet-400 to-violet-600 rounded-full p-4 shadow-xl ring-4 ring-violet-200/30">
                        <Loader2 className="w-10 h-10 text-white animate-spin" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Feedback text */}
                <AnimatePresence>
                  {feedbackText && (checkStatus === 'correct' || checkStatus === 'incorrect') && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'absolute inset-x-3 bottom-3 rounded-xl px-3 py-2 text-center',
                        checkStatus === 'correct' ? 'bg-emerald-500/30' : 'bg-orange-500/30'
                      )}
                    >
                      <p className={cn('text-xs font-black', checkStatus === 'correct' ? 'text-emerald-400' : 'text-orange-300')}>
                        {feedbackText}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Action bar ── */}
            <div className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-t border-[#3b2d71]">
              <button
                onClick={clearCanvas}
                disabled={!hasDrawn || checkStatus === 'checking'}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all',
                  hasDrawn && checkStatus !== 'checking'
                    ? 'bg-[#2d1b54] border-[#4c3b82] text-white/80 hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-400 active:scale-95'
                    : 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed'
                )}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                Wis alles
              </button>

              <button
                onClick={handleConfirmDraw}
                disabled={!hasDrawn || (checkStatus !== 'idle')}
                className={cn(
                  'ml-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95',
                  hasDrawn && checkStatus === 'idle'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-700'
                    : 'bg-[#1c1134] text-[#3b2d71] border border-[#3b2d71] cursor-not-allowed'
                )}
              >
                {checkStatus === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" strokeWidth={3} />
                )}
                {checkStatus === 'checking' ? 'Controleren...' : 'Controleer'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ExerciseShell>
  );
}
