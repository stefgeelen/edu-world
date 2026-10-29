import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { SpeakerButton } from '@/components/exercise/SpeakerButton';
import { useTapRounds } from '@/hooks/useTapRounds';
import type { SpeechLine } from '@/hooks/useSpeech';
import type { PictureQuestion, PictureWord } from '@/data/kleuterTaal';

const isRight = (q: PictureQuestion, word: string) => word === q.answer.word;

/** Een groot prentje (emoji). */
export function Picture({ word, className }: { word: PictureWord; className?: string }) {
  return (
    <span role="img" aria-label={word.word} className={cn('leading-none select-none', className)}>
      {word.emoji}
    </span>
  );
}

/**
 * De taaloefeningen van de 3de kleuterklas: de Buddy zegt de vraag (vanzelf),
 * het kind tikt een van drie prentjes. `top` is wat boven de prentjes staat:
 * het woord om op te rijmen, de klank, of een oor bij Klanken plakken.
 */
export function PictureChoiceExercise({ questions, say, prompt, top, explain }: {
  questions: PictureQuestion[];
  say: (q: PictureQuestion) => SpeechLine[];
  /** De vraag op het scherm, voor wie meekijkt. */
  prompt: (q: PictureQuestion) => string;
  top: (q: PictureQuestion) => React.ReactNode;
  explain: SpeechLine[];
}) {
  const game = useTapRounds({ questions, isRight, say });
  const { current, status, picked } = game;

  if (!current) return null;

  return (
    <ExerciseShell progress={game.progress} lives={game.lives} onClose={game.close} explain={explain} silenceBuddy>
      <div className="flex-1 flex flex-col items-center z-10 relative px-4 w-full max-w-md md:max-w-xl mx-auto">
        <ExercisePrompt>{prompt(current)}</ExercisePrompt>
        <SpeakerButton onPlay={game.sayQuestion} playing={game.speaking} label="Luister naar de vraag" className="mb-5" />

        <motion.div
          key={game.round}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="mb-6 flex items-center justify-center min-h-[7rem]"
        >
          {top(current)}
        </motion.div>

        <div className="grid grid-cols-3 gap-3 md:gap-5 w-full short:max-w-md">
          {current.choices.map((choice, i) => {
            const isPicked = picked === choice.word;
            return (
              <motion.button
                key={`${game.round}-${choice.word}`}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, x: status === 'wrong' && isPicked ? [-6, 6, -4, 4, 0] : 0 }}
                transition={{ delay: status === 'idle' ? i * 0.08 : 0 }}
                onClick={() => game.answer(choice.word)}
                disabled={status !== 'idle'}
                aria-label={choice.word}
                className={cn(
                  'aspect-square rounded-3xl border-2 border-b-[8px] flex items-center justify-center transition-all',
                  status === 'idle' && 'bg-[#2d1b54] border-[#4c3b82] hover:border-amber-400 active:border-b-2 active:translate-y-[6px]',
                  status === 'correct' && isPicked && 'bg-emerald-500/30 border-emerald-400',
                  status === 'wrong' && isPicked && 'bg-red-500/30 border-red-400',
                  status !== 'idle' && !isPicked && 'bg-[#2d1b54]/50 border-[#3b2d71] opacity-50',
                )}
              >
                <span aria-hidden className="text-6xl md:text-8xl short:text-6xl leading-none select-none">{choice.emoji}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
