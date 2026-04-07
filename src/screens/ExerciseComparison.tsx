import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useGame } from '@/context/GameContext';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { randomInt } from '@/lib/random';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExerciseNumpad } from '@/components/exercise/ExerciseNumpad';

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
function generateQuestion(): Question {
  const variation = randomInt(1, 4) as VariationType;
  let leftValue: number, rightValue: number, symbol: CompSymbol;

  if (variation === 3 || variation === 4) {
    const pick = randomInt(0, 2);
    if (pick === 0) { leftValue = randomInt(0, 9); rightValue = randomInt(leftValue + 1, 10); symbol = '<'; }
    else if (pick === 1) { leftValue = randomInt(1, 10); rightValue = randomInt(0, leftValue - 1); symbol = '>'; }
    else { leftValue = randomInt(1, 10); rightValue = leftValue; symbol = '='; }
  } else {
    leftValue = randomInt(1, 10); rightValue = randomInt(1, 10);
    symbol = leftValue > rightValue ? '>' : leftValue < rightValue ? '<' : '=';
  }
  return { variation, leftValue, rightValue, symbol };
}

function checkNumberAnswer(input: string, question: Question): boolean {
  const n = parseInt(input, 10);
  if (isNaN(n)) return false;
  const { leftValue, symbol } = question;
  if (symbol === '>') return n < leftValue;
  if (symbol === '<') return n > leftValue;
  if (symbol === '=') return n === leftValue;
  return false;
}

const SYMBOL_LABEL: Record<CompSymbol, string> = { '<': 'kleiner dan', '>': 'groter dan', '=': 'gelijk aan' };

