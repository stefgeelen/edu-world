import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/*
 * The in-between screen some exercises open with: before the first question
 * the child picks what to practise (e.g. halves, doubles or both). Shown
 * inside ExerciseShell, under an ExercisePrompt such as "Wat wil je oefenen?".
 */

export interface ExerciseMode<V extends string> {
  value: V;
  title: string;
  /** A small example under the title, e.g. "8 → 4". */
  example?: ReactNode;
}

const COLORS = [
  'from-sky-500 to-blue-600 border-blue-800',
  'from-amber-400 to-orange-500 border-orange-700',
  'from-violet-500 to-fuchsia-600 border-violet-800',
  'from-teal-500 to-emerald-600 border-emerald-800',
  'from-pink-500 to-rose-600 border-rose-800',
];

export function ExerciseModePicker<V extends string>({ modes, onPick }: {
  modes: ExerciseMode<V>[];
  onPick: (value: V) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
      {modes.map((mode, i) => (
        <motion.button
          key={mode.value}
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => onPick(mode.value)}
          className={`relative h-24 sm:h-36 md:h-40 rounded-3xl bg-gradient-to-br ${COLORS[i % COLORS.length]} border-b-[6px] shadow-lg text-white flex flex-col items-center justify-center gap-1 px-3`}
        >
          <div className="absolute inset-x-0 top-0 h-1/3 bg-white/15 rounded-t-3xl pointer-events-none" />
          <span className="text-2xl md:text-3xl font-black drop-shadow-sm">{mode.title}</span>
          {mode.example && <span className="text-base md:text-lg font-bold text-white/80">{mode.example}</span>}
        </motion.button>
      ))}
    </div>
  );
}
