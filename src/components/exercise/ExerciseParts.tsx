import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * The shared pieces of the maths exercises, so they all look alike:
 * one task line under the header, and one check bar at the bottom.
 */

/** The task, in one plain sentence, centred right under the header. No emoji: it is not read aloud. */
export function ExercisePrompt({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        'mt-6 mb-5 px-2 text-center text-xl font-black leading-snug tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] md:mt-8 md:text-2xl',
        className
      )}
    >
      {children}
    </h2>
  );
}

/** The bar at the bottom of the screen that holds Wis and Controleer. Render it as the last child of ExerciseShell. */
export function ExerciseActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex-shrink-0 border-t-2 border-[#3b2d71] bg-[#1a103c]/90 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-md items-center gap-3">{children}</div>
    </div>
  );
}

/** The green check button. "Controleer" unless the action has its own word, like "Betaal". */
export function CheckButton({
  onClick,
  disabled,
  children = 'Controleer',
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
  /** For screen readers when the screen has a second Controleer, e.g. in a drawing sheet. */
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-black shadow-md transition-all',
        disabled
          ? 'cursor-not-allowed border border-[#3b2d71] bg-[#1c1134] text-[#3b2d71]'
          : 'border border-emerald-700 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
      )}
    >
      <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
      {children}
    </motion.button>
  );
}

/** Start over: clears what the child has put down so far. Always called "Wis". */
export function ClearButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-base font-black transition-all',
        disabled
          ? 'cursor-not-allowed border-[#3b2d71] bg-[#1c1134] text-[#3b2d71]'
          : 'border-[#4c3b82] bg-[#2d1b54] text-white/80 hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-300 active:scale-95'
      )}
    >
      <RotateCcw className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      Wis
    </button>
  );
}
