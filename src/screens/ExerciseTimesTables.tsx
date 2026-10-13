import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { ExerciseNumpad } from '@/components/exercise/ExerciseNumpad';
import { useCompleteExercise, useCurrentChild } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';
import { useRecordTimesTableRun, useTimesTables, type TableProgress } from '@/hooks/useTimesTables';
import { DEFAULT_TIMES_TABLES, TABLE_STICKER_RUNS } from '@/data/difficultyConfig';
import { generateTableRun, TABLE_RUN_LENGTH, type TableQuestion } from '@/lib/mathQuestions';
import { exerciseExitPath } from '@/routes/paths';

const STEP = 100 / TABLE_RUN_LENGTH;

/** One tile per table that is open: a sticker when known, else dots for runs without a mistake. */
function TablePicker({ tables, progress, onPick }: {
  tables: number[];
  progress: Record<number, TableProgress>;
  onPick: (table: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-xl">
      {tables.map((table) => {
        const p = progress[table];
        const flawless = Math.min(p?.flawlessRuns ?? 0, TABLE_STICKER_RUNS);
        return (
          <motion.button
            key={table}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(table)}
            aria-label={`Tafel van ${table}${p?.sticker ? ', die ken je!' : ''}`}
            className="relative h-28 md:h-32 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 border-b-[6px] border-indigo-800 shadow-lg text-white flex flex-col items-center justify-center gap-1"
          >
            <div className="absolute inset-x-0 top-0 h-1/3 bg-white/15 rounded-t-3xl pointer-events-none" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">Tafel van</span>
            <span className="text-4xl md:text-5xl font-black drop-shadow-sm">{table}</span>
            {p?.sticker ? (
              <span className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 border-2 border-amber-600 shadow-lg flex items-center justify-center rotate-12" data-testid={`sticker-${table}`}>
                <Star className="w-5 h-5 text-white fill-white" />
              </span>
            ) : (
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: TABLE_STICKER_RUNS }).map((_, i) => (
                  <span key={i} className={cn('w-2 h-2 rounded-full', i < flawless ? 'bg-amber-300' : 'bg-white/25')} />
                ))}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export function ExerciseTimesTables() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { data: child } = useCurrentChild();
  const { data: tableProgress = {} } = useTimesTables(child?.id);
  const recordRun = useRecordTimesTableRun(child?.id);
  const config = useExerciseConfig(DEFAULT_TIMES_TABLES);

  const startTime = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const [table, setTable] = useState<number | null>(null);
  const [questions, setQuestions] = useState<TableQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);
  const [isNumpadOpen, setIsNumpadOpen] = useState(true);
  const [numpadHeight, setNumpadHeight] = useState(0);
  const [newSticker, setNewSticker] = useState<number | null>(null);

  const question = questions[index];

  const pickTable = (t: number) => {
    setTable(t);
    setQuestions(generateTableRun(t, config.divisionTables.includes(t)));
    setIndex(0);
    startTime.current = Date.now();
  };

  const finish = (t: number) => {
    const mistakes = 3 - lives;
    if (exerciseId) {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      completeExercise.mutate({ exerciseId, score: TABLE_RUN_LENGTH, maxScore: TABLE_RUN_LENGTH, stars: lives, timeSpent });
    }
    recordRun.mutate({ table: t, mistakes });

    const before = tableProgress[t]?.flawlessRuns ?? 0;
    if (mistakes === 0 && before === TABLE_STICKER_RUNS - 1) {
      setNewSticker(t);
      triggerConfetti('large', { colors: ['#fcd34d', '#fbbf24', '#a78bfa'], originY: 0.4 });
      timer.current = setTimeout(() => navigate(exerciseExitPath()), 3000);
    } else {
      navigate(exerciseExitPath());
    }
  };

  const handleCheck = () => {
    if (!inputValue || !question || table === null || status !== 'idle') return;
    if (parseInt(inputValue, 10) === question.answer) {
      setStatus('correct');
      const nextProgress = progress + STEP;
      setProgress(nextProgress);
      triggerConfetti('small', { colors: ['#3b82f6', '#14b8a6', '#f59e0b'], originY: 0.5 });
      timer.current = setTimeout(() => {
        if (index + 1 >= questions.length) {
          finish(table);
        } else {
          setIndex(index + 1);
          setInputValue('');
          setStatus('idle');
          setIsNumpadOpen(true);
        }
      }, 1000);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        timer.current = setTimeout(() => navigate(exerciseExitPath()), 1500);
      }
    }
  };

  const handleTryAgain = () => {
    setInputValue('');
    setStatus('idle');
  };

  const handleNumber = (num: number | string) => {
    if (status === 'correct') return;
    if (status === 'incorrect') {
      setStatus('idle');
      setInputValue(String(num));
      return;
    }
    setInputValue((prev) => (prev.length < 3 ? prev + num : prev));
  };

  const prompt = newSticker !== null
    ? 'Sticker verdiend!'
    : table === null
    ? 'Welke tafel oefen je?'
    : `De tafel van ${table}`;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(exerciseExitPath())}
      onClick={() => table !== null && setIsNumpadOpen(false)}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="min-h-full flex flex-col items-center z-10 relative px-4"
          style={{ paddingBottom: table !== null && isNumpadOpen ? numpadHeight + 16 : 48 }}
        >
          <ExercisePrompt className="mb-6">{prompt}</ExercisePrompt>

          {newSticker !== null ? (
            <motion.div
              initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 8, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="mt-6 flex flex-col items-center gap-4"
            >
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 border-4 border-amber-600 shadow-[0_0_40px_rgba(251,191,36,0.5)] flex flex-col items-center justify-center">
                <Star className="w-12 h-12 text-white fill-white" />
                <span className="text-2xl font-black text-white drop-shadow">{newSticker}</span>
              </div>
              <p className="text-lg font-black text-amber-200">Je kent de tafel van {newSticker}!</p>
            </motion.div>
          ) : table === null ? (
            <TablePicker tables={config.tables} progress={tableProgress} onPick={pickTable} />
          ) : question && (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1c1134]/60 backdrop-blur-sm rounded-[2.5rem] px-6 py-8 md:px-12 md:py-10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71] flex items-center justify-center gap-3 md:gap-5 relative"
            >
              <span className="text-5xl md:text-7xl font-black text-cyan-400">{question.num1}</span>
              <span className="text-5xl md:text-7xl font-black text-amber-400">{question.operator}</span>
              <span className="text-5xl md:text-7xl font-black text-emerald-400">{question.num2}</span>
              <span className="text-5xl md:text-7xl font-black text-[#9d8bce]">=</span>
              <motion.button
                onClick={(e) => { e.stopPropagation(); setIsNumpadOpen(true); }}
                animate={status === 'incorrect' ? { x: [-5, 5, -4, 4, -2, 2, 0] } : { scale: 1 }}
                aria-label="Jouw antwoord"
                className={cn(
                  'min-w-[5.5rem] md:min-w-[7.5rem] h-20 md:h-24 px-3 rounded-2xl flex items-center justify-center border-2 transition-colors',
                  status === 'correct' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' :
                  status === 'incorrect' ? 'bg-orange-500/20 border-orange-400 text-orange-300' :
                  inputValue ? 'bg-purple-500 border-purple-700 text-white' :
                  'bg-[#2d1b54]/40 border-dashed border-[#a78bfa] text-[#a78bfa]/60',
                )}
              >
                <span className="text-5xl md:text-6xl font-black">{inputValue || '?'}</span>
              </motion.button>
              <AnimatePresence>
                {status === 'incorrect' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-12 flex items-center gap-2 bg-orange-100/10 px-4 py-2 rounded-full border border-orange-400/30"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-bold text-orange-300 uppercase tracking-wide">Bijna!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {table !== null && newSticker === null && (
        <ExerciseNumpad
          isOpen={isNumpadOpen}
          onClose={() => setIsNumpadOpen(false)}
          inputValue={inputValue}
          onNumberClick={handleNumber}
          onDelete={() => {
            setInputValue((prev) => prev.slice(0, -1));
            if (status === 'incorrect') setStatus('idle');
          }}
          onCheck={handleCheck}
          status={status}
          onTryAgain={handleTryAgain}
          checkDisabled={!inputValue}
          onHeightChange={setNumpadHeight}
        />
      )}
    </ExerciseShell>
  );
}
