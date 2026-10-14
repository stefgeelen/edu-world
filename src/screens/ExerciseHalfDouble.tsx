import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { randomInt } from '@/lib/random';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { explainHalfDouble } from '@/data/exerciseExplanations';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { ExerciseNumpad } from '@/components/exercise/ExerciseNumpad';
import { ExerciseModePicker, type ExerciseMode } from '@/components/exercise/ExerciseModePicker';
import { ObjectsPicture, countLabel } from '@/components/exercise/CountPicture';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';
import { DEFAULT_HALF_DOUBLE } from '@/data/difficultyConfig';
import {
  generateHalfDoubleRun,
  HALF_DOUBLE_RUN_LENGTH,
  type HalfDoubleMode,
  type HalfDoubleQuestion,
} from '@/lib/mathQuestions';
import { exerciseExitPath } from '@/routes/paths';

const MODES: ExerciseMode<HalfDoubleMode>[] = [
  { value: 'half', title: 'De helft', example: '8 → 4' },
  { value: 'double', title: 'Het dubbel', example: '4 → 8' },
  { value: 'mix', title: 'Door elkaar', example: 'helft en dubbel' },
];

const THINGS = [
  { emoji: '🍎', plural: 'appels' },
  { emoji: '⚽', plural: 'ballen' },
  { emoji: '🌟', plural: 'sterren' },
  { emoji: '🍓', plural: 'aardbeien' },
  { emoji: '🐟', plural: 'visjes' },
  { emoji: '🌸', plural: 'bloemen' },
  { emoji: '🍪', plural: 'koekjes' },
];

function pictureLabel(count: number, plural: string): string {
  return count > 20 ? countLabel(count) : `${count} ${plural}`;
}

export function ExerciseHalfDouble() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const config = useExerciseConfig(DEFAULT_HALF_DOUBLE);

  const startTime = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const [mode, setMode] = useState<HalfDoubleMode | null>(null);
  const [questions, setQuestions] = useState<HalfDoubleQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [thing, setThing] = useState(THINGS[0]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);
  const [isNumpadOpen, setIsNumpadOpen] = useState(true);
  const [numpadHeight, setNumpadHeight] = useState(0);

  const question = questions[index];
  const progress = (index + (status === 'correct' ? 1 : 0)) * (100 / HALF_DOUBLE_RUN_LENGTH);

  const pickMode = (m: HalfDoubleMode) => {
    setMode(m);
    setQuestions(generateHalfDoubleRun(m, config));
    setIndex(0);
    setThing(THINGS[randomInt(0, THINGS.length - 1)]);
    startTime.current = Date.now();
  };

  const handleCheck = () => {
    if (!inputValue || !question || status !== 'idle') return;
    if (parseInt(inputValue, 10) === question.answer) {
      setStatus('correct');
      triggerConfetti('small', { colors: ['#3b82f6', '#14b8a6', '#f59e0b'], originY: 0.5 });
      timer.current = setTimeout(() => {
        if (index + 1 >= questions.length) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: HALF_DOUBLE_RUN_LENGTH, maxScore: HALF_DOUBLE_RUN_LENGTH, stars: lives, timeSpent });
          }
          navigate(exerciseExitPath());
        } else {
          setIndex(index + 1);
          setThing(THINGS[randomInt(0, THINGS.length - 1)]);
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

  const handleNumber = (num: number | string) => {
    if (status === 'correct') return;
    if (status === 'incorrect') {
      setStatus('idle');
      setInputValue(String(num));
      return;
    }
    setInputValue((prev) => (prev.length < 3 ? prev + num : prev));
  };

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(exerciseExitPath())}
      explain={explainHalfDouble(mode, question, thing.plural)}
      onClick={() => mode !== null && setIsNumpadOpen(false)}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="min-h-full flex flex-col items-center z-10 relative px-4"
          style={{ paddingBottom: mode !== null && isNumpadOpen ? numpadHeight + 16 : 48 }}
        >
          <ExercisePrompt className="mb-6">{mode === null ? 'Wat wil je oefenen?' : 'Vul in.'}</ExercisePrompt>

          {mode === null ? (
            <ExerciseModePicker modes={MODES} onPick={pickMode} />
          ) : question && (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl bg-[#1c1134]/60 backdrop-blur-sm rounded-[2.5rem] px-5 py-7 md:px-10 md:py-9 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71] flex flex-col items-center gap-6 relative"
            >
              {question.picture && (
                <ObjectsPicture count={question.number} emoji={thing.emoji} label={pictureLabel(question.number, thing.plural)} />
              )}

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:gap-x-4">
                <span className="text-3xl md:text-5xl font-black text-amber-400">
                  {question.kind === 'half' ? 'De helft van' : 'Het dubbel van'}
                </span>
                <span className="flex items-center gap-3 md:gap-4">
                  <span className="text-5xl md:text-7xl font-black text-cyan-400" data-testid="half-double-number">{question.number}</span>
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
                </span>
              </div>

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

      {mode !== null && (
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
          onTryAgain={() => { setInputValue(''); setStatus('idle'); }}
          checkDisabled={!inputValue}
          onHeightChange={setNumpadHeight}
        />
      )}
    </ExerciseShell>
  );
}
