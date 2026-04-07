import React, { useState, useRef, useEffect, useCallback } from 'react'; // letter exercise
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useGame } from '@/context/GameContext';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useSpeech } from '@/hooks/useSpeech';

// ── Cursive-style letter SVG paths (100 × 130 normalized space) ────────────
// Each path approximates a handwritten lowercase letter
const LETTER_PATHS: Record<string, string> = {
  a: 'M 70 40 C 70 20 30 20 30 50 C 30 75 70 75 70 50 L 70 40 L 70 90',
  b: 'M 30 10 L 30 90 M 30 50 C 30 25 70 25 70 50 C 70 75 30 75 30 50',
  c: 'M 70 35 C 55 20 30 25 30 55 C 30 85 55 90 70 75',
  d: 'M 70 10 L 70 90 M 70 50 C 70 25 30 25 30 50 C 30 75 70 75 70 50',
  e: 'M 30 55 L 70 55 C 70 30 55 20 42 20 C 28 20 30 35 30 55 C 30 80 55 90 70 78',
  f: 'M 65 10 C 50 10 40 20 40 40 L 40 90 M 25 45 L 60 45',
  g: 'M 70 40 C 70 20 30 20 30 50 C 30 75 70 75 70 50 L 70 40 L 70 110 C 70 125 45 125 30 115',
  h: 'M 30 10 L 30 90 M 30 50 C 30 30 70 30 70 50 L 70 90',
  i: 'M 50 35 L 50 90 M 50 18 L 50 22',
  j: 'M 55 35 L 55 110 C 55 125 35 125 25 115 M 55 18 L 55 22',
  k: 'M 30 10 L 30 90 M 65 35 L 30 60 L 65 90',
  l: 'M 50 10 L 50 90',
  m: 'M 15 90 L 15 40 M 15 50 C 15 30 40 30 40 50 L 40 90 M 40 50 C 40 30 65 30 65 50 L 65 90',
  n: 'M 30 90 L 30 40 M 30 50 C 30 30 70 30 70 50 L 70 90',
  o: 'M 50 25 C 75 25 75 75 50 75 C 25 75 25 25 50 25 Z',
  p: 'M 30 40 L 30 120 M 30 50 C 30 25 70 25 70 50 C 70 75 30 75 30 50',
  q: 'M 70 40 L 70 120 M 70 50 C 70 25 30 25 30 50 C 30 75 70 75 70 50',
  r: 'M 30 90 L 30 40 M 30 55 C 35 30 55 25 70 35',
  s: 'M 65 32 C 55 20 30 22 30 40 C 30 55 70 55 70 72 C 70 90 45 92 35 80',
  t: 'M 45 10 L 45 90 M 25 35 L 65 35',
  u: 'M 30 40 L 30 70 C 30 90 70 90 70 70 L 70 40',
  v: 'M 25 35 L 50 90 L 75 35',
  w: 'M 15 35 L 30 90 L 50 50 L 70 90 L 85 35',
  x: 'M 25 35 L 75 90 M 75 35 L 25 90',
  y: 'M 25 35 L 50 70 M 75 35 L 40 115',
  z: 'M 25 35 L 75 35 L 25 90 L 75 90',
};

const ALPHABET = Object.keys(LETTER_PATHS);

const GUIDE_CONFIGS = [
  { dash: [4.5, 2.0], lineW: 6,   alpha: 0.90, label: 'Volg de stippellijn helemaal!' },
  { dash: [4.0, 6.5], lineW: 5.5, alpha: 0.80, label: 'Volg de stippellijn!' },
  { dash: [3.5, 15],  lineW: 5,   alpha: 0.70, label: 'Steeds minder hulp…' },
  { dash: [3.0, 32],  lineW: 5,   alpha: 0.60, label: 'Bijna zonder hulp!' },
  { dash: [2.5, 70],  lineW: 5,   alpha: 0.50, label: 'Schrijf het zelf!' },
] as const;

const TOTAL_ITERATIONS = 5;
const NW = 100;
const NH = 130;
const DRAW_COLOR  = '#a78bfa';
const DRAW_WIDTH  = 13;
const CHECK_TOL   = 12;
const THRESHOLD   = 0.35;
const ANIM_MS     = 2600;

