import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useExerciseState } from '@/hooks/useExerciseState';

/* ── Types ──────────────────────────────────────────────────── */
interface ClockTask {
  hour: number;   // 1-12
  half: boolean;   // true = half hour
  label: string;   // e.g. "Het is twee uur"
  digital: string; // e.g. "14:00"
}

/* ── Task generation ────────────────────────────────────────── */
function generateTask(): ClockTask {
  const hour = Math.floor(Math.random() * 12) + 1;
  const half = Math.random() < 0.5;

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

/** Snap angle to nearest 30° (hour positions) */
function snapHour(angle: number): number {
  return Math.round(angle / 30) * 30;
}

/** Snap minute to nearest 180° (12 or 6 position) */
function snapMinute(angle: number): number {
  // Normalize to 0-360
  let a = ((angle % 360) + 360) % 360;
  // Snap to 0 or 180
  return a >= 90 && a < 270 ? 180 : 0;
}

/** Normalize angle to 0-360 */
function norm(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/* ── Speech ─────────────────────────────────────────────────── */
function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'nl-NL';
  u.rate = 0.75;
  // Try to pick a Dutch voice
  const voices = window.speechSynthesis.getVoices();
  const nlVoice = voices.find(v => v.lang.startsWith('nl'));
  if (nlVoice) u.voice = nlVoice;
  window.speechSynthesis.speak(u);
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
  const dragging = useRef<'hour' | 'minute' | null>(null);

  const getAngleFromEvent = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!clockRef.current) return 0;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    return norm(angle);
  }, []);

  const handlePointerDown = useCallback((hand: 'hour' | 'minute') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = hand;
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const angle = getAngleFromEvent(e);
    if (dragging.current === 'hour') {
      onHourChange(snapHour(angle));
    } else {
      onMinuteChange(snapMinute(angle));
    }
  }, [getAngleFromEvent, onHourChange, onMinuteChange]);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const borderColor = status === 'correct' ? '#22c55e' : status === 'incorrect' ? '#ef4444' : '#8b7ab8';

  return (
    <motion.div
      animate={status === 'incorrect' ? { x: [0, -8, 8, -8, 8, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      <svg
        ref={clockRef}
        viewBox="0 0 200 200"
        className="w-56 h-56 md:w-72 md:h-72 touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Clock body */}
        <circle cx="100" cy="100" r="96" fill="#1c1134" stroke={borderColor} strokeWidth="4" />
        <circle cx="100" cy="100" r="90" fill="#2d1b54" stroke="#3b2d71" strokeWidth="2" />

        {/* Tick marks */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 78 * Math.cos(angle);
          const y1 = 100 + 78 * Math.sin(angle);
          const x2 = 100 + 85 * Math.cos(angle);
          const y2 = 100 + 85 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9d8bce" strokeWidth="2" strokeLinecap="round" />;
        })}

        {/* Numbers */}
        {[...Array(12)].map((_, i) => {
          const num = i + 1;
          const angle = (num * 30 - 90) * (Math.PI / 180);
          const x = 100 + 68 * Math.cos(angle);
          const y = 100 + 68 * Math.sin(angle);
          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              className="select-none pointer-events-none"
            >
              {num}
            </text>
          );
        })}

        {/* Hour hand (short, red) */}
        <g
          style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '100px 100px', cursor: 'grab' }}
          onPointerDown={handlePointerDown('hour')}
        >
          <line x1="100" y1="100" x2="100" y2="48" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="48" r="6" fill="#ef4444" opacity="0.3" />
        </g>

        {/* Minute hand (long, blue) */}
        <g
          style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: '100px 100px', cursor: 'grab' }}
          onPointerDown={handlePointerDown('minute')}
        >
          <line x1="100" y1="100" x2="100" y2="24" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="24" r="6" fill="#60a5fa" opacity="0.3" />
        </g>

        {/* Center dot */}
        <circle cx="100" cy="100" r="5" fill="#c4b5fd" />
      </svg>
    </motion.div>
  );
}

/* ── Main Exercise ──────────────────────────────────────────── */
export function ExerciseClock() {
  const navigate = useNavigate();

  const [task, setTask] = useState<ClockTask>(generateTask);
  const [hourAngle, setHourAngle] = useState(0);
  const [minuteAngle, setMinuteAngle] = useState(0);
  const [hint, setHint] = useState('');

  const nextQuestion = useCallback(() => {
    const t = generateTask();
    setTask(t);
    setHourAngle(0);
    setMinuteAngle(0);
    setHint('');
  }, []);

  const { lives, progress, status, handleCorrect, handleIncorrect } = useExerciseState({
    totalQuestions: 5,
    xpReward: 10,
    returnPath: '/app/map',
    onNextQuestion: nextQuestion,
  });

  // Speak the task on load and when task changes
  useEffect(() => {
    const timer = setTimeout(() => speak(task.label), 400);
    return () => clearTimeout(timer);
  }, [task]);

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
    <ExerciseShell progress={progress} lives={lives} onClose={() => navigate('/app/map')}>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-6 z-10 max-w-2xl mx-auto w-full">

        {/* Task card */}
        <div className="bg-[#1c1134]/60 backdrop-blur-sm border border-[#3b2d71] rounded-2xl p-5 text-center w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl md:text-4xl font-bold text-white/90 font-mono tracking-wider">
              {task.digital}
            </span>
            <button
              onClick={() => speak(task.label)}
              className="w-10 h-10 rounded-full bg-[#2d1b54] border border-[#3b2d71] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Volume2 className="w-5 h-5 text-cyan-400" />
            </button>
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
