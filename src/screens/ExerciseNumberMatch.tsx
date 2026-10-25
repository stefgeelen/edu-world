import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { SpeakerButton } from '@/components/exercise/SpeakerButton';
import { CountGroup } from '@/components/exercise/CountGroup';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { useTapRounds } from '@/hooks/useTapRounds';
import { kleuterMax, numberMatchQuestionText, numberMatchRound, type NumberMatchQuestion } from '@/lib/kleuterRekenen';

const isRight = (q: NumberMatchQuestion, count: number) => count === q.number;

/**
 * Cijfer bij aantal (3de kleuterklas). De Buddy toont een cijfer en zegt het;
 * het kind tikt het groepje met zoveel. De omgekeerde richting van Hoeveel?.
 */
export function ExerciseNumberMatch() {
  const { id } = useParams<{ id: string }>();
  const questions = useMemo(() => numberMatchRound(kleuterMax(id)), [id]);
  const game = useTapRounds({ questions, isRight, say: numberMatchQuestionText });
  const { current, status, picked } = game;

  if (!current) return null;

  return (
    <ExerciseShell
      progress={game.progress}
      lives={game.lives}
      onClose={game.close}
      explain={[EXPLAIN.numberMatch]}
      silenceBuddy
    >
      <div className="flex-1 flex flex-col items-center z-10 relative px-4 w-full max-w-md mx-auto">
        <ExercisePrompt>{numberMatchQuestionText(current)}</ExercisePrompt>
        <SpeakerButton onPlay={game.sayQuestion} playing={game.speaking} label="Luister naar de vraag" className="mb-6" />

        <motion.div
          key={game.round}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="w-24 h-24 mb-5 rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg ring-4 ring-teal-200/20"
        >
          <span className="font-black text-white drop-shadow-md text-6xl leading-none">{current.number}</span>
        </motion.div>

        {/* Onder elkaar, zodat de voorwerpen groot genoeg zijn om te tellen. */}
        <div className="flex flex-col gap-3 w-full">
          {current.groups.map((group, i) => {
            const isPicked = picked === group.count;
            return (
              <motion.button
                key={`${game.round}-${group.count}`}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, x: status === 'wrong' && isPicked ? [-6, 6, -4, 4, 0] : 0 }}
                transition={{ delay: status === 'idle' ? i * 0.08 : 0 }}
                onClick={() => game.answer(group.count)}
                disabled={status !== 'idle'}
                aria-label={`Groepje ${i + 1}`}
                className={cn(
                  'min-h-[5.5rem] rounded-3xl border-2 border-b-[8px] flex items-center justify-center p-2 transition-all',
                  status === 'idle' && 'bg-[#2d1b54] border-[#4c3b82] hover:border-amber-400 active:border-b-2 active:translate-y-[6px]',
                  status === 'correct' && isPicked && 'bg-emerald-500/30 border-emerald-400',
                  status === 'wrong' && isPicked && 'bg-red-500/30 border-red-400',
                  status !== 'idle' && !isPicked && 'bg-[#2d1b54]/50 border-[#3b2d71] opacity-50',
                )}
              >
                <CountGroup group={group} size="md" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