// ── Path-sampling engine ───────────────────────────────────────────────────

interface SamplePt { x: number; y: number; up: boolean }
interface SubpathStart { x: number; y: number; dx: number; dy: number }

function buildRawSamples(pathStr: string): SamplePt[] {
  const pts: SamplePt[] = [];
  const re = /[MLCQZ]|[-+]?[\d.]+(?:[eE][-+]?\d+)?/gi;
  const tokens = pathStr.match(re) || [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0;
  let firstM = true;
  const n = () => parseFloat(tokens[i++]);
  const isCmd = (s?: string) => s !== undefined && /^[MLCQZ]$/i.test(s);

  while (i < tokens.length) {
    const tok = tokens[i];
    if (!isCmd(tok)) { i++; continue; }
    const cmd = tok.toUpperCase();
    i++;
    if (cmd === 'M') {
      cx = n(); cy = n(); sx = cx; sy = cy;
      pts.push({ x: cx, y: cy, up: !firstM }); firstM = false;
    } else if (cmd === 'L') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const ex = n(), ey = n();
        for (let j = 1; j <= 16; j++) { const t = j / 16; pts.push({ x: cx + (ex - cx) * t, y: cy + (ey - cy) * t, up: false }); }
        cx = ex; cy = ey;
      }
    } else if (cmd === 'C') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const c1x = n(), c1y = n(), c2x = n(), c2y = n(), ex = n(), ey = n();
        for (let j = 1; j <= 28; j++) {
          const t = j / 28, u = 1 - t;
          pts.push({ x: u*u*u*cx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*ex, y: u*u*u*cy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ey, up: false });
        }
        cx = ex; cy = ey;
      }
    } else if (cmd === 'Q') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const c1x = n(), c1y = n(), ex = n(), ey = n();
        for (let j = 1; j <= 20; j++) {
          const t = j / 20, u = 1 - t;
          pts.push({ x: u*u*cx + 2*u*t*c1x + t*t*ex, y: u*u*cy + 2*u*t*c1y + t*t*ey, up: false });
        }
        cx = ex; cy = ey;
      }
    } else if (cmd === 'Z') {
      if (Math.abs(cx - sx) > 0.5 || Math.abs(cy - sy) > 0.5) {
        for (let j = 1; j <= 10; j++) { const t = j / 10; pts.push({ x: cx + (sx - cx) * t, y: cy + (sy - cy) * t, up: false }); }
      }
      cx = sx; cy = sy;
    }
  }
  return pts;
}

function buildCumLengths(pts: SamplePt[]): { lens: number[]; total: number } {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].up) { lens.push(lens[i - 1]); }
    else { const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y; lens.push(lens[i - 1] + Math.sqrt(dx * dx + dy * dy)); }
  }
  return { lens, total: lens[lens.length - 1] || 1 };
}

function getSubpathStarts(pathStr: string): SubpathStart[] {
  const results: SubpathStart[] = [];
  const re = /[MLCQZ]|[-+]?[\d.]+(?:[eE][-+]?\d+)?/gi;
  const tokens = pathStr.match(re) || [];
  let i = 0;
  const isCmd = (s?: string) => s !== undefined && /^[MLCQZ]$/i.test(s);
  const n = () => parseFloat(tokens[i++]);
  let cx = 0, cy = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    if (!isCmd(tok)) { i++; continue; }
    const cmd = tok.toUpperCase(); i++;
    if (cmd === 'M') {
      cx = n(); cy = n();
      const sx = cx, sy = cy;
      const j = i;
      let dx = 0, dy = 1;
      if (i < tokens.length) {
        const nc = tokens[i].toUpperCase();
        if (nc === 'L') { i++; const ex = n(), ey = n(); dx = ex - sx; dy = ey - sy; i = j; }
        else if (nc === 'C') { i++; const c1x = n(), c1y = n(); dx = c1x - sx; dy = c1y - sy; if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) { i++; i++; dx = n() - sx; dy = n() - sy; } i = j; }
        else if (nc === 'Q') { i++; dx = n() - sx; dy = n() - sy; i = j; }
      }
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) { dx /= len; dy /= len; }
      results.push({ x: sx, y: sy, dx, dy });
    } else {
      while (i < tokens.length && !isCmd(tokens[i])) i++;
    }
  }
  return results;
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, size: number) {
  const angle = Math.atan2(dy, dx);
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.65, -size * 0.55); ctx.lineTo(-size * 0.25, 0); ctx.lineTo(-size * 0.65, size * 0.55); ctx.closePath();
  ctx.fillStyle = '#16a34a'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.6; ctx.stroke(); ctx.restore();
}

