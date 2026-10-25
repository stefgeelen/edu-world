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
import { kleuterMax, moreLessQuestionText, moreLessRound, type MoreLessQuestion, type Side } from '@/lib/kleuterRekenen';

const isRight = (q: MoreLessQuestion, side: Side) => side === q.answer;

const Stack = () => (
  <div className="flex flex-col gap-1">
    {[0, 1, 2].map((i) => <div key={i} className="w-8 h-3 rounded-full bg-amber-300" />)}
  </div>
);

/**
 * Meer of minder (3de kleuterklas). Twee groepjes naast elkaar. De Buddy
 * vraagt waar er meer (of minder) zijn; het kind tikt op dat groepje, of op
 * de knop met twee gelijke stapeltjes als ze evenveel zijn.
 */
export function ExerciseMoreLess() {
  const { id } = useParams<{ id: string }>();
  const questions = useMemo(() => moreLessRound(kleuterMax(id)), [id]);
  const game = useTapRounds({ questions, isRight, say: moreLessQuestionText });
  const { current, status, picked } = game;

  if (!current) return null;

  const sideClass = (side: Side) => {
    const isPicked = picked === side;
    return cn(
      'rounded-3xl border-2 border-b-[8px] flex items-center justify-center p-3 transition-all',
      status === 'idle' && 'bg-[#2d1b54] border-[#4c3b82] hover:border-amber-400 active:border-b-2 active:translate-y-[6px]',
      status === 'correct' && isPicked && 'bg-emerald-500/30 border-emerald-400',
      status === 'wrong' && isPicked && 'bg-red-500/30 border-red-400',
      status !== 'idle' && !isPicked && 'bg-[#2d1b54]/50 border-[#3b2d71] opacity-50',
    );
  };

  return (
    <ExerciseShell
      progress={game.progress}
      lives={game.lives}
      onClose={game.close}
      explain={[EXPLAIN.moreLess]}
      silenceBuddy
    >
      <div className="flex-1 flex flex-col items-center z-10 relative px-4 w-full max-w-md mx-auto">
        <ExercisePrompt>{moreLessQuestionText(current)}</ExercisePrompt>
        <SpeakerButton onPlay={game.sayQuestion} playing={game.speaking} label="Luister naar de vraag" className="mb-6" />

        <motion.div
          key={game.round}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 w-full mb-6"
        >
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => game.answer(side)}
              disabled={status !== 'idle'}
              aria-label={side === 'left' ? 'Links' : 'Rechts'}
              className={cn(sideClass(side), 'min-h-[13rem]')}
            >
              <CountGroup group={side === 'left' ? current.left : current.right} size="md" />
            </button>
          ))}
        </motion.div>

        {/* Evenveel: twee gelijke stapeltjes */}
        <button
          type="button"
          onClick={() => game.answer('equal')}
          disabled={status !== 'idle'}
          aria-label="Evenveel"
          className={cn(sideClass('equal'), 'gap-3 px-8 py-4')}
        >
          <Stack />
          <span className="text-3xl font-black text-amber-300 leading-none">=</span>
          <Stack />
        </button>
      </div>
    </ExerciseShell>
  );
}
