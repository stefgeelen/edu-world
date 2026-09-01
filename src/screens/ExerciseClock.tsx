import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useExerciseState } from '@/hooks/useExerciseState';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';
import { DEFAULT_CLOCK } from '@/data/difficultyConfig';

/* ── Types ──────────────────────────────────────────────────── */
interface ClockTask {
  hour: number;   // 1-12
  half: boolean;   // true = half hour
  label: string;   // e.g. "Het is twee uur"
  digital: string; // e.g. "14:00"
}

/* ── Task generation ────────────────────────────────────────── */
function generateTask(allowHalf = true): ClockTask {
  const hour = Math.floor(Math.random() * 12) + 1;
  const half = allowHalf && Math.random() < 0.5;

  const hourNames = [
    '', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes',
    'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf',
  ];

  let label: string;
  let digital: string;

  if (half) {
    // "half drie" means 2:30 in Dutch
    const nextHour = hour === 12 ? 1 : hour + 1;
    label = `Het is half ${hourNames[nextHour]}`;
    digital = `${hour}:30`;
  } else {
    label = `Het is ${hourNames[hour]} uur`;
    digital = `${hour}:00`;
  }

  return { hour, half, label, digital };
}

/* ── Angle utilities ────────────────────────────────────────── */
/** Convert hour (1-12) + half to the expected hour-hand angle in degrees */
function expectedHourAngle(hour: number, half: boolean): number {
  // Each hour = 30°, half adds 15°
  return (hour % 12) * 30 + (half ? 15 : 0);
}

/** Expected minute-hand angle: 0° for :00, 180° for :30 */
function expectedMinuteAngle(half: boolean): number {
  return half ? 180 : 0;
}

/** Snap angle to nearest 15° (hour + half-hour positions) */
function snapHour(angle: number): number {
  return Math.round(angle / 15) * 15;
}

/** Snap minute to nearest 30° (each number position) */
function snapMinute(angle: number): number {
  return Math.round(((angle % 360 + 360) % 360) / 30) * 30 % 360;
}

/** Normalize angle to 0-360 */
function norm(angle: number): number {
  return ((angle % 360) + 360) % 360;
}


/* ── Clock Face component ───────────────────────────────────── */
interface ClockFaceProps {
  hourAngle: number;
  minuteAngle: number;
  onHourChange: (angle: number) => void;
  onMinuteChange: (angle: number) => void;
  status: 'idle' | 'correct' | 'incorrect';
}

