import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { RotateCcw } from 'lucide-react';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';

import { useExerciseState } from '@/hooks/useExerciseState';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { MONEY_CONFIG, DEFAULT_MONEY } from '@/data/difficultyConfig';
import { randomInt } from '@/lib/random';

/* ── Products ─────────────────────────────────────────────────── */
const PRODUCTS = [
  { name: 'Appel', emoji: '🍎' },
  { name: 'Banaan', emoji: '🍌' },
  { name: 'Potlood', emoji: '✏️' },
  { name: 'Beer', emoji: '🧸' },
  { name: 'Boek', emoji: '📕' },
  { name: 'Koekje', emoji: '🍪' },
  { name: 'Sap', emoji: '🧃' },
  { name: 'Bal', emoji: '⚽' },
];

/* ── Denomination definitions ─────────────────────────────────── */
interface DenominationDef {
  label: string;
  value: number; // in cents
  shape: 'coin' | 'banknote';
  color: string;
  border: string;
  size: string;
  /** Extra text color for banknotes */
  textColor?: string;
  /** Secondary pattern color for banknotes */
  patternColor?: string;
}

const ALL_DENOMINATIONS: DenominationDef[] = [
  // Banknotes — realistic Euro colors
  { label: '€50',  value: 5000, shape: 'banknote', color: 'from-orange-400 to-orange-500', border: 'border-orange-600', size: 'w-20 h-12 md:w-24 md:h-14', textColor: 'text-orange-900', patternColor: 'bg-orange-300/30' },
  { label: '€20',  value: 2000, shape: 'banknote', color: 'from-blue-400 to-blue-500',     border: 'border-blue-600',   size: 'w-20 h-12 md:w-24 md:h-14', textColor: 'text-blue-900',   patternColor: 'bg-blue-300/30' },
  { label: '€10',  value: 1000, shape: 'banknote', color: 'from-rose-400 to-rose-500',     border: 'border-rose-600',   size: 'w-20 h-12 md:w-24 md:h-14', textColor: 'text-rose-900',   patternColor: 'bg-rose-300/30' },
  { label: '€5',   value: 500,  shape: 'banknote', color: 'from-gray-400 to-gray-500',     border: 'border-gray-600',   size: 'w-20 h-12 md:w-24 md:h-14', textColor: 'text-gray-900',   patternColor: 'bg-gray-300/30' },
  // Coins
  { label: '€2',  value: 200, shape: 'coin', color: 'from-amber-300 to-yellow-500',  border: 'border-amber-600',  size: 'w-16 h-16 md:w-20 md:h-20' },
  { label: '€1',  value: 100, shape: 'coin', color: 'from-amber-200 to-yellow-400',  border: 'border-amber-500',  size: 'w-14 h-14 md:w-18 md:h-18' },
  { label: '50c', value: 50,  shape: 'coin', color: 'from-orange-300 to-orange-500',  border: 'border-orange-600', size: 'w-14 h-14 md:w-18 md:h-18' },
  { label: '20c', value: 20,  shape: 'coin', color: 'from-orange-200 to-orange-400',  border: 'border-orange-500', size: 'w-12 h-12 md:w-16 md:h-16' },
  { label: '10c', value: 10,  shape: 'coin', color: 'from-yellow-200 to-amber-300',   border: 'border-yellow-500', size: 'w-12 h-12 md:w-16 md:h-16' },
  { label: '5c',  value: 5,   shape: 'coin', color: 'from-red-300 to-red-500',        border: 'border-red-600',    size: 'w-11 h-11 md:w-14 md:h-14' },
];

/* ── Helpers ───────────────────────────────────────────────────── */

function generatePrice(maxCents: number, denominations: number[]): number {
  const smallest = Math.min(...denominations);
  return randomInt(1, Math.floor(maxCents / smallest)) * smallest;
}

function formatCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return `€${euros}`;
  return `€${euros},${rest.toString().padStart(2, '0')}`;
}

/* ── Denomination Visual ──────────────────────────────────────── */