// ── Sub-components ─────────────────────────────────────────────────────────
function DotsDisplay({ count }: { count: number }) {
  const colsFull = Math.floor(count / 2);
  const hasExtra = count % 2 === 1;
  return (
    <div className="flex flex-col gap-2">
      {[0, 1].map(row => (
        <div key={row} className="flex gap-2 justify-center">
          {[0, 1, 2, 3, 4].map(col => {
            const filled = col < colsFull || (col === colsFull && row === 0 && hasExtra);
            return (
              <div key={col} className={cn('w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                filled ? 'bg-gradient-to-br from-orange-400 to-orange-500 border-orange-600 shadow-sm' : 'bg-[#1c1134] border-[#3b2d71]'
              )}>
                {filled && <div className="w-2.5 h-2.5 rounded-full bg-white/40" />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function NumBubble({ value, color }: { value: number | string; color: 'blue' | 'violet' | 'orange-filled' | 'orange-empty' }) {
  const base = 'w-20 h-20 rounded-3xl flex items-center justify-center border-2 flex-shrink-0 shadow-lg';
  const styles = {
    blue: 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-700 text-white',
    violet: 'bg-gradient-to-br from-violet-400 to-violet-600 border-violet-700 text-white',
    'orange-filled': 'bg-orange-500 border-orange-600 text-white',
    'orange-empty': 'bg-[#1c1134] border-dashed border-orange-400/50 text-orange-400/50',
  };
  return <div className={cn(base, styles[color])}><span className="font-black" style={{ fontSize: 38 }}>{value}</span></div>;
}

function SymSlot({ sym, status }: { sym: CompSymbol | null; status: QStatus }) {
  return (
    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300',
      sym && status === 'correct' ? 'bg-emerald-500/20 border-emerald-400/50' :
      sym && status === 'incorrect' ? 'bg-red-500/20 border-red-400/50' :
      'bg-[#1c1134] border-dashed border-amber-400/40'
    )}>
      {sym && status !== 'idle' ? (
        <span className={cn('font-black', status === 'correct' ? 'text-emerald-400' : 'text-red-400')} style={{ fontSize: 26 }}>{sym}</span>
      ) : (
        <span className="font-black text-amber-400/60" style={{ fontSize: 26 }}>?</span>
      )}
    </div>
  );
}

function SymBadge({ sym }: { sym: CompSymbol }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center border border-amber-600 shadow-md">
        <span className="font-black text-white" style={{ fontSize: 26 }}>{sym}</span>
      </div>
      <span className="text-[10px] font-bold text-white/40 whitespace-nowrap">{SYMBOL_LABEL[sym]}</span>
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
      triggerConfetti('medium', { colors: ['#f97316', '#fb923c', '#fcd34d', '#34d399', '#60a5fa'] });
      const nextProgress = Math.min(progress + 25, 100);
      setProgress(nextProgress);
      setTimeout(() => {
        if (nextProgress >= 100) navigate('/app/stage/fluisterbos');
        else generateNext();
      }, 1800);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      setTimeout(() => {
        if (nextLives <= 0) navigate('/app/stage/fluisterbos');
        else generateNext();
      }, 1600);
    }
  }, [progress, lives, addXp, navigate, generateNext]);

  const handleSymbolSelect = (sym: CompSymbol) => {
    if (status !== 'idle') return;
    setSelectedSymbol(sym);
    handleResult(sym === question.symbol);
  };

  const handleNumpadKey = (num: number | string) => {
    if (status !== 'idle') return;
    if (num === 'del') { setInputValue(prev => prev.slice(0, -1)); return; }
    setInputValue(prev => (prev.length < 2 ? prev + num : prev));
  };

  const handleNumberCheck = () => {
    if (!inputValue || status !== 'idle') return;
    setIsNumpadOpen(false);
    handleResult(checkNumberAnswer(inputValue, question));
  };

  const renderQuestionContent = () => {
    const { variation, leftValue, rightValue, symbol } = question;

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
      return (
        <div className="flex items-center justify-center gap-4">
          <NumBubble value={leftValue} color="blue" />
          <SymBadge sym={symbol} />
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={(e) => { e.stopPropagation(); if (status === 'idle') setIsNumpadOpen(true); }}
            className={cn('w-20 h-20 rounded-3xl flex items-center justify-center border-2 flex-shrink-0 shadow-lg transition-all',
              status === 'correct' ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400' :
              status === 'incorrect' ? 'bg-red-500/20 border-red-400/50 text-red-400' :
              inputValue ? 'bg-orange-500 border-orange-600 text-white' :
              'bg-[#1c1134] border-dashed border-orange-400/50 hover:border-orange-400'
            )}
          >
            <span className="font-black" style={{ fontSize: 38 }}>{inputValue || '?'}</span>
          </motion.button>
        </div>
      );
    }

    // Vertical layouts for var 2 & 4
    const topContent = variation === 2 ? (
      <div className="flex flex-col items-center gap-1">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg border border-blue-700">
          <span className="font-black text-white" style={{ fontSize: 38 }}>{leftValue}</span>
        </div>
        <span className="text-xs font-bold text-blue-400/60">getal</span>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-1.5">
        <DotsDisplay count={leftValue} />
        <span className="text-xs font-bold text-white/40">{leftValue} {leftValue === 1 ? 'stip' : 'stippen'}</span>
      </div>
    );

    const middleContent = variation === 2 ? (
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300',
        selectedSymbol && status === 'correct' ? 'bg-emerald-500/20 border-emerald-400/50' :
        selectedSymbol && status === 'incorrect' ? 'bg-red-500/20 border-red-400/50' :
        'bg-[#1c1134] border-dashed border-amber-400/40'
      )}>
        {selectedSymbol && status !== 'idle' ? (
          <span className={cn('font-black', status === 'correct' ? 'text-emerald-400' : 'text-red-400')} style={{ fontSize: 28 }}>{selectedSymbol}</span>
        ) : (
          <span className="font-black text-amber-400/60" style={{ fontSize: 28 }}>?</span>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center border border-amber-600 shadow-md">
          <span className="font-black text-white" style={{ fontSize: 28 }}>{symbol}</span>
        </div>
        <span className="text-[10px] font-bold text-white/40 whitespace-nowrap">{SYMBOL_LABEL[symbol]}</span>
      </div>
    );

    const bottomContent = variation === 2 ? (
      <div className="flex flex-col items-center gap-1.5">
        <DotsDisplay count={rightValue} />
        <span className="text-xs font-bold text-white/40">{rightValue} {rightValue === 1 ? 'stip' : 'stippen'}</span>
      </div>
    ) : (
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={(e) => { e.stopPropagation(); if (status === 'idle') setIsNumpadOpen(true); }}
        className={cn('w-20 h-20 rounded-3xl flex items-center justify-center border-2 shadow-lg transition-all',
          status === 'correct' ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400' :
          status === 'incorrect' ? 'bg-red-500/20 border-red-400/50 text-red-400' :
          inputValue ? 'bg-orange-500 border-orange-600 text-white' :
          'bg-[#1c1134] border-dashed border-orange-400/50 hover:border-orange-400'
        )}
      >
        <span className="font-black" style={{ fontSize: 38 }}>{inputValue || '?'}</span>
      </motion.button>
    );

    return (
      <div className="flex flex-col items-center gap-3 py-1">
        {topContent}
        <div className="flex flex-col items-center gap-1">
          <div className="w-0.5 h-3 bg-[#3b2d71] rounded-full" />
          {middleContent}
          <div className="w-0.5 h-3 bg-[#3b2d71] rounded-full" />
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
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/stage/fluisterbos')}
      onClick={() => setIsNumpadOpen(false)}
    >
      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col px-4 pt-5 gap-4 max-w-md mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-[#9d8bce] mb-3 flex items-center gap-1.5">
            <span className="text-lg">🌿</span>
            {variationDescriptions[question.variation]}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${question.variation}-${question.leftValue}-${question.rightValue}-${question.symbol}`}
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -4 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.4 }}
              className={cn('bg-[#1c1134]/60 backdrop-blur-sm rounded-3xl border-2 shadow-md p-5 transition-colors duration-300',
                status === 'correct' ? 'border-emerald-400/50' :
                status === 'incorrect' ? 'border-red-400/50' :
                'border-[#3b2d71]'
              )}
            >
              {renderQuestionContent()}

              <AnimatePresence>
                {status === 'incorrect' && needsSymbol && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mt-4 text-sm font-bold text-white/50">
                    Het juiste teken is <span className="text-red-400 font-black">{question.symbol}</span> ({SYMBOL_LABEL[question.symbol]})
                  </motion.p>
                )}
                {status === 'correct' && needsSymbol && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mt-4 text-sm font-bold text-emerald-400">
                    ✓ Dat klopt! {question.leftValue} {question.symbol} {question.rightValue}
                  </motion.p>
                )}
                {status === 'correct' && needsNumber && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mt-4 text-sm font-bold text-emerald-400">
                    ✓ Helemaal goed! +10 XP
                  </motion.p>
                )}
                {status === 'incorrect' && needsNumber && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mt-4 text-sm font-bold text-white/50">
                    Probeer een getal dat {question.symbol === '>' ? `kleiner is dan ${question.leftValue}` : question.symbol === '<' ? `groter is dan ${question.leftValue}` : `gelijk is aan ${question.leftValue}`}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Symbol buttons (var 1 & 2) */}
        {needsSymbol && (
          <div className="flex-shrink-0">
            <p className="text-xs font-bold text-[#9d8bce] mb-2.5 text-center uppercase tracking-wider">Kies het juiste teken</p>
            <div className="grid grid-cols-3 gap-3">
              {(['<', '=', '>'] as CompSymbol[]).map(sym => (
                <motion.button
                  key={sym}
                  whileTap={{ scale: status === 'idle' ? 0.93 : 1 }}
                  onClick={() => handleSymbolSelect(sym)}
                  disabled={status !== 'idle'}
                  className={cn('flex flex-col items-center justify-center gap-1.5 rounded-3xl border-2 py-4 px-2 transition-all shadow-md',
                    status !== 'idle' && selectedSymbol === sym && sym === question.symbol ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg' :
                    status !== 'idle' && selectedSymbol === sym && sym !== question.symbol ? 'bg-red-400 border-red-500 text-white shadow-lg' :
                    status !== 'idle' && sym === question.symbol ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400' :
                    status !== 'idle' ? 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed opacity-60' :
                    'bg-[#2d1b54] border-[#4c3b82] text-amber-400 hover:border-amber-400 hover:bg-[#3b2d71] hover:shadow-lg cursor-pointer'
                  )}
                >
                  <span className="font-black" style={{ fontSize: 32 }}>{sym}</span>
                  <span className="text-[10px] font-bold leading-tight text-center opacity-75">{SYMBOL_LABEL[sym]}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {needsNumber && status === 'idle' && !inputValue && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 bg-amber-500/10 border-2 border-amber-400/20 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-300">Tik op het <span className="text-amber-200">vraagteken</span> en voer een getal in!</p>
          </motion.div>
        )}

        <AnimatePresence>
          {status === 'correct' && (
            <motion.div key="correct-banner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex-shrink-0 flex items-center gap-2 bg-emerald-500/20 border-2 border-emerald-400/30 rounded-2xl px-4 py-3 shadow-sm">
              <span className="text-xl">🎉</span>
              <p className="text-sm font-bold text-emerald-400">Super goed! Je begrijpt groter dan, kleiner dan en gelijk aan!</p>
            </motion.div>
          )}
          {status === 'incorrect' && (
            <motion.div key="incorrect-banner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex-shrink-0 flex items-center gap-2 bg-orange-500/20 border-2 border-orange-400/30 rounded-2xl px-4 py-3 shadow-sm">
              <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-sm font-bold text-orange-300">Bijna! Kijk goed naar de getallen en probeer opnieuw!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 h-2" />
      </div>

      {/* Numpad for number input variations */}
      {needsNumber && (
        <ExerciseNumpad
          isOpen={isNumpadOpen}
          onClose={() => setIsNumpadOpen(false)}
          inputValue={inputValue}
          onNumberClick={(num) => handleNumpadKey(num as number | 'del')}
          onDelete={() => handleNumpadKey('del')}
          onCheck={handleNumberCheck}
          status={status}
          checkDisabled={!inputValue}
        />
      )}
    </ExerciseShell>
  );
}
