import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { SpeakerButton } from '@/components/exercise/SpeakerButton';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { READING_THEME_COUNT, wordMakerRound } from '@/data/readingThemes';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useReadingTheme } from '@/hooks/useReadingTheme';
import { useSpeech } from '@/hooks/useSpeech';
import { exerciseExitPath } from '@/routes/paths';

const TOTAL_ROUNDS = 5;

/**
 * Woordenmaker (1ste leerjaar). Het kind hoort een woord en ziet het stukje
 * dat er al staat ("ip"). Welke letter moet ervoor? Zo leren de kinderen in
 * de klas lezen: een gekend stukje en een letter ervoor (k + ip = kip).
 * Gebruikt alleen letters van het leesthema van het kind.
 */
export function ExerciseWordMaker() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { speak } = useSpeech();
  const theme = useReadingTheme();

  const startTime = useRef(Date.now());
  const correctCount = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const questions = useMemo(
    () => (theme === undefined ? [] : wordMakerRound(theme ?? READING_THEME_COUNT, TOTAL_ROUNDS)),
    [theme],
  );
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(3);
  const [picked, setPicked] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);

  const current = questions[round];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const playWord = useCallback(() => {
    if (!current) return;
    setIsPlaying(true);
    speak(current.item.word).finally(() => setIsPlaying(false));
  }, [current, speak]);

  // Say the word when a new question appears.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(playWord, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const finish = () => {
    if (exerciseId) {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      const stars = lives === 3 ? 3 : lives === 2 ? 2 : 1;
      completeExercise.mutate({ exerciseId, score: correctCount.current, maxScore: TOTAL_ROUNDS, stars, timeSpent });
    }
    navigate(exerciseExitPath());
  };

  const handlePick = (onset: string) => {
    if (!current || status !== 'idle') return;
    setPicked(onset);

    if (onset === current.item.onset) {
      setStatus('correct');
      correctCount.current += 1;
      triggerConfetti('large', { colors: ['#10b981', '#f59e0b', '#a855f7'], originY: 0.6 });
      later(() => {
        if (round + 1 >= questions.length) {
          finish();
        } else {
          setRound((r) => r + 1);
          setPicked(null);
          setStatus('idle');
        }
      }, 1800);
    } else {
      setStatus('wrong');
      const nextLives = lives - 1;
      setLives(nextLives);
      later(() => {
        if (nextLives <= 0) {
          // Game over pays nothing: ExerciseShell saves it for the parent portal.
          navigate(exerciseExitPath());
        } else {
          setPicked(null);
          setStatus('idle');
        }
      }, 1500);
    }
  };

  if (!current) return null;

  const progress = Math.round(((round + (status === 'correct' ? 1 : 0)) / questions.length) * 100);

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(exerciseExitPath())}
      explain={[EXPLAIN.wordMaker]}
      silenceBuddy
    >
      <div className="flex-1 flex flex-col items-center z-10 relative px-6 w-full max-w-md mx-auto">
        <ExercisePrompt>Welke letter moet ervoor?</ExercisePrompt>

        <SpeakerButton onPlay={playWord} playing={isPlaying} label="Luister naar het woord" className="mb-8" />

        {/* The word: an empty spot (or the chosen beginning) and the part that is already there */}
        <div className="flex items-stretch justify-center gap-2 mb-10" aria-live="polite">
          <motion.div
            key={`${round}-${picked ?? ''}`}
            initial={{ scale: picked ? 0.8 : 1 }}
            animate={{ scale: 1, x: status === 'wrong' ? [-6, 6, -4, 4, 0] : 0 }}
            transition={{ duration: 0.35 }}
            className={cn(
              'min-w-[5rem] px-4 py-4 rounded-3xl border-b-[8px] flex items-center justify-center',
              status === 'idle' && 'bg-[#1c1134] border-[#120a24] border-dashed border-2',
              status === 'correct' && 'bg-emerald-400 border-emerald-600',
              status === 'wrong' && 'bg-red-400 border-red-600',
            )}
          >
            <span className="text-5xl font-black text-white lowercase tracking-wide">
              {picked ?? '?'}
            </span>
          </motion.div>
          <div className="px-4 py-4 rounded-3xl bg-[#2d1b54] border-b-[8px] border-[#1c1134] flex items-center justify-center">
            <span className="text-5xl font-black text-white lowercase tracking-wide">{current.item.rest}</span>
          </div>
        </div>

        {/* The beginnings to choose from */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {current.choices.map((onset, i) => {
            const isPicked = picked === onset;
            return (
              <motion.button
                key={`${round}-${onset}`}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => handlePick(onset)}
                disabled={status !== 'idle'}
                aria-label={`Letter ${onset}`}
                className={cn(
                  'py-5 rounded-3xl border-b-[8px] flex items-center justify-center transition-all',
                  status === 'idle' && 'bg-amber-300 border-amber-500 hover:bg-amber-200 active:border-b-0 active:translate-y-[8px]',
                  status !== 'idle' && !isPicked && 'bg-amber-300/40 border-amber-500/40 opacity-50',
                  status !== 'idle' && isPicked && 'opacity-0',
                )}
              >
                <span className="text-4xl font-black text-amber-900 lowercase">{onset}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
