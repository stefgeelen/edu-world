import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { explainGeometry } from '@/data/exerciseExplanations';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { ExerciseModePicker, type ExerciseMode } from '@/components/exercise/ExerciseModePicker';
import { GeometryFigure } from '@/components/exercise/GeometryFigure';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';
import { DEFAULT_GEOMETRY } from '@/data/difficultyConfig';
import {
  generateGeometryRun,
  GEOMETRY_RUN_LENGTH,
  GEOMETRY_TOPICS,
  type AnglePart,
  type GeometryMode,
  type GeometryQuestion,
} from '@/lib/geometryQuestions';
import { exerciseExitPath } from '@/routes/paths';

/*
 * Lijnen en hoeken (Meetkunde, 2de leerjaar): the child names lines, a punt,
 * a rechte and a lijnstuk, the parts of a hoek, and evenwijdige and snijdende
 * lijnen. First a choice of part (or door elkaar), then 6 questions.
 */

const MODES: ExerciseMode<GeometryMode>[] = [
  { value: 'lines', title: 'Lijnen', example: 'recht, gebogen, gebroken' },
  { value: 'point-line-segment', title: 'Punt, rechte, lijnstuk', example: 'punt A, rechte b, [CD]' },
  { value: 'angles', title: 'Hoeken', example: 'hoekpunt en benen' },
  { value: 'parallel', title: 'Evenwijdig of snijdend', example: 'en loodrecht' },
  { value: 'mix', title: 'Door elkaar', example: 'van alles wat' },
];

type Answer = string | number | AnglePart;

const COLORS = [
  'from-blue-500 to-blue-600 border-blue-700',
  'from-violet-500 to-violet-600 border-violet-700',
  'from-teal-500 to-teal-600 border-teal-700',
];

export function ExerciseGeometryTerms() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const config = useExerciseConfig(DEFAULT_GEOMETRY);

  const startTime = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const topics = GEOMETRY_TOPICS.filter((t) => config.topics.includes(t));
  const modes = MODES.filter((m) => (m.value === 'mix' ? topics.length > 1 : topics.includes(m.value)));

  const [mode, setMode] = useState<GeometryMode | null>(null);
  const [questions, setQuestions] = useState<GeometryQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Answer | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [lives, setLives] = useState(3);

  const question = questions[index];
  const progress = (index + (status === 'correct' ? 1 : 0)) * (100 / GEOMETRY_RUN_LENGTH);

  const pickMode = (m: GeometryMode) => {
    setMode(m);
    setQuestions(generateGeometryRun(m, { topics: topics.length ? topics : GEOMETRY_TOPICS }));
    setIndex(0);
    startTime.current = Date.now();
  };

  // With only one part switched on, there is nothing to choose.
  useEffect(() => {
    if (mode === null && modes.length === 1) pickMode(modes[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modes.length]);

  const handleAnswer = (answer: Answer) => {
    if (!question || status !== 'idle') return;
    setSelected(answer);
    if (answer === question.answer) {
      setStatus('correct');
      triggerConfetti('small', { colors: ['#ec4899', '#22d3ee', '#fbbf24'], originY: 0.5 });
      timer.current = setTimeout(() => {
        if (index + 1 >= questions.length) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({ exerciseId, score: GEOMETRY_RUN_LENGTH, maxScore: GEOMETRY_RUN_LENGTH, stars: lives, timeSpent });
          }
          navigate(exerciseExitPath());
        } else {
          setIndex(index + 1);
          setSelected(null);
          setStatus('idle');
        }
      }, 1200);
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

  const look = (isSelected: boolean) =>
    status === 'correct' && isSelected ? 'correct' : status === 'incorrect' && isSelected ? 'wrong' : 'idle';

  return (
    <ExerciseShell progress={progress} lives={lives} onClose={() => navigate(exerciseExitPath())} explain={explainGeometry(mode, question)}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center z-10 relative px-4 pb-10">
          <ExercisePrompt className="mb-6">{mode === null ? 'Wat wil je oefenen?' : question?.prompt}</ExercisePrompt>

          {mode === null ? (
            <ExerciseModePicker modes={modes} onPick={pickMode} />
          ) : question && (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl flex flex-col items-center gap-6"
            >
              {question.format === 'pick' ? (
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                  {question.figures.map((figure, i) => {
                    const state = look(selected === i);
                    return (
                      <motion.button
                        key={i}
                        type="button"
                        whileTap={{ scale: status === 'idle' ? 0.95 : 1 }}
                        onClick={() => handleAnswer(i)}
                        disabled={status !== 'idle'}
                        aria-label={`Tekening ${i + 1}`}
                        className={cn(
                          'overflow-hidden rounded-3xl border-4 bg-[#1c1134]/70 py-2 shadow-lg transition-colors',
                          state === 'correct' ? 'border-emerald-400 bg-emerald-500/20' :
                          state === 'wrong' ? 'border-rose-400 bg-rose-500/20' :
                          'border-[#3b2d71] hover:border-[#a78bfa]',
                        )}
                      >
                        <GeometryFigure figure={figure} className="max-h-36 sm:max-h-none" />
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full overflow-hidden bg-[#1c1134]/60 backdrop-blur-sm rounded-[2.5rem] py-4 md:py-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71]">
                  <GeometryFigure
                    figure={question.figure}
                    className="mx-auto max-h-[38vh]"
                    tap={question.format === 'tap'
                      ? { onTap: handleAnswer, tapped: selected as AnglePart | null, status }
                      : undefined}
                  />
                </div>
              )}

              {question.format === 'name' && (
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
                  {question.options.map((option, i) => {
                    const state = look(selected === option);
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        whileTap={{ scale: status === 'idle' ? 0.95 : 1 }}
                        onClick={() => handleAnswer(option)}
                        disabled={status !== 'idle'}
                        className={cn(
                          'relative flex items-center justify-center min-h-16 md:min-h-20 py-2 rounded-3xl font-black text-lg md:text-xl text-white shadow-lg border-b-[6px] px-3 overflow-hidden',
                          state === 'correct' ? 'bg-gradient-to-br from-green-400 to-emerald-600 border-green-700' :
                          state === 'wrong' ? 'bg-gradient-to-br from-rose-500 to-red-700 border-red-800' :
                          `bg-gradient-to-br ${COLORS[i % COLORS.length]}`,
                        )}
                      >
                        <div className="absolute inset-x-0 top-0 h-1/3 bg-white/20 rounded-t-3xl pointer-events-none" />
                        <span className="relative z-10 drop-shadow-sm">{option}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {status === 'incorrect' && lives > 0 && (
                <p className="text-sm font-bold uppercase tracking-wide text-orange-300">Bijna! Probeer nog eens.</p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </ExerciseShell>
  );
}
