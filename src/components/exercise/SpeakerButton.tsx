import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The one speaker of the reading exercises: a big orange button that reads the
 * word or sentence (again). It ripples while it speaks — while `playing`, or
 * while the promise returned by `onPlay` (e.g. `speak(...)`) is running.
 */
export function SpeakerButton({
  onPlay,
  playing = false,
  label = 'Luister nog eens',
  className,
}: {
  onPlay: () => unknown;
  /** Set by screens that also speak on their own, e.g. when a question appears. */
  playing?: boolean;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const active = playing || busy;

  const play = () => {
    const result = onPlay();
    if (result instanceof Promise) {
      setBusy(true);
      result.finally(() => mounted.current && setBusy(false));
    }
  };

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="pointer-events-none absolute inset-0 rounded-full bg-orange-400"
          />
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={play}
        animate={{ scale: active ? 0.95 : 1 }}
        aria-label={label}
        className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-b-[8px] border-orange-700 bg-orange-500 shadow-[0_12px_30px_rgba(249,115,22,0.45)] transition-all active:translate-y-[8px] active:border-b-0 md:h-28 md:w-28"
      >
        <div className="pointer-events-none absolute inset-0 h-1/2 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
        <Volume2 className={cn('h-12 w-12 text-white drop-shadow-md md:h-14 md:w-14', active && 'animate-pulse')} strokeWidth={2.5} aria-hidden />
      </motion.button>
    </div>
  );
}
