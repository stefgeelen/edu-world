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

/** Drie bolletjes: links en rechts van het =-teken op de knop Evenveel. */
const Three = () => (
  <div className="flex gap-1.5">
    {[0, 1, 2].map((i) => <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow" />)}
  </div>
);

/** Prentjes zo groot als past in een vak van een half scherm breed: beide kanten even groot. */
function thingSize(most: number) {
  if (most <= 3) return 'text-[40px] sm:text-5xl';
  return 'text-[26px] sm:text-[34px]';
}

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

  const things = thingSize(Math.max(current.left.count, current.right.count));

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
          className="grid grid-cols-2 gap-2 sm:gap-3 w-full mb-6"
        >
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => game.answer(side)}
              disabled={status !== 'idle'}
              aria-label={side === 'left' ? 'Links' : 'Rechts'}
              className={cn(sideClass(side), 'min-h-[13rem] p-2 sm:p-3')}
            >
              <CountGroup group={side === 'left' ? current.left : current.right} size="md" thingClassName={things} />
            </button>
          ))}
        </motion.div>

        {/* Evenveel: evenveel bolletjes aan beide kanten van = */}
        <button
          type="button"
          onClick={() => game.answer('equal')}
          disabled={status !== 'idle'}
          aria-label="Evenveel"
          className={cn(sideClass('equal'), 'gap-3 px-8 py-4')}
        >
          <Three />
          <span className="text-3xl font-black text-amber-300 leading-none">=</span>
          <Three />
        </button>
      </div>
    </ExerciseShell>
  );
}
