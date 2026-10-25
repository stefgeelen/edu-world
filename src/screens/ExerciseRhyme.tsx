import React, { useMemo } from 'react';
import { PictureChoiceExercise, Picture } from '@/components/exercise/PictureChoice';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { rhymeRound, rhymeSay } from '@/data/kleuterTaal';

/**
 * Rijmen (3de kleuterklas). De Buddy toont en zegt een woord ("huis") en
 * noemt drie prentjes. Het kind tikt het prentje dat rijmt ("muis").
 */
export function ExerciseRhyme() {
  const questions = useMemo(() => rhymeRound(), []);
  return (
    <PictureChoiceExercise
      questions={questions}
      say={rhymeSay}
      prompt={(q) => `Wat rijmt op ${q.prompt!.word}?`}
      top={(q) => (
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg ring-4 ring-violet-200/20">
          <Picture word={q.prompt!} className="text-7xl" />
        </div>
      )}
      explain={[EXPLAIN.rhyme]}
    />
  );
}