function getTransform(cw: number, ch: number) {
  const pad = Math.min(cw, ch) * 0.08;
  const dW = cw - pad * 2, dH = ch - pad * 2;
  const scale = Math.min(dW / NW, dH / NH);
  const ox = pad + (dW - NW * scale) / 2, oy = pad + (dH - NH * scale) / 2;
  return { scale, ox, oy };
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ExerciseWriteLetter() {
  const navigate = useNavigate();
  const { addXp } = useGame();
  const { speak: speakWord } = useSpeech();

  const pickRandomLetter = useCallback(() => ALPHABET[Math.floor(Math.random() * ALPHABET.length)], []);

  const [currentLetter, setCurrentLetter] = useState(pickRandomLetter);

  const containerRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const isDown = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animPts = useRef<SamplePt[]>([]);
  const animLens = useRef<number[]>([]);
  const animTotal = useRef<number>(1);
  const animStart = useRef<number>(0);

  const [cSize, setCSize] = useState({ w: 300, h: 380 });
  const [iteration, setIteration] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);
  const [isAnimating, setIsAnimating] = useState(false);

  const progress = (iteration / TOTAL_ITERATIONS) * 100;
  const guideCfg = GUIDE_CONFIGS[Math.min(iteration, GUIDE_CONFIGS.length - 1)];
  const pathStr = LETTER_PATHS[currentLetter] || LETTER_PATHS['a'];
  const isMultiStroke = getSubpathStarts(pathStr).length > 1;

  // Speak the letter on load and when it changes
  useEffect(() => {
    const timer = setTimeout(() => speakWord(currentLetter), 400);
    return () => clearTimeout(timer);
  }, [currentLetter, speakWord]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      if (animTimeoutRef.current !== null) clearTimeout(animTimeoutRef.current);
    };
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
    const canvas = guideRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = cSize;
    ctx.clearRect(0, 0, w, h);
    const { scale, ox, oy } = getTransform(w, h);
    const p2d = new Path2D(pathStr);
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = guideCfg.lineW + 4;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash(guideCfg.dash as unknown as number[]);
    ctx.stroke(p2d);
    ctx.strokeStyle = `rgba(251,146,60,${guideCfg.alpha})`;
    ctx.lineWidth = guideCfg.lineW;
    ctx.stroke(p2d);
    ctx.setLineDash([]);
    const starts = getSubpathStarts(pathStr);
    starts.forEach(({ x, y, dx, dy }, idx) => {
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e'; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
      if (isMultiStroke) {
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 5.5px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), x, y);
      }
      if (guideCfg.alpha > 0.45) {
        const arrowDist = 12;
        drawArrowHead(ctx, x + dx * arrowDist, y + dy * arrowDist, dx, dy, 4.5);
      }
    });
    ctx.restore();
  }, [cSize, pathStr, guideCfg, isMultiStroke]);

  useEffect(() => { drawGuide(); }, [drawGuide]);

  const startDemo = useCallback(() => {
    if (isAnimating) return;
    const raw = buildRawSamples(pathStr);
    const { lens, total } = buildCumLengths(raw);
    animPts.current = raw; animLens.current = lens;
    animTotal.current = total; animStart.current = performance.now();
    setIsAnimating(true);

    const frame = (now: number) => {
      const prog = Math.min((now - animStart.current) / ANIM_MS, 1);
      const targetLen = prog * animTotal.current;
      const ctx = animRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cSize.w, cSize.h);
      const pts = animPts.current, ls = animLens.current;
      let lo = 0, hi = ls.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ls[mid] <= targetLen) lo = mid; else hi = mid; }
      const segFrac = ls[hi] === ls[lo] ? 0 : (targetLen - ls[lo]) / (ls[hi] - ls[lo]);
      const ballPt = pts[lo] && pts[hi] ? { x: pts[lo].x + (pts[hi].x - pts[lo].x) * segFrac, y: pts[lo].y + (pts[hi].y - pts[lo].y) * segFrac } : (pts[lo] || pts[0]);
      const { scale, ox, oy } = getTransform(cSize.w, cSize.h);
      ctx.save(); ctx.setTransform(scale, 0, 0, scale, ox, oy); ctx.setLineDash([]);
      if (lo > 0) {
        ctx.beginPath(); ctx.strokeStyle = 'rgba(34,197,94,0.80)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        let penDown = false;
        for (let k = 0; k <= lo; k++) { const pt = pts[k]; if (k === 0 || pt.up) { ctx.moveTo(pt.x, pt.y); penDown = true; } else if (penDown) { ctx.lineTo(pt.x, pt.y); } }
        ctx.stroke();
      }
      ctx.shadowColor = 'rgba(34,197,94,0.5)'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(ballPt.x, ballPt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#16a34a'; ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      if (prog < 1) { animFrameRef.current = requestAnimationFrame(frame); }
      else { animTimeoutRef.current = setTimeout(() => { const c = animRef.current?.getContext('2d'); if (c) c.clearRect(0, 0, cSize.w, cSize.h); setIsAnimating(false); }, 700); }
    };
    animFrameRef.current = requestAnimationFrame(frame);
  }, [isAnimating, pathStr, cSize]);

  const canvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = drawRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (cSize.w / rect.width), y: (e.clientY - rect.top) * (cSize.h / rect.height) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (status !== 'idle' || isAnimating) return;
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
    const ref = document.createElement('canvas');
    ref.width = cSize.w; ref.height = cSize.h;
    const rc = ref.getContext('2d')!;
    const { scale, ox, oy } = getTransform(cSize.w, cSize.h);
    rc.save(); rc.setTransform(scale, 0, 0, scale, ox, oy);
    rc.strokeStyle = '#000'; rc.lineWidth = CHECK_TOL; rc.lineCap = 'round'; rc.lineJoin = 'round'; rc.setLineDash([]);
    rc.stroke(new Path2D(pathStr)); rc.restore();
    const rData = rc.getImageData(0, 0, cSize.w, cSize.h).data;
    const dData = dc.getContext('2d')!.getImageData(0, 0, cSize.w, cSize.h).data;
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
      setStatus('correct'); addXp(15);
      triggerConfetti('large', { colors: ['#f97316', '#fcd34d', '#34d399', '#60a5fa', '#c084fc'], originY: 0.45 });
      setTimeout(() => {
        const next = iteration + 1;
        if (next >= TOTAL_ITERATIONS) { navigate('/app/stage/fluisterbos'); }
        else {
          setIteration(next);
          setCurrentLetter(pickRandomLetter());
          clearDrawing();
        }
      }, 2000);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1; setLives(nextLives);
      setTimeout(() => { if (nextLives <= 0) navigate('/app/stage/fluisterbos'); else clearDrawing(); }, 1800);
    }
  }, [cSize, pathStr, hasDrawn, status, iteration, lives, addXp, navigate, clearDrawing, pickRandomLetter]);

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/stage/fluisterbos')}
    >
      {/* ── Info bar ── */}
      <div className="px-4 pt-3 pb-2 max-w-md mx-auto w-full flex-shrink-0 z-10">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-bold text-[#9d8bce] flex items-center gap-1.5">
            <span className="text-base">✏️</span>
            {guideCfg.label}
          </p>
          <button
            onClick={() => speakWord(currentLetter)}
            className="flex items-center gap-2 bg-[#1c1134]/60 border border-[#3b2d71] rounded-2xl px-3 py-1.5 hover:bg-[#2d1b54] transition-colors"
          >
            <span className="font-black text-orange-400" style={{ fontSize: 28, fontFamily: "'Caveat', cursive" }}>{currentLetter}</span>
            <span className="text-xs font-bold text-orange-300/80">🔊</span>
          </button>
        </div>

        {isMultiStroke && (
          <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 mb-2 flex items-center gap-1.5">
            <span>☝️</span>
            Schrijf in meerdere streken — volg de nummers op het scherm!
          </p>
        )}

        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_ITERATIONS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 flex-1 rounded-full transition-all duration-500',
                i < iteration ? 'bg-emerald-400' :
                i === iteration ? 'bg-orange-400' :
                'bg-[#3b2d71]'
              )}
            />
          ))}
        </div>
        <p className="text-xs font-bold text-[#4c3b82] mt-1.5 text-right">
          Stap {iteration + 1} van {TOTAL_ITERATIONS}
        </p>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 min-h-0 px-4 max-w-md mx-auto w-full z-10">
        <div
          ref={containerRef}
          className={cn(
            'relative h-full rounded-3xl overflow-hidden border-2 shadow-sm transition-colors duration-300 bg-[#1c1134]',
            status === 'correct' ? 'border-emerald-400/50' :
            status === 'incorrect' ? 'border-red-400/50' :
            isAnimating ? 'border-emerald-400/30' :
            'border-[#3b2d71]'
          )}
        >
          <canvas ref={guideRef} width={cSize.w} height={cSize.h} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
          <canvas ref={animRef} width={cSize.w} height={cSize.h} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
          <canvas
            ref={drawRef} width={cSize.w} height={cSize.h}
            className="absolute inset-0 w-full h-full"
            style={{ touchAction: 'none', cursor: isAnimating ? 'not-allowed' : 'crosshair' }}
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
                  {status === 'correct' ? (iteration + 1 >= TOTAL_ITERATIONS ? 'Geweldig! Klaar!' : 'Super! Volgende letter!') : 'Probeer nog eens!'}
                </p>
                {status === 'correct' && (
                  <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-sm font-bold text-emerald-300">+15 XP</motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isAnimating && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-sm">🎬 Kijk hoe het gaat…</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!hasDrawn && !isAnimating && status === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
                <span className="text-xs font-bold text-[#4c3b82] bg-[#1c1134]/80 px-3 py-1.5 rounded-full">👆 Teken hier met je vinger</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Demo button ── */}
      <div className="px-4 pt-2.5 max-w-md mx-auto w-full flex-shrink-0 z-10">
        <motion.button
          whileTap={!isAnimating && status === 'idle' ? { scale: 0.97 } : {}}
          onClick={startDemo}
          disabled={isAnimating || status !== 'idle'}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold transition-all text-sm',
            !isAnimating && status === 'idle'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-sm'
              : 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed'
          )}
        >
          <Eye className="w-4 h-4" strokeWidth={2.5} />
          {isAnimating ? 'Bezig met voordoen…' : 'Bekijk hoe het moet'}
        </motion.button>
      </div>

      {/* ── Action buttons ── */}
      <div className="px-4 pt-2 pb-7 max-w-md mx-auto w-full flex-shrink-0 z-10">
        <div className="flex gap-3">
          <motion.button
            whileTap={hasDrawn && status === 'idle' ? { scale: 0.95 } : {}}
            onClick={clearDrawing}
            disabled={!hasDrawn || status !== 'idle'}
            className={cn(
              'flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 font-bold transition-all flex-shrink-0',
              hasDrawn && status === 'idle'
                ? 'bg-[#2d1b54] border-[#4c3b82] text-white/80 hover:bg-red-500/20 hover:border-red-400/50 shadow-sm'
                : 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
            Wis
          </motion.button>

          <motion.button
            whileTap={hasDrawn && status === 'idle' ? { scale: 0.95 } : {}}
            onClick={checkDrawing}
            disabled={!hasDrawn || status !== 'idle'}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold transition-all shadow-sm',
              hasDrawn && status === 'idle'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-700 text-white hover:from-orange-600 hover:to-orange-700'
                : 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed'
            )}
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            Controleer
          </motion.button>
        </div>
      </div>
    </ExerciseShell>
  );
}
