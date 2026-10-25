import React, { useMemo } from 'react';
import { Ear } from 'lucide-react';
import { PictureChoiceExercise } from '@/components/exercise/PictureChoice';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { blendRound, blendSay } from '@/data/kleuterTaal';

/**
 * Klanken plakken (3de kleuterklas). De Buddy zegt een woord in losse
 * klanken (v – i – s, met de opnames) en het kind tikt het prentje. Hier
 * noemt hij de prentjes niet: het kind plakt de klanken zelf aan elkaar.
 */
export function ExerciseBlend() {
  const questions = useMemo(() => blendRound(), []);
  return (
    <PictureChoiceExercise
      questions={questions}
      say={blendSay}
      prompt={() => 'Luister. Welk woord is dat?'}
      top={(q) => (
        <div className="flex items-center gap-2" aria-label={`${q.prompt!.sounds.length} klanken`}>
          <Ear className="w-12 h-12 text-violet-300" />
          {q.prompt!.sounds.map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-violet-400 shadow" />
          ))}
        </div>
      )}
      explain={[EXPLAIN.blend]}
    />
  );
}
