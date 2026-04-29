import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { randomInt } from '@/lib/random';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { COMPARE_OBJECTS_CONFIG, DEFAULT_COMPARE_OBJECTS } from '@/data/difficultyConfig';
import { useSpeech } from '@/hooks/useSpeech';

// ── Types ──────────────────────────────────────────────────────────────────
type Answer = 'left' | 'right' | 'equal';
type QStatus = 'idle' | 'correct' | 'incorrect';

interface ObjectType {
  emoji: string;
  singular: string;
  plural: string;
}

interface Question {
  left: ObjectType;
  right: ObjectType;
  leftCount: number;
  rightCount: number;
  correct: Answer;
}

// ── Object pool ────────────────────────────────────────────────────────────
const OBJECT_TYPES: ObjectType[] = [
  { emoji: '🍎', singular: 'appel',    plural: 'appels'    },
  { emoji: '⚽', singular: 'bal',      plural: 'ballen'    },
  { emoji: '🐱', singular: 'kat',      plural: 'katten'    },
  { emoji: '🌟', singular: 'ster',     plural: 'sterren'   },
  { emoji: '🚗', singular: "auto",     plural: "auto's"    },
  { emoji: '🍌', singular: 'banaan',   plural: 'bananen'   },
  { emoji: '🐶', singular: 'hond',     plural: 'honden'    },
  { emoji: '✏️', singular: 'potlood',  plural: 'potloden'  },
  { emoji: '🌸', singular: 'bloem',    plural: 'bloemen'   },
  { emoji: '🦋', singular: 'vlinder',  plural: 'vlinders'  },
  { emoji: '🍓', singular: 'aardbei',  plural: 'aardbeien' },
  { emoji: '🐸', singular: 'kikker',   plural: 'kikkers'   },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function generateQuestion(min: number, max: number): Question {
  // Pick two different object types
  const shuffled = [...OBJECT_TYPES].sort(() => Math.random() - 0.5);
  const left = shuffled[0];
  const right = shuffled[1];

  // ~20% chance of equal counts
  const makeEqual = Math.random() < 0.2;
  let leftCount: number;
  let rightCount: number;

  if (makeEqual) {
    leftCount = randomInt(min, max);
    rightCount = leftCount;
  } else {
    leftCount = randomInt(min, max);
    // Ensure right differs from left; retry once if same
    rightCount = randomInt(min, max);
    if (rightCount === leftCount) {
      rightCount = leftCount === max ? leftCount - 1 : leftCount + 1;
    }
  }

  const correct: Answer = leftCount > rightCount ? 'left' : leftCount < rightCount ? 'right' : 'equal';
  return { left, right, leftCount, rightCount, correct };
}

function objectLabel(obj: ObjectType, count: number): string {
  return `${count} ${count === 1 ? obj.singular : obj.plural}`;
}

// ── Sub-component: object grid ─────────────────────────────────────────────
function ObjectGrid({ obj, count, highlight }: { obj: ObjectType; count: number; highlight: 'none' | 'correct' | 'incorrect' | 'winner' }) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-3 rounded-3xl border-2 p-4 transition-all duration-300 flex-1',
      highlight === 'correct' || highlight === 'winner'
        ? 'bg-emerald-500/15 border-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.2)]'
        : highlight === 'incorrect'
          ? 'bg-red-500/15 border-red-400/50'
          : 'bg-[#1c1134]/60 backdrop-blur-sm border-[#3b2d71]',
    )}>
      {/* Emoji grid — wraps at 4 per row */}
      <div className="flex flex-wrap justify-center gap-1.5 min-h-[40px]">
        {Array.from({ length: count }).map((_, i) => (
          <span key={i} className="text-3xl leading-none select-none">{obj.emoji}</span>
        ))}
      </div>
      {/* Count label */}
      <span className={cn(
        'text-xs font-bold text-center leading-tight',
        highlight === 'correct' || highlight === 'winner' ? 'text-emerald-300' :
        highlight === 'incorrect' ? 'text-red-300' :
        'text-white/50',
      )}>
        {objectLabel(obj, count)}
      </span>
    </div>
  );
}

