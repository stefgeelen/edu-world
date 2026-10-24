import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { letterSound } from '@/data/letterSounds';
import { CheckButton, ClearButton, ExerciseActionBar, ExercisePrompt } from '@/components/exercise/ExerciseParts';

import { LETTER_FILLED, LETTER_X_EXTENT } from './letterFilledPaths';
import { exerciseExitPath } from '@/routes/paths';

/*
 * Writing a letter the way it is done on paper in the first grade: between
 * three lines. On the left of the lines the example letter, written out; on
 * the right the same letter in dots, to write over. One letter per round:
 * each step gives less help, and in the last step the child writes it alone.
 */

const ALPHABET = Object.keys(LETTER_FILLED);

const STEPS = [
  { dots: 0.95, hint: 'Schrijf over de stippellijn.' },
  { dots: 0.95, hint: 'Schrijf over de stippellijn.' },
  { dots: 0.55, hint: 'Steeds minder hulp…' },
  { dots: 0.28, hint: 'Bijna zonder hulp!' },
  { dots: 0,    hint: 'Nu helemaal zelf!' },
] as const;

const TOTAL_ITERATIONS = STEPS.length;

// The glyphs live in a 100 × 130 box. These are its three writing lines:
// tall letters reach the top line, small letters sit between the middle line
// and the base line, and tails (g, j, p…) hang below the base line.
const TOP_LINE = 2;
const MIDDLE_LINE = 45;
const BASE_LINE = 84;
const SCENE_TOP = -6;
const SCENE_BOTTOM = 136;

const SIDE_MARGIN = 10; // glyph units left and right of the letters
const LETTER_GAP = 30;  // glyph units between the example and the letter to write
const MIN_SCENE_W = 160; // so a thin letter like i does not blow up

const DRAW_COLOR = '#a78bfa';
const DRAW_WIDTH = 13;
const CHECK_TOL  = 12;
const THRESHOLD  = 0.35;

interface Layout {
  scale: number;
  /** Canvas x of glyph x = 0 for the example letter and for the letter to write. */
  exampleX: number;
  writeX: number;
  /** Canvas y of glyph y = 0. */
  oy: number;
}

function getLayout(cw: number, ch: number, letter: string): Layout {
  const [left, right] = LETTER_X_EXTENT[letter] ?? [0, 100];
  const width = right - left;
  const sceneW = Math.max(MIN_SCENE_W, width * 2 + LETTER_GAP + SIDE_MARGIN * 2);
  const sceneH = SCENE_BOTTOM - SCENE_TOP;
  const scale = Math.min(cw / sceneW, ch / sceneH);
  const sx = (cw - sceneW * scale) / 2;
  const contentW = width * 2 + LETTER_GAP;
  const firstLeft = sx + ((sceneW - contentW) / 2) * scale;
  return {
    scale,
    exampleX: firstLeft - left * scale,
    writeX: firstLeft + (width + LETTER_GAP) * scale - left * scale,
    oy: (ch - sceneH * scale) / 2 - SCENE_TOP * scale,
  };
}

