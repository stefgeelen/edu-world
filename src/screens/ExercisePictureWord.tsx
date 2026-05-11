import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { PICTURE_WORD_CONFIG, DEFAULT_PICTURE_WORD } from '@/data/difficultyConfig';
import { useSpeech } from '@/hooks/useSpeech';
import { generatePictureRound, type PictureItem } from '@/data/picturePool';
import type { BuddyMood } from '@/data/buddyMessages';

const TOTAL_ROUNDS = 5;

interface DragState {
  word: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
}

export function ExercisePictureWord() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { speak } = useSpeech();
  const { key: difficultyKey, stage } = useDifficultyLevel();

  const picCfg = PICTURE_WORD_CONFIG[difficultyKey] ?? DEFAULT_PICTURE_WORD;
  const optionCount = picCfg.optionCount;
  const mixed = false;

  const startTime = useRef(Date.now());
  const correctCount = useRef(0);

  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);
  const [question, setQuestion] = useState<{ correct: PictureItem; options: PictureItem[] } | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [wrongWord, setWrongWord] = useState<string | null>(null);
  const [matchedWords, setMatchedWords] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hovering, setHovering] = useState(false);
  const [buddyMood, setBuddyMood] = useState<BuddyMood | null>(null);
  const [stageNavigated, setStageNavigated] = useState(false);

  const dropZoneRef = useRef<HTMLDivElement>(null);

  const stageReturnPath = `/app/stage/fluisterbos/${stage}`;

  // Generate first question
  useEffect(() => {
    setQuestion(generatePictureRound(optionCount, mixed));
  }, [optionCount, mixed]);

  // Speak word when new question appears
  useEffect(() => {
    if (!question) return;
    const t = setTimeout(() => speak(question.correct.word), 400);
    return () => clearTimeout(t);
  }, [question, speak]);

  const handlePlayAudio = () => {
    if (!question) return;
    speak(question.correct.word);
  };

  const handlePointerDown = (e: React.PointerEvent, item: PictureItem) => {
    if (status !== 'idle' || matchedWords.has(item.word)) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = target.getBoundingClientRect();
    setDrag({
      word: item.word,
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left - rect.width / 2,
      offsetY: e.clientY - rect.top - rect.height / 2,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const x = e.clientX;
    const y = e.clientY;
    setDrag({ ...drag, x, y });
    const dz = dropZoneRef.current?.getBoundingClientRect();
    if (dz) {
      const inside = x >= dz.left && x <= dz.right && y >= dz.top && y <= dz.bottom;
      setHovering(inside);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drag || drag.pointerId !== e.pointerId || !question) return;
    const dz = dropZoneRef.current?.getBoundingClientRect();
    const droppedOnImage =
      dz && drag.x >= dz.left && drag.x <= dz.right && drag.y >= dz.top && drag.y <= dz.bottom;

    setHovering(false);

    if (droppedOnImage) {
      if (drag.word === question.correct.word) {
        handleCorrect();
      } else {
        handleWrong(drag.word);
      }
    }

    setDrag(null);
  };

  const handleCorrect = () => {
    setStatus('correct');
    setBuddyMood('correct');
    correctCount.current += 1;
    triggerConfetti('large', { colors: ['#10b981', '#f59e0b', '#a855f7'], originY: 0.5 });
    const newProgress = Math.round(((round + 1) / TOTAL_ROUNDS) * 100);
    setProgress(newProgress);

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        finishExercise();
      } else {
        setRound(nextRound);
        setQuestion(generatePictureRound(optionCount, mixed, question?.correct.word));
        setStatus('idle');
        setBuddyMood(null);
      }
    }, 1400);
  };

  const handleWrong = (word: string) => {
    setStatus('wrong');
    setWrongWord(word);
    setBuddyMood('wrong');
    setLives((l) => {
      const nl = l - 1;
      setTimeout(() => {
        if (nl <= 0) {
          finishExercise();
        } else {
          setStatus('idle');
          setWrongWord(null);
          setBuddyMood(null);
        }
      }, 1200);
      return nl;
    });
  };

  const finishExercise = () => {
    if (stageNavigated) return;
    setStageNavigated(true);
    if (exerciseId) {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      const stars = lives === 3 ? 3 : lives === 2 ? 2 : 1;
      completeExercise.mutate({
        exerciseId,
        score: correctCount.current,
        maxScore: TOTAL_ROUNDS,
        stars,
        timeSpent,
      });
    }
    setBuddyMood('complete');
    setTimeout(() => navigate(stageReturnPath), 800);
  };

  const dragItem = useMemo(
    () => question?.options.find((o) => o.word === drag?.word) ?? null,
    [question, drag],
  );

  if (!question) return null;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(stageReturnPath)}
      buddyMood={buddyMood}
      silenceBuddy
    >
      <div
        className="flex-1 flex flex-col items-center z-10 relative px-6 mt-6 md:mt-10 w-full max-w-md mx-auto pb-8"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Speaker prompt */}
        <button
          onClick={handlePlayAudio}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-[#2d1b54] text-white/90 rounded-full border-b-[4px] border-[#1c1134] active:border-b-0 active:translate-y-1 transition-all text-sm font-bold shadow-lg"
        >
          <Volume2 className="w-5 h-5 text-amber-300" />
          Sleep het juiste woord!
        </button>

        {/* Drop zone (picture) */}
        <motion.div
          ref={dropZoneRef}
          animate={{
            scale: status === 'correct' ? 1.05 : status === 'wrong' ? [1, 0.97, 1.02, 1] : hovering ? 1.03 : 1,
          }}
          transition={{ duration: status === 'wrong' ? 0.4 : 0.25 }}
          className={cn(
            'relative w-64 h-64 md:w-72 md:h-72 rounded-full overflow-hidden border-4 transition-all duration-300',
            'bg-[#1c1134] shadow-[0_15px_40px_rgba(0,0,0,0.4)]',
            status === 'idle' && !hovering && 'border-[#3b2d71]',
            status === 'idle' && hovering && 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)]',
            status === 'correct' && 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.7)]',
            status === 'wrong' && 'border-red-400 shadow-[0_0_50px_rgba(239,68,68,0.6)]',
          )}
        >
          <ImageWithFallback
            src={question.correct.imageUrl}
            alt={question.correct.word}
            className="w-full h-full object-cover pointer-events-none select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </motion.div>

        {/* Word cards */}
        <div className={cn('mt-8 grid gap-3 w-full', optionCount === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {question.options.map((opt, idx) => {
            const isDragging = drag?.word === opt.word;
            const isWrong = wrongWord === opt.word;
            const isMatched = matchedWords.has(opt.word);
            return (
              <motion.button
                key={opt.word + idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: isDragging ? 0.3 : 1,
                  y: 0,
                  x: isWrong ? [-6, 6, -4, 4, 0] : 0,
                }}
                transition={{ delay: idx * 0.08, x: { duration: 0.4 } }}
                onPointerDown={(e) => handlePointerDown(e, opt)}
                disabled={status !== 'idle' || isMatched}
                className={cn(
                  'relative py-4 px-2 rounded-2xl border-b-[6px] flex items-center justify-center touch-none select-none transition-colors',
                  !isWrong && 'bg-[#2d1b54] border-[#1c1134] shadow-[0_6px_15px_rgba(0,0,0,0.3)] active:translate-y-[2px]',
                  isWrong && 'bg-red-400 border-red-600 shadow-[0_6px_25px_rgba(239,68,68,0.5)]',
                )}
                style={{ cursor: status === 'idle' ? 'grab' : 'default' }}
              >
                <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent rounded-t-2xl pointer-events-none" />
                <span className="text-xl md:text-2xl font-black text-white drop-shadow-md lowercase tracking-wide">
                  {opt.word}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Floating drag preview */}
        <AnimatePresence>
          {drag && dragItem && (
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                position: 'fixed',
                left: drag.x - drag.offsetX,
                top: drag.y - drag.offsetY,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 50,
              }}
              className="px-5 py-3 rounded-2xl bg-amber-400 border-b-[6px] border-amber-600 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
            >
              <span className="text-2xl font-black text-white drop-shadow-md lowercase tracking-wide">
                {dragItem.word}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ExerciseShell>
  );
}