// ── Answer buttons ─────────────────────────────────────────────────────────
const BUTTONS: { value: Answer; label: string; icon: string }[] = [
  { value: 'left',  label: 'Links',  icon: '◀' },
  { value: 'equal', label: 'Gelijk', icon: '='  },
  { value: 'right', label: 'Rechts', icon: '▶' },
];

// ── Main Component ─────────────────────────────────────────────────────────
export function ExerciseCompareObjects() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { key: difficultyKey } = useDifficultyLevel();
  const correctCount = useRef(0);
  const startTime = useRef(Date.now());
  const { speak } = useSpeech();

  const config = COMPARE_OBJECTS_CONFIG[difficultyKey] ?? DEFAULT_COMPARE_OBJECTS;

  const [question, setQuestion] = useState<Question>(() =>
    generateQuestion(config.minObjects, config.maxObjects)
  );

  useEffect(() => {
    const text = `${objectLabel(question.left, question.leftCount)} of ${objectLabel(question.right, question.rightCount)}, welke kant heeft meer?`;
    const t = setTimeout(() => speak(text), 400);
    return () => clearTimeout(t);
  }, [question, speak]);
  const [selected, setSelected] = useState<Answer | null>(null);
  const [status, setStatus] = useState<QStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);

  const generateNext = useCallback(() => {
    setQuestion(generateQuestion(config.minObjects, config.maxObjects));
    setSelected(null);
    setStatus('idle');
  }, [config.minObjects, config.maxObjects]);

  const handleAnswer = useCallback((answer: Answer) => {
    if (status !== 'idle') return;
    setSelected(answer);

    const correct = answer === question.correct;
    if (correct) {
      setStatus('correct');
      correctCount.current += 1;
      triggerConfetti('medium', { colors: ['#f97316', '#fb923c', '#fcd34d', '#34d399', '#60a5fa'] });
      const nextProgress = Math.min(progress + 25, 100);
      setProgress(nextProgress);
      setTimeout(() => {
        if (nextProgress >= 100) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({
              exerciseId,
              score: correctCount.current,
              maxScore: 4,
              stars: lives === 3 ? 3 : lives === 2 ? 2 : 1,
              timeSpent,
            });
          }
          navigate('/app/stage/fluisterbos');
        } else {
          generateNext();
        }
      }, 1800);
    } else {
      setStatus('incorrect');
      const nextLives = lives - 1;
      setLives(nextLives);
      setTimeout(() => {
        if (nextLives <= 0) {
          if (exerciseId) {
            const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
            completeExercise.mutate({
              exerciseId,
              score: correctCount.current,
              maxScore: 4,
              stars: 0,
              timeSpent,
            });
          }
          navigate('/app/stage/fluisterbos');
        } else {
          generateNext();
        }
      }, 1600);
    }
  }, [status, question.correct, progress, lives, navigate, generateNext, exerciseId, completeExercise]);

  // Determine highlight per side
  const leftHighlight = (() => {
    if (status === 'idle') return 'none' as const;
    if (question.correct === 'left') return selected === 'left' ? 'correct' as const : 'winner' as const;
    if (selected === 'left') return 'incorrect' as const;
    return 'none' as const;
  })();

  const rightHighlight = (() => {
    if (status === 'idle') return 'none' as const;
    if (question.correct === 'right') return selected === 'right' ? 'correct' as const : 'winner' as const;
    if (selected === 'right') return 'incorrect' as const;
    return 'none' as const;
  })();

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate('/app/stage/fluisterbos')}
    >
      <div className="flex-1 flex flex-col px-4 pt-5 gap-4 max-w-md mx-auto w-full overflow-y-auto min-h-0 relative z-10">

        {/* Instruction */}
        <p className="text-sm font-bold text-[#9d8bce] flex items-center gap-1.5 flex-shrink-0">
          <span className="text-lg">🌿</span>
          Welke kant heeft de meeste voorwerpen?
        </p>

        {/* Question card */}
        <div className="flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${question.left.emoji}-${question.leftCount}-${question.right.emoji}-${question.rightCount}`}
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -4 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.4 }}
              className={cn(
                'rounded-3xl border-2 shadow-md p-4 transition-colors duration-300',
                status === 'correct' ? 'bg-[#1c1134]/60 border-emerald-400/30' :
                status === 'incorrect' ? 'bg-[#1c1134]/60 border-red-400/30' :
                'bg-[#1c1134]/30 border-[#3b2d71]',
              )}
            >
              <div className="flex gap-3 items-stretch">
                <ObjectGrid obj={question.left} count={question.leftCount} highlight={leftHighlight} />

                {/* VS divider */}
                <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 px-1">
                  <div className="w-0.5 flex-1 bg-[#3b2d71] rounded-full" />
                  <span className="text-[11px] font-black text-[#5b4d8a] uppercase tracking-widest">vs</span>
                  <div className="w-0.5 flex-1 bg-[#3b2d71] rounded-full" />
                </div>

                <ObjectGrid obj={question.right} count={question.rightCount} highlight={rightHighlight} />
              </div>

              {/* Inline feedback */}
              <AnimatePresence>
                {status === 'correct' && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-center mt-3 text-sm font-bold text-emerald-400"
                  >
                    ✓ {question.correct === 'equal'
                      ? 'Goed! Ze hebben evenveel!'
                      : `Goed! ${question.correct === 'left' ? 'Links' : 'Rechts'} heeft meer!`}
                  </motion.p>
                )}
                {status === 'incorrect' && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-center mt-3 text-sm font-bold text-white/50"
                  >
                    Het juiste antwoord is:{' '}
                    <span className="text-red-400 font-black">
                      {question.correct === 'equal' ? 'Gelijk' : question.correct === 'left' ? 'Links heeft meer' : 'Rechts heeft meer'}
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Answer buttons */}
        <div className="flex-shrink-0">
          <p className="text-xs font-bold text-[#9d8bce] mb-2.5 text-center uppercase tracking-wider">
            Kies het juiste antwoord
          </p>
          <div className="grid grid-cols-3 gap-3">
            {BUTTONS.map(({ value, label, icon }) => {
              const isSelected = selected === value;
              const isCorrect = question.correct === value;
              return (
                <motion.button
                  key={value}
                  whileTap={{ scale: status === 'idle' ? 0.93 : 1 }}
                  onClick={() => handleAnswer(value)}
                  disabled={status !== 'idle'}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-3xl border-2 py-4 px-2 transition-all shadow-md',
                    status !== 'idle' && isSelected && isCorrect
                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg'
                      : status !== 'idle' && isSelected && !isCorrect
                        ? 'bg-red-400 border-red-500 text-white shadow-lg'
                        : status !== 'idle' && isCorrect
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                          : status !== 'idle'
                            ? 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71] cursor-not-allowed opacity-60'
                            : 'bg-[#2d1b54] border-[#4c3b82] text-amber-400 hover:border-amber-400 hover:bg-[#3b2d71] hover:shadow-lg cursor-pointer',
                  )}
                >
                  <span className="font-black text-xl leading-none">{icon}</span>
                  <span className="text-[11px] font-bold leading-tight text-center">{label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Feedback banners */}
        <AnimatePresence>
          {status === 'correct' && (
            <motion.div
              key="correct-banner"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex-shrink-0 flex items-center gap-2 bg-emerald-500/20 border-2 border-emerald-400/30 rounded-2xl px-4 py-3 shadow-sm"
            >
              <span className="text-xl">🎉</span>
              <p className="text-sm font-bold text-emerald-400">Super goed! Je kunt goed tellen!</p>
            </motion.div>
          )}
          {status === 'incorrect' && (
            <motion.div
              key="incorrect-banner"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex-shrink-0 flex items-center gap-2 bg-orange-500/20 border-2 border-orange-400/30 rounded-2xl px-4 py-3 shadow-sm"
            >
              <span className="text-xl">🌿</span>
              <p className="text-sm font-bold text-orange-300">Bijna! Tel de voorwerpen nog eens goed!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 h-2" />
      </div>
    </ExerciseShell>
  );
}