/** The letter as a field of small dots, like a dotted letter on a worksheet. */
function fillDotted(ctx: CanvasRenderingContext2D, glyph: Path2D, alpha: number) {
  ctx.save();
  ctx.clip(glyph, 'evenodd');
  ctx.fillStyle = `rgba(251,146,60,${alpha})`;
  const step = 2.6;
  for (let y = SCENE_TOP, row = 0; y < SCENE_BOTTOM; y += step, row++) {
    for (let x = (row % 2) * step / 2; x < 100; x += step) {
      ctx.beginPath(); ctx.arc(x, y, 0.85, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ExerciseWriteLetter() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const correctCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  const { id } = useParams<{ id?: string }>();
  // Allow forcing a specific letter via URL (e.g. /exercises/write-letter/g) for testing.
  // Numeric ids (real exercise ids) fall through to random selection used in the platform.
  const forcedLetter = id && /^[a-z]$/i.test(id) && ALPHABET.includes(id.toLowerCase())
    ? id.toLowerCase()
    : null;

  // One letter for the whole round, like one worksheet per letter.
  const [letter] = useState(() => forcedLetter ?? ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);

  const containerRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const isDown = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cSize, setCSize] = useState({ w: 300, h: 380 });
  const [iteration, setIteration] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);

  const progress = (iteration / TOTAL_ITERATIONS) * 100;
  const step = STEPS[Math.min(iteration, STEPS.length - 1)];
  const glyphPath = LETTER_FILLED[letter];
  const dpr = window.devicePixelRatio || 1;

  useEffect(() => () => {
    if (feedbackTimeoutRef.current !== null) clearTimeout(feedbackTimeoutRef.current);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setCSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const drawGuide = useCallback(() => {
    const ctx = guideRef.current?.getContext('2d');
    if (!ctx) return;
    const { w, h } = cSize;
    // Sharp on high-density screens: the guide canvas has dpr pixels per CSS pixel.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const { scale, exampleX, writeX, oy } = getLayout(w, h, letter);

    // The three writing lines, across the whole width.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    for (const y of [TOP_LINE, MIDDLE_LINE, BASE_LINE]) {
      ctx.beginPath(); ctx.moveTo(12, oy + y * scale); ctx.lineTo(w - 12, oy + y * scale); ctx.stroke();
    }
    ctx.restore();

    const glyph = new Path2D(glyphPath);

    // The example letter, written out.
    ctx.save();
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, exampleX * dpr, oy * dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fill(glyph, 'evenodd');
    ctx.restore();

    // The letter to write over, in dots that fade step by step.
    if (step.dots > 0) {
      ctx.save();
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, writeX * dpr, oy * dpr);
      fillDotted(ctx, glyph, step.dots);
      ctx.restore();
    }
  }, [cSize, letter, glyphPath, step, dpr]);

  useEffect(() => { drawGuide(); }, [drawGuide]);

  const canvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = drawRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (cSize.w / rect.width), y: (e.clientY - rect.top) * (cSize.h / rect.height) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (status !== 'idle') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDown.current = true;
    const pos = canvasPos(e);
    lastPt.current = pos;
    const ctx = drawRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, DRAW_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = DRAW_COLOR; ctx.fill();
    setHasDrawn(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDown.current || status !== 'idle' || !lastPt.current) return;
    const pos = canvasPos(e);
    const ctx = drawRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = DRAW_COLOR; ctx.lineWidth = DRAW_WIDTH; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    lastPt.current = pos;
  };

  const onPointerUp = () => { isDown.current = false; lastPt.current = null; };

  const clearDrawing = useCallback(() => {
    const ctx = drawRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cSize.w, cSize.h);
    setHasDrawn(false); setStatus('idle');
  }, [cSize]);

  const checkDrawing = useCallback(() => {
    const dc = drawRef.current;
    if (!dc || !hasDrawn || status !== 'idle') return;
    const { w, h } = cSize;
    const dData = dc.getContext('2d')!.getImageData(0, 0, w, h).data;

    // Where along the lines the child wrote does not matter, how high does:
    // the letter must sit on the lines. So line the reference letter up with
    // the middle of the drawing, but keep it at the height of the lines.
    let minX = w, maxX = -1;
    for (let i = 3; i < dData.length; i += 4) {
      if (dData[i] > 50) {
        const x = ((i - 3) / 4) % w;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    const { scale, writeX, oy } = getLayout(w, h, letter);
    const [left, right] = LETTER_X_EXTENT[letter] ?? [0, 100];
    const refCenter = writeX + ((left + right) / 2) * scale;
    const drawCenter = maxX >= minX ? (minX + maxX) / 2 : refCenter;

    const ref = document.createElement('canvas');
    ref.width = w; ref.height = h;
    const rc = ref.getContext('2d')!;
    rc.save(); rc.setTransform(scale, 0, 0, scale, writeX + drawCenter - refCenter, oy);
    const refPath = new Path2D(glyphPath);
    // Drawing must fall inside the letter, with a small halo of tolerance around thin parts.
    rc.fillStyle = '#000';
    rc.fill(refPath, 'evenodd');
    rc.strokeStyle = '#000'; rc.lineWidth = CHECK_TOL * 0.6; rc.lineJoin = 'round'; rc.lineCap = 'round';
    rc.stroke(refPath);
    rc.restore();
    const rData = rc.getImageData(0, 0, w, h).data;

    let refPx = 0, overlap = 0, drawn = 0;
    for (let i = 3; i < rData.length; i += 4) {
      if (rData[i] > 50) refPx++;
      if (dData[i] > 50) drawn++;
      if (rData[i] > 50 && dData[i] > 50) overlap++;
    }
    const inZone = drawn > 0 ? overlap / drawn : 0;
    const minPixels = Math.max(200, refPx * 0.05);
    const isCorrect = drawn >= minPixels && inZone >= THRESHOLD;

    if (isCorrect) {
      setStatus('correct'); correctCountRef.current += 1;
      triggerConfetti('large', { colors: ['#f97316', '#fcd34d', '#34d399', '#60a5fa', '#c084fc'], originY: 0.45 });
      feedbackTimeoutRef.current = setTimeout(() => {
        const next = iteration + 1;
        if (next >= TOTAL_ITERATIONS) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
            completeExercise.mutate({ exerciseId, score: correctCountRef.current, maxScore: TOTAL_ITERATIONS, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
          }
          navigate(exerciseExitPath());
        } else {
          setIteration(next);
          clearDrawing();
        }
      }, 2000);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1; setLives(nextLives);
      feedbackTimeoutRef.current = setTimeout(() => { if (nextLives <= 0) navigate(exerciseExitPath()); else clearDrawing(); }, 1800);
    }
  }, [cSize, letter, glyphPath, hasDrawn, status, iteration, lives, navigate, clearDrawing, exerciseId, completeExercise]);

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(exerciseExitPath())}
      explain={[EXPLAIN.writeLetter, `Schrijf de ${letterSound(letter)}.`]}
    >
      <div className="px-4 max-w-md mx-auto w-full flex-shrink-0 z-10">
        <ExercisePrompt className="mb-1">
          Schrijf de letter <span className="text-orange-400">{letter}</span>
        </ExercisePrompt>
        <p className="mb-3 text-center text-sm font-bold text-[#9d8bce]">{step.hint}</p>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 min-h-0 px-4 pb-4 max-w-md mx-auto w-full z-10">
        <div
          ref={containerRef}
          className={cn(
            'relative h-full rounded-3xl overflow-hidden border-2 shadow-sm transition-colors duration-300 bg-[#1c1134]',
            status === 'correct' ? 'border-emerald-400/50' :
            status === 'incorrect' ? 'border-red-400/50' :
            'border-[#3b2d71]'
          )}
        >
          <canvas ref={guideRef} width={cSize.w * dpr} height={cSize.h * dpr} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
          <canvas
            ref={drawRef} width={cSize.w} height={cSize.h}
            className="absolute inset-0 w-full h-full"
            style={{ touchAction: 'none', cursor: 'crosshair' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onPointerCancel={onPointerUp}
          />

          {/* Feedback overlay */}
          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={cn('absolute inset-0 flex flex-col items-center justify-center gap-3', status === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20')}
              >
                <motion.span initial={{ scale: 0.4, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.5 }} style={{ fontSize: 72 }}>
                  {status === 'correct' ? '🌟' : '🌱'}
                </motion.span>
                <p className={cn('font-black', status === 'correct' ? 'text-emerald-400' : 'text-red-400')} style={{ fontSize: 22 }}>
                  {status === 'correct' ? (iteration + 1 >= TOTAL_ITERATIONS ? 'Geweldig! Klaar!' : 'Super! Nog een keer!') : 'Probeer nog eens!'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!hasDrawn && status === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
                <span className="text-xs font-bold text-[#4c3b82] bg-[#1c1134]/80 px-3 py-1.5 rounded-full">👆 Schrijf met je vinger tussen de lijnen</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ExerciseActionBar>
        <ClearButton onClick={clearDrawing} disabled={!hasDrawn || status !== 'idle'} />
        <CheckButton onClick={checkDrawing} disabled={!hasDrawn || status !== 'idle'} />
      </ExerciseActionBar>
    </ExerciseShell>
  );
}
