import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useSpeech, type SpeechLine } from '@/hooks/useSpeech';

/**
 * The Buddy's face in the exercise header. Tapped, the Buddy explains the
 * exercise out loud and then, where there is one, reads the question. Only
 * on a tap, never by itself. Tapping again, or tapping anything else on the
 * screen (an answer, the numpad), stops it; so does the next question.
 */
export function ExplainButton({ lines }: { lines: SpeechLine[] }) {
  const { buddy } = useGame();
  const { speakLines, stopSpeaking } = useSpeech();
  const [playing, setPlaying] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const run = useRef(0);

  const key = lines.map((line) => (typeof line === 'string' ? line : line.clip)).join('\n');
  const playingRef = useRef(false);
  playingRef.current = playing;

  // A new question (or leaving the exercise) cuts the explanation off.
  useEffect(() => () => {
    run.current += 1;
    if (playingRef.current) stopSpeaking();
    setPlaying(false);
  }, [key, stopSpeaking]);

  // The child starts answering: the Buddy stops talking.
  useEffect(() => {
    if (!playing) return;
    const onPointerDown = (e: PointerEvent) => {
      if (button.current?.contains(e.target as Node)) return;
      run.current += 1;
      stopSpeaking();
      setPlaying(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [playing, stopSpeaking]);

  const toggle = () => {
    const thisRun = ++run.current;
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    speakLines(lines).finally(() => {
      // Only the run that is still current may switch the ripple off.
      if (run.current === thisRun) setPlaying(false);
    });
  };

  return (
    <div className="relative flex-shrink-0">
      <AnimatePresence>
        {playing && (
          <motion.div
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="pointer-events-none absolute inset-0 rounded-full bg-amber-300"
          />
        )}
      </AnimatePresence>
      <button
        ref={button}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-label={playing ? `${buddy.name} stoppen` : `${buddy.name} legt uit`}
        aria-pressed={playing}
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-amber-300 border-b-[4px] border-amber-500 active:border-b-0 active:translate-y-1 transition-all shadow-lg overflow-hidden flex items-center justify-center"
      >
        <img src={buddy.art.happy} alt="" className="w-[115%] h-[115%] max-w-none object-contain translate-y-1" draggable={false} />
      </button>
    </div>
  );
}
