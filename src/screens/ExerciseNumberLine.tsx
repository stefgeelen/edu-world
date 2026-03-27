import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Heart, HeartCrack, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useGame } from '@/context/GameContext';

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
  const { addXp } = useGame();

  const [slots, setSlots] = useState<Slot[]>(makeSlots);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [roundDone, setRoundDone] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [checking, setChecking] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const drawnOnce = useRef(false);

  const blanks = slots.filter(s => s.isBlank);
  const filled = blanks.filter(s => s.filled);
  const allFilled = blanks.length > 0 && filled.length === blanks.length;
  const remaining = blanks.length - filled.length;

  // Reset canvas state whenever the active slot changes
  useEffect(() => {
    isDrawing.current = false;
    lastPt.current = null;
    drawnOnce.current = false;
    setHasDrawn(false);
    setChecking(false);

    if (activeSlot !== null) {
      // Small delay so the sheet finishes mounting before we clear
      const t = setTimeout(() => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [activeSlot]);

  // ── Canvas pointer handlers (no useEffect needed — React events are reliable) ──

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (checking) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId); // keep events even if pointer leaves
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPosFromPointer(e, canvas);
    lastPt.current = pos;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#312e81';
    ctx.fill();
  }, [checking]);

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
      ctx.strokeStyle = '#312e81';
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

  // ── Canvas actions ─────────────────────────────────────────────────────

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    isDrawing.current = false;
    lastPt.current = null;
    drawnOnce.current = false;
    setHasDrawn(false);
    setChecking(false);
  }, []);

  const handleConfirmDraw = () => {
    if (!hasDrawn) return;
    setChecking(true);
  };

  const handleSelfCheck = (correct: boolean) => {
    if (correct) {
      setSlots(prev =>
        prev.map(s =>
          s.value === activeSlot ? { ...s, filled: true } : s
        )
      );
      setActiveSlot(null);
    } else {
      const next = lives - 1;
      setLives(next);
      clearCanvas();
      if (next <= 0) {
        setTimeout(() => navigate('/stage/fluisterbos'), 1200);
      }
    }
  };

  const handleCheckAll = () => {
    if (!allFilled || roundDone) return;
    setRoundDone(true);
    addXp(20);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#818cf8', '#a5b4fc', '#fcd34d', '#34d399', '#60a5fa'],
    });
    const nextProg = progress + 25;
    setProgress(nextProg);
    setTimeout(() => {
      if (nextProg >= 100) {
        navigate('/stage/fluisterbos');
      } else {
        setSlots(makeSlots());
        setRoundDone(false);
      }
    }, 2200);
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-indigo-100 via-violet-50 to-purple-50 flex flex-col overflow-hidden relative">

      {/* ── Floating star decorations ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {['⭐','🌟','✨','💜','🔮','⭐','✨','🌟'].map((icon, i) => (
          <span key={i} className="absolute select-none" style={{
            left: `${[5, 17, 32, 48, 62, 74, 85, 92][i]}%`,
            top:  `${[10, 75, 25, 88, 15, 55, 38, 72][i]}%`,
            fontSize: `${[18, 14, 22, 12, 20, 16, 18, 14][i]}px`,
            opacity: 0.12,
            transform: `rotate(${i * 28}deg)`,
          }}>{icon}</span>
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-4 pt-10 pb-4 flex-shrink-0 shadow-lg relative z-10">
        <div className="flex items-center gap-3 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate('/stage/fluisterbos')}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-2xl transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          <div className="flex-1 h-3.5 bg-white/30 rounded-full overflow-hidden shadow-inner">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', damping: 20 }}
              className="h-full bg-white rounded-full shadow-sm"
            />
          </div>

          <div className="flex gap-1 flex-shrink-0">
            {[0, 1, 2].map(i =>
              i < lives
                ? <Heart key={i} className="w-5 h-5 text-red-300 fill-red-300 drop-shadow" />
                : <HeartCrack key={i} className="w-5 h-5 text-white/30" />
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-4 pt-5 gap-5 max-w-md mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        {/* Instruction card */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-1.5">
            <span className="text-lg">🔢</span>
            Tik op een vraagteken om het getal te schrijven!
          </p>
          <div className="bg-white/90 rounded-3xl border-2 border-indigo-200 shadow-md p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-md flex-shrink-0 text-2xl ring-2 ring-indigo-200">
              📏
            </div>
            <div>
              <p className="font-black text-slate-800 mb-0.5">Vul de getallenlijn in!</p>
              <p className="text-sm text-slate-500 leading-snug">
                <span className="font-black text-indigo-600">{filled.length}</span>
                {' '}van{' '}
                <span className="font-black text-indigo-600">{blanks.length}</span>
                {' '}lege vakjes ingevuld
              </p>
            </div>
          </div>
        </div>

        {/* Number line */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-violet-50 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-violet-50 to-transparent pointer-events-none z-10" />
            <div className="overflow-x-auto pb-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex items-center px-4 pt-3 pb-1" style={{ minWidth: 'max-content' }}>
                {slots.map((slot, idx) => {
                  const isActive = activeSlot === slot.value;
                  const isGiven = !slot.isBlank;
                  const isFilled = slot.isBlank && slot.filled;
                  const isEmpty = slot.isBlank && !slot.filled;
                  return (
                    <React.Fragment key={slot.value}>
                      {idx > 0 && (
                        <div className={cn(
                          'h-1.5 w-5 flex-shrink-0 rounded-full',
                          isFilled ? 'bg-violet-400' : isGiven ? 'bg-indigo-400' : 'bg-indigo-200'
                        )} />
                      )}
                      <button
                        onClick={() => { if (isEmpty && !roundDone) setActiveSlot(slot.value); }}
                        disabled={!isEmpty || roundDone}
                        className={cn(
                          'relative w-14 h-14 rounded-2xl flex items-center justify-center font-black flex-shrink-0 border-2 transition-all shadow-md',
                          isGiven && 'bg-gradient-to-b from-indigo-400 to-indigo-600 border-indigo-700 text-white cursor-default',
                          isEmpty && !roundDone && 'bg-white border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer',
                          isEmpty && roundDone && 'bg-white border-dashed border-slate-300 cursor-default',
                          isFilled && 'bg-gradient-to-b from-violet-400 to-violet-600 border-violet-700 text-white cursor-default',
                          isActive && 'ring-4 ring-indigo-200 scale-110 shadow-indigo-200',
                        )}
                        style={{ fontSize: 22 }}
                      >
                        {isGiven && <span>{slot.value}</span>}
                        {isFilled && <span>{slot.value}</span>}
                        {isEmpty && (
                          <span className={cn('font-black text-xl', isActive ? 'text-indigo-500' : 'text-indigo-300')}>?</span>
                        )}
                        {isFilled && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                        {isEmpty && !roundDone && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-400 flex items-center justify-center shadow-sm">
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
              <div className="w-4 h-4 rounded-lg bg-gradient-to-b from-indigo-400 to-indigo-600 border border-indigo-700 flex-shrink-0" />
              <span className="text-xs font-bold text-indigo-400">Gegeven</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-lg bg-white border-2 border-dashed border-indigo-300 flex-shrink-0" />
              <span className="text-xs font-bold text-indigo-400">Leeg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-lg bg-gradient-to-b from-violet-400 to-violet-600 border border-violet-700 flex-shrink-0" />
              <span className="text-xs font-bold text-violet-400">Ingevuld</span>
            </div>
          </div>
        </div>

        {/* Tip card */}
        {filled.length === 0 && (
          <div className="flex-shrink-0 bg-indigo-100 border-2 border-indigo-200 rounded-2xl px-4 py-3 flex items-start gap-2 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-bold text-indigo-700">
              Tik op een vakje met een <span className="text-indigo-900">?</span> en schrijf het juiste getal met je vinger!
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
              className="flex-shrink-0 flex items-center gap-3 bg-indigo-100 border-2 border-indigo-300 rounded-2xl px-4 py-3 shadow-md"
            >
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-black text-indigo-800">Geweldig gedaan!</p>
                <p className="text-sm font-bold text-indigo-600">De getallenlijn is compleet! +20 XP</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 h-2" />
      </div>

      {/* ── Sticky check bar ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-t-2 border-indigo-100 px-4 py-3 shadow-[0_-4px_20px_rgba(99,102,241,0.12)] relative z-10">
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={handleCheckAll}
            disabled={!allFilled || roundDone}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black transition-all shadow-md',
              allFilled && !roundDone
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border border-indigo-600'
                : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
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
            className="absolute inset-0 bg-indigo-900/40 z-40"
          />
        )}
      </AnimatePresence>

      {/* ── Canvas bottom sheet — fixed 70 % of screen height ─────────── */}
      <AnimatePresence>
        {activeSlot !== null && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-white to-indigo-50 rounded-t-[2rem] shadow-[0_-8px_48px_rgba(99,102,241,0.25)] z-50 flex flex-col border-t-4 border-indigo-200"
            style={{ height: '70vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-indigo-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
              <div>
                <p className="font-black text-slate-800 text-base">Schrijf het getal</p>
                <p className="text-sm text-slate-500">
                  Welk getal hoort op plek{' '}
                  <span className="font-black text-indigo-600">{activeSlot}</span>?
                </p>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-indigo-600" strokeWidth={2.5} />
              </button>
            </div>

            {/* Mini number line context */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div
                className="bg-indigo-100 rounded-2xl p-2.5 overflow-x-auto flex items-center gap-0 border border-indigo-200"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {slots.map((s, idx) => {
                  const isTarget = s.value === activeSlot;
                  return (
                    <React.Fragment key={s.value}>
                      {idx > 0 && <div className="h-0.5 w-3 flex-shrink-0 bg-indigo-300" />}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 border shadow-sm',
                          isTarget
                            ? 'bg-indigo-500 border-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1'
                            : !s.isBlank
                              ? 'bg-indigo-400 border-indigo-500 text-white'
                              : s.filled
                                ? 'bg-violet-400 border-violet-500 text-white'
                                : 'bg-white border-dashed border-indigo-300 text-indigo-300'
                        )}
                      >
                        {isTarget ? '?' : (s.isBlank && !s.filled) ? '?' : s.value}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ── Drawing canvas — fills remaining space ── */}
            <div className="flex-1 px-5 pb-2 min-h-0">
              <div
                className={cn(
                  'relative w-full h-full rounded-2xl border-2 transition-colors duration-300',
                  checking
                    ? 'border-amber-300 bg-amber-50'
                    : hasDrawn
                      ? 'border-indigo-300 bg-white'
                      : 'border-dashed border-indigo-200 bg-white'
                )}
              >
                {/* Lined-paper guide */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.07]"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #94a3b8 39px, #94a3b8 40px)',
                    backgroundPositionY: '20px',
                  }}
                />

                {/* Empty hint */}
                {!hasDrawn && !checking && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                    <span className="text-5xl opacity-10">✏️</span>
                    <p className="text-indigo-300 font-bold text-sm">Schrijf hier het getal</p>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={900}
                  height={600}
                  className="absolute inset-0 w-full h-full rounded-2xl"
                  style={{
                    touchAction: 'none',
                    cursor: checking ? 'default' : 'crosshair',
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />

                {/* Self-check overlay */}
                <AnimatePresence>
                  {checking && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-5 bg-gradient-to-t from-amber-50/98 via-amber-50/80 to-transparent pt-12 rounded-b-2xl"
                    >
                      <p className="font-black text-slate-800 mb-3 text-center text-sm px-4">
                        Heb je het getal{' '}
                        <span className="text-indigo-600 text-base">{activeSlot}</span>{' '}
                        geschreven?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelfCheck(false)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-red-300 text-red-600 rounded-2xl font-black text-sm shadow-sm hover:bg-red-50 transition-colors"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Nee, opnieuw
                        </button>
                        <button
                          onClick={() => handleSelfCheck(true)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 border-2 border-indigo-600 text-white rounded-2xl font-black text-sm shadow-sm hover:from-indigo-600 hover:to-violet-600 transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Ja, klopt!
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Action bar ── */}
            <div className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-t border-indigo-100">
              <button
                onClick={clearCanvas}
                disabled={!hasDrawn || checking}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all',
                  hasDrawn && !checking
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 active:scale-95'
                    : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                )}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                Wis alles
              </button>

              <button
                onClick={handleConfirmDraw}
                disabled={!hasDrawn || checking}
                className={cn(
                  'ml-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95',
                  hasDrawn && !checking
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border border-indigo-600'
                    : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                )}
              >
                <Check className="w-4 h-4" strokeWidth={3} />
                Controleer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}