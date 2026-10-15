import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { explainEvenOdd } from '@/data/exerciseExplanations';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';
import { DEFAULT_EVEN_ODD } from '@/data/difficultyConfig';
import { generateEvenOddQuestion, type EvenOddQuestion } from '@/lib/mathQuestions';
import { exerciseExitPath } from '@/routes/paths';
import { inTens } from '@/lib/getalbeeld';

type Answer = string | number;

const PAIR_DOT = 'w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-orange-600';

/**
 * Up to 20 the number is shown as a getalbeeld (one per ten) in pairs, top and
 * bottom, so an odd one sticks out on top at the end.
 */
function Pairs({ count }: { count: number }) {
  return (
    <div className="flex items-start justify-center gap-4" aria-hidden="true">
      {inTens(count).map((size, g) => (
        <div key={g} className="flex items-start gap-1.5">
          {Array.from({ length: Math.floor(size / 2) }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
              <div className={PAIR_DOT} />
              <div className={PAIR_DOT} />
            </div>
          ))}
          {size % 2 === 1 && (
            <div className="p-1 rounded-xl bg-white/5 border border-dashed border-white/20">
              <div className={PAIR_DOT} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function promptFor(q: EvenOddQuestion): string {
  if (q.kind === 'double') return 'Wat is het dubbel?';
  if (q.kind === 'half') return 'Wat is de helft?';
  return 'Is dit getal even of oneven?';
}

/** Four options for doubles and halves; the wrong ones are near misses. */
function numberOptions(answer: number): number[] {
  const options = new Set([answer]);
  for (const c of [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10].sort(() => Math.random() - 0.5)) {
    if (options.size >= 4) break;
    if (c >= 0) options.add(c);
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
}

function optionsFor(q: EvenOddQuestion): Answer[] {
  return q.kind === 'even-odd' ? ['even', 'oneven'] : numberOptions(q.answer);
}

const COLORS = [
  'from-blue-500 to-blue-600 border-blue-700',
  'from-violet-500 to-violet-600 border-violet-700',
  'from-teal-500 to-teal-600 border-teal-700',
  'from-rose-500 to-rose-600 border-rose-700',
];

export function ExerciseEvenOdd() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const config = useExerciseConfig(DEFAULT_EVEN_ODD);

  const [question, setQuestion] = useState<EvenOddQuestion>(() => generateEvenOddQuestion(DEFAULT_EVEN_ODD));
  const [options, setOptions] = useState<Answer[]>(() => optionsFor(question));
  const [selected, setSelected] = useState<Answer | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);

  const regenerate = useCallback(() => {
    const q = generateEvenOddQuestion(config);
    setQuestion(q);
    setOptions(optionsFor(q));
    setSelected(null);
    setStatus('idle');
  }, [config]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleSelect = (option: Answer) => {
    if (status !== 'idle') return;
    setSelected(option);

    if (option === question.answer) {
      setStatus('correct');
      const nextProgress = progress + 20;
      setProgress(nextProgress);
      correctCount.current += 1;
      triggerConfetti('small', { colors: ['#3b82f6', '#14b8a6', '#f59e0b'], originY: 0.6 });
      timer.current = setTimeout(() => {
        if (nextProgress >= 100) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: 5, stars: lives === 3 ? 3 : lives === 2 ? 2 : 1, timeSpent });
          }
          navigate(exerciseExitPath());
        } else {
          regenerate();
        }
      }, 1500);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      timer.current = setTimeout(() => {
        if (nextLives <= 0) {
          navigate(exerciseExitPath());
        } else {
          setSelected(null);
          setStatus('idle');
        }
      }, 1500);
    }
  };

  return (
    <ExerciseShell progress={progress} lives={lives} onClose={() => navigate(exerciseExitPath())} explain={explainEvenOdd(question)}>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-6 md:px-12 pb-8 max-w-3xl mx-auto w-full z-10 relative">
        <ExercisePrompt>{promptFor(question)}</ExercisePrompt>

        <motion.div
          key={`${question.kind}-${question.number}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1c1134]/60 backdrop-blur-sm rounded-[2.5rem] p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71] flex flex-col items-center justify-center gap-5 min-h-[200px] md:min-h-[260px] mb-8"
        >
          {question.kind === 'even-odd' ? (
            <>
              <span className="text-7xl md:text-9xl font-black text-cyan-400 drop-shadow-sm" data-testid="even-odd-number">{question.number}</span>
              {question.number <= 20 && <Pairs count={question.number} />}
            </>
          ) : (
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight text-center leading-tight">
              <span className="text-amber-400">{question.kind === 'double' ? 'het dubbel van' : 'de helft van'}</span>{' '}
              <span className="text-cyan-400" data-testid="even-odd-number">{question.number}</span>
            </h2>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {options.map((option, i) => {
            const isSelected = selected === option;
            const isCorrect = status === 'correct' && isSelected;
            const isWrong = status === 'incorrect' && isSelected;
            return (
              <motion.button
                key={String(option)}
                whileTap={{ scale: status === 'idle' ? 0.95 : 1 }}
                onClick={() => handleSelect(option)}
                disabled={status !== 'idle'}
                className={cn(
                  'relative h-24 md:h-28 rounded-3xl font-black transition-all duration-200 flex items-center justify-center overflow-hidden shadow-lg border-b-[6px] text-white',
                  typeof option === 'number' ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl',
                  isCorrect
                    ? 'bg-gradient-to-br from-green-400 to-emerald-600 border-green-700 scale-105'
                    : isWrong
                    ? 'bg-gradient-to-br from-rose-500 to-red-700 border-red-800'
                    : `bg-gradient-to-br ${COLORS[i]}`,
                )}
              >
                <div className="absolute inset-x-0 top-0 h-1/3 bg-white/20 rounded-t-3xl pointer-events-none" />
                <span className="relative z-10 drop-shadow-sm">{option}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