function DenominationVisual({ denom, isOverlay }: { denom: DenominationDef; isOverlay?: boolean }) {
  if (denom.shape === 'banknote') {
    return (
      <div
        className={`${denom.size} rounded-lg bg-gradient-to-br ${denom.color} ${denom.border} border-2 flex items-center justify-center font-black text-sm md:text-base shadow-lg select-none relative overflow-hidden ${isOverlay ? 'scale-110 shadow-2xl' : ''}`}
      >
        {/* Decorative corner pattern */}
        <div className={`absolute top-0 left-0 w-4 h-4 md:w-5 md:h-5 ${denom.patternColor} rounded-br-full`} />
        <div className={`absolute bottom-0 right-0 w-4 h-4 md:w-5 md:h-5 ${denom.patternColor} rounded-tl-full`} />
        {/* Subtle border line */}
        <div className="absolute inset-1 rounded border border-white/20 pointer-events-none" />
        <span className={`drop-shadow-md ${denom.textColor ?? 'text-white'} font-black text-sm md:text-base z-10`}>{denom.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`${denom.size} rounded-full bg-gradient-to-br ${denom.color} ${denom.border} border-[3px] flex items-center justify-center font-black text-sm md:text-base text-white shadow-lg select-none ${isOverlay ? 'scale-110 shadow-2xl' : ''}`}
    >
      <span className="drop-shadow-md">{denom.label}</span>
    </div>
  );
}

/* ── Draggable Denomination ───────────────────────────────────── */

function DraggableDenomination({ id, denom }: { id: string; denom: DenominationDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : ''}`}
    >
      <DenominationVisual denom={denom} />
    </div>
  );
}

/* ── Droppable Kassa ──────────────────────────────────────────── */

function Kassa({ droppedItems, totalCents, priceCents }: { droppedItems: { id: string; denom: DenominationDef }[]; totalCents: number; priceCents: number }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'kassa' });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-3xl border-2 border-dashed p-4 md:p-6 min-h-[120px] md:min-h-[160px] flex flex-col items-center justify-center transition-colors ${
        isOver
          ? 'border-emerald-400 bg-emerald-400/10'
          : 'border-[#3b2d71] bg-[#1c1134]/40'
      }`}
    >
      {droppedItems.length === 0 ? (
        <p className="text-white/40 text-sm md:text-base font-medium">
          Sleep geld hierheen 🪙
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {droppedItems.map((di) => (
            <motion.div
              key={di.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="pointer-events-none"
            >
              <DenominationVisual denom={di.denom} />
            </motion.div>
          ))}
        </div>
      )}

      {totalCents > 0 && (
        <motion.p
          key={totalCents}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-3 text-lg md:text-xl font-bold text-cyan-300"
        >
          Je hebt {formatCents(totalCents)} gelegd
        </motion.p>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export function ExerciseMoney() {
  const navigate = useNavigate();
  const { key: difficultyKey, stage } = useDifficultyLevel();
  const moneyCfg = MONEY_CONFIG[difficultyKey] ?? DEFAULT_MONEY;

  // Filter denominations based on trimester config
  const availableDenoms = useMemo(
    () => ALL_DENOMINATIONS.filter((d) => moneyCfg.denominations.includes(d.value)),
    [moneyCfg.denominations]
  );

  const [product, setProduct] = useState(() => PRODUCTS[randomInt(0, PRODUCTS.length - 1)]);
  const [priceCents, setPriceCents] = useState(() => generatePrice(moneyCfg.maxPriceCents, moneyCfg.denominations));
  const [droppedItems, setDroppedItems] = useState<{ id: string; denom: DenominationDef }[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'too-little' | 'too-much' | null>(null);
  const [counter, setCounter] = useState(0);

  const totalCents = useMemo(
    () => droppedItems.reduce((sum, di) => sum + di.denom.value, 0),
    [droppedItems]
  );

  const nextQuestion = useCallback(() => {
    setProduct(PRODUCTS[randomInt(0, PRODUCTS.length - 1)]);
    setPriceCents(generatePrice(moneyCfg.maxPriceCents, moneyCfg.denominations));
    setDroppedItems([]);
    setFeedback(null);
  }, [moneyCfg.maxPriceCents]);

  const exerciseId = useExerciseId();
  const {
    lives,
    progress,
    status,
    handleCorrect,
    handleIncorrect,
  } = useExerciseState({
    totalQuestions: 5,
    xpReward: 15,
    returnPath: `/app/stage/fluisterbos/${stage}`,
    exerciseId,
    onNextQuestion: nextQuestion,
  });

  /* ── Drag & Drop ──── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragId(null);
      if (!event.over || event.over.id !== 'kassa') return;

      const denomIndex = parseInt((event.active.id as string).split('-')[1], 10);
      const denom = availableDenoms[denomIndex];
      if (!denom) return;

      setCounter((c) => c + 1);
      setDroppedItems((prev) => [...prev, { id: `dropped-${counter}`, denom }]);
      setFeedback(null);
    },
    [counter, availableDenoms]
  );

  /* ── Pay ──── */
  const handlePay = useCallback(() => {
    if (status !== 'idle') return;

    if (totalCents === priceCents) {
      setFeedback('correct');
      handleCorrect();
    } else {
      // Wrong amount (too little or too much) now costs a life via the shared
      // exercise state machine, matching every other exercise screen. It also
      // handles game-over navigation and clears the tray on the next question.
      setFeedback(totalCents < priceCents ? 'too-little' : 'too-much');
      handleIncorrect();
    }
  }, [totalCents, priceCents, status, handleCorrect, handleIncorrect]);

  const handleReset = useCallback(() => {
    setDroppedItems([]);
    setFeedback(null);
  }, []);

  /* ── Active drag denomination for overlay ──── */
  const activeDenom = dragId ? availableDenoms[parseInt(dragId.split('-')[1], 10)] : null;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(`/app/stage/fluisterbos/${stage}`)}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col px-4 md:px-8 lg:px-12 max-w-3xl mx-auto w-full z-10 relative mt-6 md:mt-10 gap-4 md:gap-6 pb-6">

          {/* ── Product / Winkelkast ──── */}
          <motion.div
            key={`${product.name}-${priceCents}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1c1134]/60 backdrop-blur-sm rounded-3xl p-6 md:p-8 border-2 border-[#3b2d71] shadow-lg flex flex-col items-center gap-2"
          >
            <span className="text-6xl md:text-8xl">{product.emoji}</span>
            <p className="text-white/80 text-base md:text-lg font-semibold">{product.name}</p>
            <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl px-5 py-2 mt-1">
              <span className="text-2xl md:text-3xl font-black text-emerald-300">
                {formatCents(priceCents)}
              </span>
            </div>
          </motion.div>

          {/* ── Kassa (Dropzone) ──── */}
          <Kassa droppedItems={droppedItems} totalCents={totalCents} priceCents={priceCents} />

          {/* ── Feedback ──── */}
          <AnimatePresence>
            {feedback && feedback !== 'correct' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-orange-300 font-bold text-base md:text-lg">
                  {feedback === 'too-little' && 'Oei, dat is niet genoeg! 🤔'}
                  {feedback === 'too-much' && 'Dat is iets te veel! 😅'}
                </p>
              </motion.div>
            )}
            {feedback === 'correct' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-emerald-300 font-bold text-lg md:text-xl">
                  Goed gedaan! 🎉 +15 XP
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action Buttons ──── */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2d1b54] border-2 border-[#3b2d71] text-white/70 font-bold text-sm hover:bg-[#3b2d71] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handlePay}
              disabled={status !== 'idle' || totalCents === 0}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-lg shadow-lg border-b-4 border-emerald-700 hover:from-emerald-600 hover:to-teal-600 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              Betaal 💰
            </button>
          </div>

          {/* ── Portefeuille (Denominations) ──── */}
          <div className="bg-[#1c1134]/50 backdrop-blur-sm rounded-3xl p-4 md:p-6 border-2 border-[#3b2d71]">
            <p className="text-white/50 text-xs font-semibold mb-3 text-center uppercase tracking-wider">
              Jouw portefeuille
            </p>
            <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
              {availableDenoms.map((denom, i) => (
                <DraggableDenomination key={i} id={`denom-${i}`} denom={denom} />
              ))}
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDenom && <DenominationVisual denom={activeDenom} isOverlay />}
        </DragOverlay>
      </DndContext>
    </ExerciseShell>
  );
}
