import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Delete, Heart, HeartCrack, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useGame } from '@/context/GameContext';

// ── Types ──────────────────────────────────────────────────────────────────

type VariationType = 1 | 2 | 3 | 4;
type CompSymbol = '<' | '>' | '=';
type QStatus = 'idle' | 'correct' | 'incorrect';

interface Question {
  variation: VariationType;
  leftValue: number;
  rightValue: number;
  symbol: CompSymbol;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(): Question {
  const variation = randomInt(1, 4) as VariationType;
  let leftValue: number;
  let rightValue: number;
  let symbol: CompSymbol;

  if (variation === 3 || variation === 4) {
    // Give user a symbol and ask them to fill in the right side
    // Make sure valid answers always exist within 0–10
    const pick = randomInt(0, 2);
    if (pick === 0) {
      // left < ? : right must be > left → left can be 0–9
      leftValue = randomInt(0, 9);
      rightValue = randomInt(leftValue + 1, 10);
      symbol = '<';
    } else if (pick === 1) {
      // left > ? : right must be < left → left can be 1–10
      leftValue = randomInt(1, 10);
      rightValue = randomInt(0, leftValue - 1);
      symbol = '>';
    } else {
      // left = ? : right must equal left
      leftValue = randomInt(1, 10);
      rightValue = leftValue;
      symbol = '=';
    }
  } else {
    // User picks the symbol for var 1 & 2
    leftValue = randomInt(1, 10);
    rightValue = randomInt(1, 10);
    symbol = leftValue > rightValue ? '>' : leftValue < rightValue ? '<' : '=';
  }

  return { variation, leftValue, rightValue, symbol };
}

function checkNumberAnswer(input: string, question: Question): boolean {
  const n = parseInt(input, 10);
  if (isNaN(n)) return false;
  const { leftValue, symbol } = question;
  if (symbol === '>') return n < leftValue;   // left > ?, so ? must be < left
  if (symbol === '<') return n > leftValue;   // left < ?, so ? must be > left
  if (symbol === '=') return n === leftValue;
  return false;
}

const SYMBOL_LABEL: Record<CompSymbol, string> = {
  '<': 'kleiner dan',
  '>': 'groter dan',
  '=': 'gelijk aan',
};

// ── Sub-components ─────────────────────────────────────────────────────────

function DotsDisplay({ count }: { count: number }) {
  const colsFull = Math.floor(count / 2);
  const hasExtra = count % 2 === 1;

  return (
    <div className="flex flex-col gap-2">
      {[0, 1].map(row => (
        <div key={row} className="flex gap-2 justify-center">
          {[0, 1, 2, 3, 4].map(col => {
            const filled =
              col < colsFull || (col === colsFull && row === 0 && hasExtra);
            return (
              <div
                key={col}
                className={cn(
                  'w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  filled
                    ? 'bg-gradient-to-br from-orange-400 to-orange-500 border-orange-600 shadow-sm'
                    : 'bg-slate-100 border-slate-200'
                )}
              >
                {filled && <div className="w-2.5 h-2.5 rounded-full bg-white/40" />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Number bubble used in horizontal layout
function NumBubble({ value, color }: { value: number | string; color: 'blue' | 'violet' | 'orange-filled' | 'orange-empty' }) {
  const base = 'w-20 h-20 rounded-3xl flex items-center justify-center border-2 flex-shrink-0 shadow-lg';
  const styles = {
    blue: 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-700 text-white',
    violet: 'bg-gradient-to-br from-violet-400 to-violet-600 border-violet-700 text-white',
    'orange-filled': 'bg-orange-500 border-orange-600 text-white',
    'orange-empty': 'bg-white border-dashed border-orange-300 text-orange-300',
  };
  return (
    <div className={cn(base, styles[color])}>
      <span className="font-black" style={{ fontSize: 38 }}>{value}</span>
    </div>
  );
}

// Symbol slot (horizontal)
function SymSlot({ sym, status }: { sym: CompSymbol | null; status: QStatus }) {
  return (
    <div className={cn(
      'w-14 h-14 rounded-2xl flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300',
      sym && status === 'correct' ? 'bg-green-100 border-green-400' :
      sym && status === 'incorrect' ? 'bg-red-100 border-red-400' :
      'bg-amber-50 border-dashed border-amber-300'
    )}>
      {sym && status !== 'idle' ? (
        <span className={cn('font-black', status === 'correct' ? 'text-green-600' : 'text-red-500')} style={{ fontSize: 26 }}>
          {sym}
        </span>
      ) : (
        <span className="font-black text-amber-400" style={{ fontSize: 26 }}>?</span>
      )}
    </div>
  );
}

// Known symbol badge (horizontal)
function SymBadge({ sym }: { sym: CompSymbol }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center border border-amber-600 shadow-md">
        <span className="font-black text-white" style={{ fontSize: 26 }}>{sym}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{SYMBOL_LABEL[sym]}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ExerciseComparison() {
  const navigate = useNavigate();
  const { addXp } = useGame();

  const [question, setQuestion] = useState<Question>(generateQuestion);
  const [selectedSymbol, setSelectedSymbol] = useState<CompSymbol | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [status, setStatus] = useState<QStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);

  const needsSymbol = question.variation === 1 || question.variation === 2;
  const needsNumber = question.variation === 3 || question.variation === 4;

  const generateNext = useCallback(() => {
    setQuestion(generateQuestion());
    setSelectedSymbol(null);
    setInputValue('');
    setStatus('idle');
    setIsNumpadOpen(false);
  }, []);

  const handleResult = useCallback((correct: boolean) => {
    if (correct) {
      setStatus('correct');
      addXp(10);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#f97316', '#fb923c', '#fcd34d', '#34d399', '#60a5fa'],
      });
      const nextProgress = Math.min(progress + 25, 100);
      setProgress(nextProgress);
      setTimeout(() => {
        if (nextProgress >= 100) navigate('/stage/fluisterbos');
        else generateNext();
      }, 1800);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      setTimeout(() => {
        if (nextLives <= 0) navigate('/stage/fluisterbos');
        else generateNext();
      }, 1600);
    }
  }, [progress, lives, addXp, navigate, generateNext]);

  // Symbol selection (var 1 & 2)
  const handleSymbolSelect = (sym: CompSymbol) => {
    if (status !== 'idle') return;
    setSelectedSymbol(sym);
    handleResult(sym === question.symbol);
  };

  // Number input (var 3 & 4)
  const handleNumpadKey = (key: number | 'del') => {
    if (status !== 'idle') return;
    if (key === 'del') {
      setInputValue(prev => prev.slice(0, -1));
    } else {
      setInputValue(prev => (prev.length < 2 ? prev + key : prev));
    }
  };

  const handleNumberCheck = () => {
    if (!inputValue || status !== 'idle') return;
    setIsNumpadOpen(false);
    handleResult(checkNumberAnswer(inputValue, question));
  };

  const numpadRows = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

  // ── Question card renderer ────────────────────────────────────────────────
  // Variations 1 & 3 → horizontal (two numbers, fits fine)
  // Variations 2 & 4 → vertical stack (dots involved, avoids overflow)

  const renderQuestionContent = () => {
    const { variation, leftValue, rightValue, symbol } = question;

    // ── HORIZONTAL: var 1 (num ? num) and var 3 (num sym ?) ──────────────
    if (variation === 1) {
      return (
        <div className="flex items-center justify-center gap-4">
          <NumBubble value={leftValue} color="blue" />
          <SymSlot sym={selectedSymbol} status={status} />
          <NumBubble value={rightValue} color="violet" />
        </div>
      );
    }

    if (variation === 3) {
      const inputColor = status === 'correct' ? 'orange-filled'
        : status === 'incorrect' ? 'orange-filled'
        : inputValue ? 'orange-filled' : 'orange-empty';
      return (
        <div className="flex items-center justify-center gap-4">
          <NumBubble value={leftValue} color="blue" />
          <SymBadge sym={symbol} />
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={(e) => { e.stopPropagation(); if (status === 'idle') setIsNumpadOpen(true); }}
            className={cn(
              'w-20 h-20 rounded-3xl flex items-center justify-center border-2 flex-shrink-0 shadow-lg transition-all',
              status === 'correct' ? 'bg-green-100 border-green-400 text-green-700' :
              status === 'incorrect' ? 'bg-red-100 border-red-400 text-red-700' :
              inputValue ? 'bg-orange-500 border-orange-600 text-white' :
              'bg-white border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50'
            )}
          >
            <span className="font-black" style={{ fontSize: 38 }}>
              {inputValue || '?'}
            </span>
          </motion.button>
        </div>
      );
    }

    // ── VERTICAL: var 2 (num ? dots) and var 4 (dots sym ?) ──────────────
    // Top value
    const topContent = variation === 2 ? (
      <div className="flex flex-col items-center gap-1">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg border border-blue-700">
          <span className="font-black text-white" style={{ fontSize: 38 }}>{leftValue}</span>
        </div>
        <span className="text-xs font-bold text-blue-400">getal</span>
      </div>
    ) : (
      // var 4: dots on top
      <div className="flex flex-col items-center gap-1.5">
        <DotsDisplay count={leftValue} />
        <span className="text-xs font-bold text-slate-400">
          {leftValue} {leftValue === 1 ? 'stip' : 'stippen'}
        </span>
      </div>
    );

    // Middle symbol
    const middleContent = variation === 2 ? (
      // unknown symbol
      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300',
        selectedSymbol && status === 'correct' ? 'bg-green-100 border-green-400' :
        selectedSymbol && status === 'incorrect' ? 'bg-red-100 border-red-400' :
        'bg-amber-50 border-dashed border-amber-300'
      )}>
        {selectedSymbol && status !== 'idle' ? (
          <span className={cn('font-black', status === 'correct' ? 'text-green-600' : 'text-red-500')} style={{ fontSize: 28 }}>
            {selectedSymbol}
          </span>
        ) : (
          <span className="font-black text-amber-400" style={{ fontSize: 28 }}>?</span>
        )}
      </div>
    ) : (
      // known symbol (var 4)
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center border border-amber-600 shadow-md">
          <span className="font-black text-white" style={{ fontSize: 28 }}>{symbol}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{SYMBOL_LABEL[symbol]}</span>
      </div>
    );

    // Bottom value
    const bottomContent = variation === 2 ? (
      // dots on the bottom
      <div className="flex flex-col items-center gap-1.5">
        <DotsDisplay count={rightValue} />
        <span className="text-xs font-bold text-slate-400">
          {rightValue} {rightValue === 1 ? 'stip' : 'stippen'}
        </span>
      </div>
    ) : (
      // var 4: ? input on the bottom
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={(e) => { e.stopPropagation(); if (status === 'idle') setIsNumpadOpen(true); }}
        className={cn(
          'w-20 h-20 rounded-3xl flex items-center justify-center border-2 shadow-lg transition-all',
          status === 'correct' ? 'bg-green-100 border-green-400 text-green-700' :
          status === 'incorrect' ? 'bg-red-100 border-red-400 text-red-700' :
          inputValue ? 'bg-orange-500 border-orange-600 text-white' :
          'bg-white border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50'
        )}
      >
        <span className="font-black" style={{ fontSize: 38 }}>{inputValue || '?'}</span>
      </motion.button>
    );

    return (
      <div className="flex flex-col items-center gap-3 py-1">
        {topContent}
        {/* Connector line */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-0.5 h-3 bg-slate-200 rounded-full" />
          {middleContent}
          <div className="w-0.5 h-3 bg-slate-200 rounded-full" />
        </div>
        {bottomContent}
      </div>
    );
  };

  const variationDescriptions: Record<VariationType, string> = {
    1: 'Twee getallen — kies het juiste teken!',
    2: 'Getal en stippen — kies het juiste teken!',
    3: 'Welk getal past hier? Vul het in!',
    4: 'Stippen en teken — vul het ontbrekende getal in!',
  };

  return (
    <div
      className="h-full w-full bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-50 flex flex-col overflow-hidden relative"
      onClick={() => setIsNumpadOpen(false)}
    >
      {/* ── Floating forest decorations ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {['🍂','🌻','⚖️','🌿','✨','🍊','🌸','⭐'].map((icon, i) => (
          <span key={i} className="absolute select-none" style={{
            left: `${[6, 18, 32, 47, 60, 73, 85, 92][i]}%`,
            top:  `${[10, 74, 24, 86, 16, 56, 38, 72][i]}%`,
            fontSize: `${[16, 18, 14, 20, 16, 18, 12, 16][i]}px`,
            opacity: 0.12,
            transform: `rotate(${i * 24}deg)`,
          }}>{icon}</span>
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 pt-10 pb-4 flex-shrink-0 shadow-lg relative z-10">
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
            {[...Array(3)].map((_, i) =>
              i < lives
                ? <Heart key={i} className="w-5 h-5 text-red-300 fill-red-300 drop-shadow" />
                : <HeartCrack key={i} className="w-5 h-5 text-white/30" />
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-4 pt-5 gap-4 max-w-md mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        {/* Instruction */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-1.5">
            <span className="text-lg">🌿</span>
            {variationDescriptions[question.variation]}
          </p>

          {/* Question card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${question.variation}-${question.leftValue}-${question.rightValue}-${question.symbol}`}
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -4 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.4 }}
              className={cn(
                'bg-white/90 rounded-3xl border-2 shadow-md p-5 transition-colors duration-300',
                status === 'correct'
                  ? 'border-green-300 bg-green-50/60'
                  : status === 'incorrect'
                    ? 'border-red-300 bg-red-50/60'
                    : 'border-amber-200'
              )}
            >
              {renderQuestionContent()}

              {/* Feedback text inside card */}
              <AnimatePresence>
                {status === 'incorrect' && needsSymbol && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center mt-4 text-sm font-bold text-slate-500"
                  >
                    Het juiste teken is{' '}
                    <span className="text-red-600 font-black">
                      {question.symbol}
                    </span>{' '}
                    ({SYMBOL_LABEL[question.symbol]})
                  </motion.p>
                )}
                {status === 'correct' && needsSymbol && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center mt-4 text-sm font-bold text-green-600"
                  >
                    ✓ Dat klopt! {question.leftValue} {question.symbol} {question.rightValue}
                  </motion.p>
                )}
                {status === 'correct' && needsNumber && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center mt-4 text-sm font-bold text-green-600"
                  >
                    ✓ Helemaal goed! +10 XP
                  </motion.p>
                )}
                {status === 'incorrect' && needsNumber && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center mt-4 text-sm font-bold text-slate-500"
                  >
                    Probeer een getal dat{' '}
                    {question.symbol === '>' ? `kleiner is dan ${question.leftValue}` :
                     question.symbol === '<' ? `groter is dan ${question.leftValue}` :
                     `gelijk is aan ${question.leftValue}`}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Symbol buttons (var 1 & 2) ──────────────────────────────── */}
        {needsSymbol && (
          <div className="flex-shrink-0">
            <p className="text-xs font-bold text-amber-500 mb-2.5 text-center uppercase tracking-wider">
              Kies het juiste teken
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(['<', '=', '>'] as CompSymbol[]).map(sym => (
                <motion.button
                  key={sym}
                  whileTap={{ scale: status === 'idle' ? 0.93 : 1 }}
                  onClick={() => handleSymbolSelect(sym)}
                  disabled={status !== 'idle'}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-3xl border-2 py-4 px-2 transition-all shadow-md',
                    status !== 'idle' && selectedSymbol === sym && sym === question.symbol
                      ? 'bg-green-500 border-green-600 text-white shadow-lg'
                      : status !== 'idle' && selectedSymbol === sym && sym !== question.symbol
                        ? 'bg-red-400 border-red-500 text-white shadow-lg'
                        : status !== 'idle' && sym === question.symbol
                          ? 'bg-green-100 border-green-400 text-green-700'
                          : status !== 'idle'
                            ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-60'
                            : 'bg-white/90 border-amber-200 text-amber-700 hover:border-amber-400 hover:bg-amber-50 hover:shadow-lg cursor-pointer'
                  )}
                >
                  <span className="font-black" style={{ fontSize: 32 }}>{sym}</span>
                  <span className="text-[10px] font-bold leading-tight text-center opacity-75">
                    {SYMBOL_LABEL[sym]}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── Hint for number input (var 3 & 4) ───────────────────────── */}
        {needsNumber && status === 'idle' && !inputValue && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 bg-amber-100 border-2 border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800">
              Tik op het <span className="text-amber-900">vraagteken</span> en voer een getal in!
            </p>
          </motion.div>
        )}

        {/* ── Feedback banners ────────────────────────────────────────── */}
        <AnimatePresence>
          {status === 'correct' && (
            <motion.div
              key="correct-banner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex-shrink-0 flex items-center gap-2 bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-3 shadow-sm"
            >
              <span className="text-xl">🎉</span>
              <p className="text-sm font-bold text-green-700">
                Super goed! Je begrijpt groter dan, kleiner dan en gelijk aan!
              </p>
            </motion.div>
          )}
          {status === 'incorrect' && (
            <motion.div
              key="incorrect-banner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex-shrink-0 flex items-center gap-2 bg-orange-50 border-2 border-orange-200 rounded-2xl px-4 py-3 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-bold text-orange-700">
                Bijna! Kijk goed naar de getallen en probeer opnieuw!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 h-2" />
      </div>

      {/* ── Sticky bottom bar (number input) ──────────────────────────── */}
      {needsNumber && (
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-md mx-auto w-full flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (status === 'idle') setIsNumpadOpen(true);
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-sm transition-all',
                inputValue && status === 'idle'
                  ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              )}
            >
              {inputValue
                ? <><span className="text-orange-500 font-black text-xl">{inputValue}</span><span className="text-slate-400 text-xs"> — wijzigen</span></>
                : 'Tik om een getal in te voeren'
              }
            </button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); handleNumberCheck(); }}
              disabled={!inputValue || status !== 'idle'}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-sm border flex-shrink-0',
                inputValue && status === 'idle'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600 active:scale-95'
                  : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
              )}
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              Controleer
            </motion.button>
          </div>
        </div>
      )}

      {/* ── Numpad backdrop ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isNumpadOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNumpadOpen(false)}
            className="absolute inset-0 bg-slate-900/30 z-40"
          />
        )}
      </AnimatePresence>

      {/* ── Numpad bottom sheet ────────────────────────────────────────── */}
      <AnimatePresence>
        {isNumpadOpen && (
          <motion.div
            key="numpad"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] shadow-[0_-8px_48px_rgba(0,0,0,0.18)] z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-slate-200" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-2 flex-shrink-0">
              <div>
                <p className="font-black text-slate-800">Voer een getal in</p>
                <p className="text-sm text-slate-500">
                  {question.symbol === '>'
                    ? `Het getal moet kleiner zijn dan ${question.leftValue}`
                    : question.symbol === '<'
                      ? `Het getal moet groter zijn dan ${question.leftValue}`
                      : `Het getal moet gelijk zijn aan ${question.leftValue}`}
                </p>
              </div>
              <button
                onClick={() => setIsNumpadOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
              </button>
            </div>

            {/* Current value display */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className={cn(
                'h-14 rounded-2xl flex items-center justify-center border-2 transition-colors',
                inputValue ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200'
              )}>
                <span
                  className={cn('font-black', inputValue ? 'text-orange-600' : 'text-slate-300')}
                  style={{ fontSize: 32 }}
                >
                  {inputValue || '?'}
                </span>
              </div>
            </div>

            {/* Numpad grid */}
            <div className="px-5 pb-6 flex-shrink-0">
              <div className="grid grid-cols-3 gap-3 mb-3">
                {numpadRows.map((row, ri) => (
                  <React.Fragment key={ri}>
                    {row.map(num => (
                      <button
                        key={num}
                        onClick={() => handleNumpadKey(num)}
                        className="relative h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 flex items-center justify-center font-black transition-all active:scale-95 overflow-hidden"
                        style={{ fontSize: 24 }}
                      >
                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />
                        {num}
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Delete */}
                <button
                  onClick={() => handleNumpadKey('del')}
                  className="h-14 rounded-2xl bg-red-100 hover:bg-red-200 active:bg-red-300 border border-red-200 flex items-center justify-center transition-all active:scale-95"
                >
                  <Delete className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                </button>
                {/* 0 */}
                <button
                  onClick={() => handleNumpadKey(0)}
                  className="relative h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 flex items-center justify-center font-black transition-all active:scale-95 overflow-hidden"
                  style={{ fontSize: 24 }}
                >
                  <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />
                  0
                </button>
                {/* Check */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleNumberCheck(); }}
                  disabled={!inputValue}
                  className={cn(
                    'h-14 rounded-2xl flex items-center justify-center border transition-all active:scale-95',
                    inputValue
                      ? 'bg-orange-500 hover:bg-orange-600 border-orange-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  )}
                >
                  <Check className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}