function ClockFace({ hourAngle, minuteAngle, onHourChange, onMinuteChange, status }: ClockFaceProps) {
  const clockRef = useRef<SVGSVGElement>(null);
  const [activeHand, setActiveHand] = useState<'hour' | 'minute'>('hour');
  const isDragging = useRef(false);

  const getAngleFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!clockRef.current) return 0;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    return norm(Math.atan2(dy, dx) * (180 / Math.PI) + 90);
  }, []);

  const applyAngle = useCallback((clientX: number, clientY: number) => {
    const angle = getAngleFromPointer(clientX, clientY);
    if (activeHand === 'hour') {
      onHourChange(snapHour(angle));
    } else {
      onMinuteChange(snapMinute(angle));
    }
  }, [activeHand, getAngleFromPointer, onHourChange, onMinuteChange]);

  // Use document-level listeners so dragging works even outside the SVG
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      applyAngle(e.clientX, e.clientY);
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [applyAngle]);

  const handleClockPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    applyAngle(e.clientX, e.clientY);
  }, [applyAngle]);

  const handleHandTap = useCallback((hand: 'hour' | 'minute') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHand(hand);
    isDragging.current = true;
  }, []);

  const borderColor = status === 'correct' ? '#22c55e' : status === 'incorrect' ? '#ef4444' : '#8b7ab8';

  // Hand tip positions for the glow indicator
  const hourTipAngleRad = (hourAngle - 90) * (Math.PI / 180);
  const minuteTipAngleRad = (minuteAngle - 90) * (Math.PI / 180);

  return (
    <motion.div
      animate={status === 'incorrect' ? { x: [0, -8, 8, -8, 8, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center gap-3"
    >
      {/* Hand selector tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveHand('hour')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
            activeHand === 'hour'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
              : 'bg-[#2d1b54] text-white/50 border border-[#3b2d71]'
          }`}
        >
          Korte wijzer 🔴
        </button>
        <button
          type="button"
          onClick={() => setActiveHand('minute')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
            activeHand === 'minute'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
              : 'bg-[#2d1b54] text-white/50 border border-[#3b2d71]'
          }`}
        >
          Lange wijzer 🔵
        </button>
      </div>

      <svg
        ref={clockRef}
        viewBox="0 0 200 200"
        className="w-64 h-64 md:w-80 md:h-80 touch-none select-none"
        onPointerDown={handleClockPointerDown}
      >
        {/* Clock body */}
        <circle cx="100" cy="100" r="96" fill="#1c1134" stroke={borderColor} strokeWidth="4" />
        <circle cx="100" cy="100" r="90" fill="#2d1b54" stroke="#3b2d71" strokeWidth="2" />

        {/* Tick marks */}
        {[...Array(12)].map((_, i) => {
          const a = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 78 * Math.cos(a);
          const y1 = 100 + 78 * Math.sin(a);
          const x2 = 100 + 85 * Math.cos(a);
          const y2 = 100 + 85 * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9d8bce" strokeWidth="2" strokeLinecap="round" />;
        })}

        {/* Numbers */}
        {[...Array(12)].map((_, i) => {
          const num = i + 1;
          const a = (num * 30 - 90) * (Math.PI / 180);
          const x = 100 + 68 * Math.cos(a);
          const y = 100 + 68 * Math.sin(a);
          return (
            <text key={num} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize="14" fontWeight="bold" className="select-none pointer-events-none">
              {num}
            </text>
          );
        })}

        {/* Hour hand (short, red) — wider hit area */}
        <g
          style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '100px 100px', cursor: 'grab' }}
          onPointerDown={handleHandTap('hour')}
        >
          {/* Invisible fat hit area */}
          <line x1="100" y1="105" x2="100" y2="42" stroke="transparent" strokeWidth="24" />
          <line x1="100" y1="100" x2="100" y2="48" stroke="#ef4444" strokeWidth="7" strokeLinecap="round" />
          {/* Tip circle */}
          <circle cx="100" cy="46" r={activeHand === 'hour' ? 10 : 7} fill="#ef4444" opacity={activeHand === 'hour' ? 0.6 : 0.3} />
        </g>

        {/* Minute hand (long, blue) — wider hit area */}
        <g
          style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: '100px 100px', cursor: 'grab' }}
          onPointerDown={handleHandTap('minute')}
        >
          {/* Invisible fat hit area */}
          <line x1="100" y1="105" x2="100" y2="18" stroke="transparent" strokeWidth="24" />
          <line x1="100" y1="100" x2="100" y2="24" stroke="#60a5fa" strokeWidth="5" strokeLinecap="round" />
          {/* Tip circle */}
          <circle cx="100" cy="22" r={activeHand === 'minute' ? 10 : 7} fill="#60a5fa" opacity={activeHand === 'minute' ? 0.6 : 0.3} />
        </g>

        {/* Center dot */}
        <circle cx="100" cy="100" r="6" fill="#c4b5fd" />

        {/* Active hand glow ring */}
        {activeHand === 'hour' && (
          <circle cx={100 + 52 * Math.cos(hourTipAngleRad)} cy={100 + 52 * Math.sin(hourTipAngleRad)}
            r="12" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.4">
            <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.15;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
        {activeHand === 'minute' && (
          <circle cx={100 + 76 * Math.cos(minuteTipAngleRad)} cy={100 + 76 * Math.sin(minuteTipAngleRad)}
            r="12" fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.4">
            <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.15;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </motion.div>
  );
}

/* ── Main Exercise ──────────────────────────────────────────── */
export function ExerciseClock() {
  const navigate = useNavigate();
  const { stage } = useDifficultyLevel();
  const clockCfg = useExerciseConfig(DEFAULT_CLOCK);

  const [task, setTask] = useState<ClockTask>(() => generateTask(clockCfg.halfHours));
  const [hourAngle, setHourAngle] = useState(0);
  const [minuteAngle, setMinuteAngle] = useState(0);
  const [hint, setHint] = useState('');

  const nextQuestion = useCallback(() => {
    const t = generateTask(clockCfg.halfHours);
    setTask(t);
    setHourAngle(0);
    setMinuteAngle(0);
    setHint('');
  }, [clockCfg.halfHours]);

  const exerciseId = useExerciseId();
  const { lives, progress, status, handleCorrect, handleIncorrect } = useExerciseState({
    totalQuestions: 5,
    xpReward: 10,
    returnPath: '/app/map',
    exerciseId,
    onNextQuestion: nextQuestion,
  });


  const handleCheck = useCallback(() => {
    if (status !== 'idle') return;

    const expH = norm(expectedHourAngle(task.hour, task.half));
    const expM = norm(expectedMinuteAngle(task.half));
    const curH = norm(hourAngle);
    const curM = norm(minuteAngle);

    const hourOk = Math.abs(curH - expH) < 5 || Math.abs(curH - expH) > 355;
    const minOk = Math.abs(curM - expM) < 5 || Math.abs(curM - expM) > 355;

    if (hourOk && minOk) {
      setHint('');
      handleCorrect();
    } else {
      if (!minOk) {
        setHint(task.half
          ? 'Kijk goed! Bij "half" wijst de lange wijzer naar de 6.'
          : 'De lange wijzer moet naar de 12 voor een heel uur.');
      } else {
        setHint('Kijk goed naar welk getal de korte wijzer moet aanwijzen.');
      }
      handleIncorrect();
    }
  }, [status, hourAngle, minuteAngle, task, handleCorrect, handleIncorrect]);

  return (
    <ExerciseShell progress={progress} lives={lives} onClose={() => navigate(`/app/stage/fluisterbos/${stage}`)}>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-6 z-10 max-w-2xl mx-auto w-full">

        {/* Task card */}
        <div className="bg-[#1c1134]/60 backdrop-blur-sm border border-[#3b2d71] rounded-2xl p-5 text-center w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl md:text-4xl font-bold text-white/90 font-mono tracking-wider">
              {task.digital}
            </span>
          </div>
          <p className="text-lg md:text-xl text-white/70 font-medium">{task.label}</p>
        </div>

        {/* Clock */}
        <ClockFace
          hourAngle={hourAngle}
          minuteAngle={minuteAngle}
          onHourChange={setHourAngle}
          onMinuteChange={setMinuteAngle}
          status={status}
        />

        {/* Hint */}
        {hint && status === 'incorrect' && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-amber-300 text-sm md:text-base text-center max-w-xs"
          >
            💡 {hint}
          </motion.p>
        )}

        {/* Check button */}
        <button
          onClick={handleCheck}
          disabled={status !== 'idle'}
          className="w-full max-w-xs py-4 rounded-2xl text-lg font-bold transition-all
            bg-gradient-to-r from-emerald-500 to-cyan-500 text-white
            border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1
            disabled:opacity-40 disabled:pointer-events-none
            shadow-lg shadow-emerald-500/20"
        >
          Klok nakijken ⏰
        </button>
      </div>
    </ExerciseShell>
  );
}
