import React, { useMemo } from 'react';
import { PictureChoiceExercise } from '@/components/exercise/PictureChoice';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { firstSoundRound, firstSoundSay } from '@/data/kleuterTaal';

/**
 * Beginklank (3de kleuterklas). De Buddy zegt een klank (een opname: "mmm",
 * niet "em") en noemt drie prentjes. Het kind tikt het prentje dat met die
 * klank begint. De letter staat erbij, maar het kind hoeft ze niet te kennen.
 */
export function ExerciseFirstSound() {
  const questions = useMemo(() => firstSoundRound(), []);
  return (
    <PictureChoiceExercise
      questions={questions}
      say={firstSoundSay}
      prompt={() => 'Welke prent begint met deze klank?'}
      top={(q) => (
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg ring-4 ring-violet-200/20">
          <span className="text-7xl font-black text-white lowercase leading-none">{q.sound}</span>
        </div>
      )}
      explain={[EXPLAIN.firstSound]}
    />
  );
}
