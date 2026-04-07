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

/* ── Coin definitions ─────────────────────────────────────────── */
interface CoinDef {
  label: string;
  value: number; // in cents
  color: string;
  border: string;
  size: string;
}

const COINS: CoinDef[] = [
  { label: '€2', value: 200, color: 'from-amber-300 to-yellow-500', border: 'border-amber-600', size: 'w-16 h-16 md:w-20 md:h-20' },
  { label: '€1', value: 100, color: 'from-amber-200 to-yellow-400', border: 'border-amber-500', size: 'w-14 h-14 md:w-18 md:h-18' },
  { label: '50c', value: 50, color: 'from-orange-300 to-orange-500', border: 'border-orange-600', size: 'w-14 h-14 md:w-18 md:h-18' },
  { label: '20c', value: 20, color: 'from-orange-200 to-orange-400', border: 'border-orange-500', size: 'w-12 h-12 md:w-16 md:h-16' },
  { label: '10c', value: 10, color: 'from-yellow-200 to-amber-300', border: 'border-yellow-500', size: 'w-12 h-12 md:w-16 md:h-16' },
  { label: '5c', value: 5, color: 'from-red-300 to-red-500', border: 'border-red-600', size: 'w-11 h-11 md:w-14 md:h-14' },
];

/* ── Helpers ───────────────────────────────────────────────────── */

/** Generate a price in cents between 5 and 1000, rounded to 5c */
function generatePrice(): number {
  return randomInt(1, 200) * 5; // 5c – €10.00
}

function formatCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return `€${euros}`;
  return `€${euros},${rest.toString().padStart(2, '0')}`;
}

/* ── Draggable Coin ───────────────────────────────────────────── */

interface DraggableCoinProps {
  id: string;
  coin: CoinDef;
  isOverlay?: boolean;
}

function CoinVisual({ coin, isOverlay }: { coin: CoinDef; isOverlay?: boolean }) {
  return (
    <div
      className={`${coin.size} rounded-full bg-gradient-to-br ${coin.color} ${coin.border} border-[3px] flex items-center justify-center font-black text-sm md:text-base text-white shadow-lg select-none ${isOverlay ? 'scale-110 shadow-2xl' : ''}`}
    >
      <span className="drop-shadow-md">{coin.label}</span>
    </div>
  );
}

function DraggableCoin({ id, coin }: DraggableCoinProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : ''}`}
    >
      <CoinVisual coin={coin} />
    </div>
  );
}

/* ── Droppable Kassa ──────────────────────────────────────────── */

interface KassaProps {
  droppedCoins: { id: string; coin: CoinDef }[];
  totalCents: number;
  priceCents: number;
}

function Kassa({ droppedCoins, totalCents, priceCents }: KassaProps) {
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
      {droppedCoins.length === 0 ? (
        <p className="text-white/40 text-sm md:text-base font-medium">
          Sleep munten hierheen 🪙
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {droppedCoins.map((dc) => (
            <motion.div
              key={dc.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="pointer-events-none"
            >
              <CoinVisual coin={dc.coin} />
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

  const [product, setProduct] = useState(() => PRODUCTS[randomInt(0, PRODUCTS.length - 1)]);
  const [priceCents, setPriceCents] = useState(() => generatePrice());
  const [droppedCoins, setDroppedCoins] = useState<{ id: string; coin: CoinDef }[]>([]);
  const [dragCoinId, setDragCoinId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'too-little' | 'too-much' | null>(null);
  const [coinCounter, setCoinCounter] = useState(0);

  const totalCents = useMemo(
    () => droppedCoins.reduce((sum, dc) => sum + dc.coin.value, 0),
    [droppedCoins]
  );

  const nextQuestion = useCallback(() => {
    setProduct(PRODUCTS[randomInt(0, PRODUCTS.length - 1)]);
    setPriceCents(generatePrice());
    setDroppedCoins([]);
    setFeedback(null);
  }, []);

  const {
    lives,
    progress,
    status,
    handleCorrect,
    handleIncorrect,
  } = useExerciseState({
    totalQuestions: 5,
    xpReward: 15,
    returnPath: '/app/map',
    onNextQuestion: nextQuestion,
  });

  /* ── Drag & Drop ──── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragCoinId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragCoinId(null);
      if (!event.over || event.over.id !== 'kassa') return;

      const coinIndex = parseInt((event.active.id as string).split('-')[1], 10);
      const coin = COINS[coinIndex];
      if (!coin) return;

      setCoinCounter((c) => c + 1);
      setDroppedCoins((prev) => [...prev, { id: `dropped-${coinCounter}`, coin }]);
      setFeedback(null);
    },
    [coinCounter]
  );

  /* ── Pay ──── */
  const handlePay = useCallback(() => {
    if (status !== 'idle') return;

    if (totalCents === priceCents) {
      setFeedback('correct');
      handleCorrect();
    } else if (totalCents < priceCents) {
      setFeedback('too-little');
      setTimeout(() => {
        setDroppedCoins([]);
        setFeedback(null);
      }, 1400);
    } else {
      setFeedback('too-much');
      setTimeout(() => {
        setDroppedCoins([]);
        setFeedback(null);
      }, 1400);
    }
  }, [totalCents, priceCents, status, handleCorrect]);

  const handleReset = useCallback(() => {
    setDroppedCoins([]);
    setFeedback(null);
  }, []);

  /* ── Active drag coin for overlay ──── */
  const activeCoin = dragCoinId ? COINS[parseInt(dragCoinId.split('-')[1], 10)] : null;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/map')}
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
          <Kassa droppedCoins={droppedCoins} totalCents={totalCents} priceCents={priceCents} />

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

          {/* ── Portefeuille (Coins) ──── */}
          <div className="bg-[#1c1134]/50 backdrop-blur-sm rounded-3xl p-4 md:p-6 border-2 border-[#3b2d71]">
            <p className="text-white/50 text-xs font-semibold mb-3 text-center uppercase tracking-wider">
              Jouw portefeuille
            </p>
            <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
              {COINS.map((coin, i) => (
                <DraggableCoin key={i} id={`coin-${i}`} coin={coin} />
              ))}
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeCoin && <CoinVisual coin={activeCoin} isOverlay />}
        </DragOverlay>
      </DndContext>
    </ExerciseShell>
  );
}
