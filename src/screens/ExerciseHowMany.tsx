import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { ExercisePrompt } from '@/components/exercise/ExerciseParts';
import { SpeakerButton } from '@/components/exercise/SpeakerButton';
import { CountGroup, MiniDots } from '@/components/exercise/CountGroup';
import { EXPLAIN } from '@/data/exerciseExplanations';
import { useTapRounds } from '@/hooks/useTapRounds';
import { howManyQuestionText, howManyRound, kleuterMax, type HowManyQuestion } from '@/lib/kleuterRekenen';

const isRight = (q: HowManyQuestion, n: number) => n === q.group.count;

/**
 * Hoeveel? (3de kleuterklas). Het kind telt een groepje (voorwerpen, een
 * dobbelsteen of een getalbeeld) en tikt het juiste cijfer. Onder elk cijfer
 * staan evenveel stipjes, zodat een kleuter het cijfer niet hoeft te kennen.
 */
export function ExerciseHowMany() {
  const { id } = useParams<{ id: string }>();
  const questions = useMemo(() => howManyRound(kleuterMax(id)), [id]);
  const game = useTapRounds({ questions, isRight, say: (q) => howManyQuestionText(q.group) });
  const { current, status, picked } = game;

  if (!current) return null;

  return (
    <ExerciseShell
      progress={game.progress}
      lives={game.lives}
      onClose={game.close}
      explain={[EXPLAIN.howMany]}
      silenceBuddy
    >
      <div className="flex-1 flex flex-col items-center z-10 relative px-6 w-full max-w-md mx-auto">
        <ExercisePrompt>{howManyQuestionText(current.group)}</ExercisePrompt>
        <SpeakerButton onPlay={game.sayQuestion} playing={game.speaking} label="Luister naar de vraag" className="mb-6" />

        <motion.div
          key={game.round}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, x: status === 'wrong' ? [-6, 6, -4, 4, 0] : 0 }}
          transition={{ duration: 0.35 }}
          className={cn(
            'w-full min-h-[14rem] mb-8 rounded-3xl border-2 flex items-center justify-center p-6',
            status === 'correct' ? 'bg-emerald-500/20 border-emerald-400/50' : 'bg-[#1c1134]/80 border-[#3b2d71]',
          )}
        >
          <CountGroup group={current.group} />
        </motion.div>

        <div className="grid grid-cols-3 gap-4 w-full">
          {current.choices.map((n, i) => {
            const isPicked = picked === n;
            return (
              <motion.button
                key={`${game.round}-${n}`}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => game.answer(n)}
                disabled={status !== 'idle'}
                aria-label={`${n}`}
                className={cn(
                  'py-4 rounded-3xl border-b-[8px] flex flex-col items-center justify-center gap-2 transition-all',
                  status === 'idle' && 'bg-amber-300 border-amber-500 text-amber-900 hover:bg-amber-200 active:border-b-0 active:translate-y-[8px]',
                  status === 'correct' && isPicked && 'bg-emerald-400 border-emerald-600 text-white',
                  status === 'wrong' && isPicked && 'bg-red-400 border-red-600 text-white',
                  status !== 'idle' && !isPicked && 'bg-amber-300/40 border-amber-500/40 text-amber-900 opacity-50',
                )}
              >
                <span className="text-5xl font-black leading-none">{n}</span>
                <MiniDots count={n} />
              </motion.button>
            );
          })}
        </div>
      </div>
    </ExerciseShell>
  );
}
