import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { ExerciseShell } from '@/components/exercise/ExerciseShell';
import { useExerciseId } from '@/hooks/useExerciseId';
import { useCompleteExercise } from '@/hooks/useCompleteExercise';
import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';
import { useSpeech } from '@/hooks/useSpeech';
import { SOUND_HOUSE_CONFIG, DEFAULT_SOUND_HOUSE } from '@/data/difficultyConfig';
import { generateSoundHouseRound, type SoundPosition, type SoundWord } from '@/data/soundHousePool';
import type { BuddyMood } from '@/data/buddyMessages';

const TOTAL_ROUNDS = 5;

const POSITION_LABEL: Record<SoundPosition, string> = {
  begin: 'Begin',
  middle: 'Midden',
  end: 'Einde',
};

/**
 * Klankhuis — auditieve oefening (Vlaamse Kern-aanpak).
 * Kind hoort een woord en duidt aan in welk raam (begin/midden/einde) het de doelklank hoort.
 */
export function ExerciseSoundHouse() {
  const navigate = useNavigate();
  const exerciseId = useExerciseId();
  const completeExercise = useCompleteExercise();
  const { speak } = useSpeech();
  const { stage, key } = useDifficultyLevel();
  const cfg = SOUND_HOUSE_CONFIG[key] ?? DEFAULT_SOUND_HOUSE;

  const startTime = useRef(Date.now());
  const correctCount = useRef(0);

  const [questions, setQuestions] = useState<SoundWord[]>([]);
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<SoundPosition | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [buddyMood, setBuddyMood] = useState<BuddyMood | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stageReturnPath = `/app/stage/fluisterbos/${stage}`;
  const current = questions[round];

  // Init round
  useEffect(() => {
    setQuestions(generateSoundHouseRound(cfg.poolStage, TOTAL_ROUNDS));
  }, [cfg.poolStage]);

  // Speak the word automatically when a new question appears
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      setIsPlaying(true);
      speak(current.word).finally(() => setIsPlaying(false));
    }, 450);
    return () => clearTimeout(t);
  }, [current, speak]);

  const playWord = useCallback(() => {
    if (!current) return;
    setIsPlaying(true);
    speak(current.word).finally(() => setIsPlaying(false));
  }, [current, speak]);

  const playSound = useCallback(() => {
    if (!current) return;
    speak(current.spoken);
  }, [current, speak]);

  const finish = useCallback(() => {
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
    navigate(stageReturnPath);
  }, [exerciseId, lives, completeExercise, navigate, stageReturnPath]);

  const handleSelect = (pos: SoundPosition) => {
    if (!current || status !== 'idle') return;
    setSelected(pos);

    if (pos === current.position) {
      setStatus('correct');
      setBuddyMood('correct');
      correctCount.current += 1;
      const next = progress + 100 / TOTAL_ROUNDS;
      setProgress(next);
      triggerConfetti('medium', { colors: ['#10b981', '#f59e0b', '#a855f7'] });

      setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) {
          finish();
        } else {
          setRound((r) => r + 1);
          setSelected(null);
          setStatus('idle');
          setBuddyMood(null);
        }
      }, 1500);
    } else {
      setStatus('wrong');
      setBuddyMood('wrong');
      const nextLives = lives - 1;
      setLives(nextLives);

      // Speel het woord opnieuw zodat het kind opnieuw kan luisteren.
      setTimeout(() => speak(current.word), 700);

      setTimeout(() => {
        if (nextLives <= 0) {
          finish();
        } else {
          setSelected(null);
          setStatus('idle');
          setBuddyMood(null);
        }
      }, 1800);
    }
  };

  if (!current) return null;

  return (
    <ExerciseShell
      progress={progress}
      lives={lives}
      onClose={() => navigate(stageReturnPath)}
      buddyMood={buddyMood}
      silenceBuddy
    >
      <div className="flex-1 flex flex-col items-center z-10 relative px-6 mt-6 md:mt-10 w-full max-w-md mx-auto">
        {/* Speaker + sound bubble */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <AnimatePresence>
              {isPlaying && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.7 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="absolute inset-0 bg-orange-400 rounded-full pointer-events-none"
                />
              )}
            </AnimatePresence>
            <motion.button
              onClick={playWord}
              animate={{ scale: isPlaying ? 0.95 : 1 }}
              className="relative w-24 h-24 md:w-28 md:h-28 bg-orange-500 rounded-full flex items-center justify-center border-b-[8px] border-orange-700 shadow-[0_12px_30px_rgba(249,115,22,0.45)] active:border-b-0 active:translate-y-[8px] transition-all"
              aria-label="Speel het woord"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2 pointer-events-none" />
              <Volume2 className={cn('w-12 h-12 md:w-14 md:h-14 text-white drop-shadow-md', isPlaying && 'animate-pulse')} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Doelklank-bubbel */}
          <button
            onClick={playSound}
            className="relative w-20 h-20 md:w-24 md:h-24 bg-amber-300 rounded-3xl border-b-[6px] border-amber-500 shadow-[0_8px_22px_rgba(251,191,36,0.45)] active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center"
            aria-label="Speel de klank"
          >
            <span className="text-4xl md:text-5xl font-black text-amber-900 lowercase">{current.sound}</span>
          </button>
        </div>

        <p className="text-white/90 text-lg md:text-xl font-bold text-center mb-6">
          Waar hoor je de <span className="text-amber-300">‘{current.sound}’</span>?
        </p>

        {/* Het Klankhuis */}
        <div className="relative w-full max-w-sm mb-4">
          {/* Dak */}
          <div className="relative h-16 md:h-20">
            <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
              <polygon points="0,60 100,0 200,60" fill="#7c2d12" />
              <polygon points="0,60 100,8 200,60" fill="#9a3412" />
            </svg>
          </div>

          {/* Romp met 3 ramen */}
          <div className="relative bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] rounded-b-3xl border-b-[10px] border-[#b45309] shadow-[0_15px_40px_rgba(0,0,0,0.4)] p-4 md:p-5">
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {(['begin', 'middle', 'end'] as SoundPosition[]).map((pos, i) => {
                const isSelected = selected === pos;
                const isRight = isSelected && status === 'correct';
                const isWrong = isSelected && status === 'wrong';

                return (
                  <motion.button
                    key={pos}
                    onClick={() => handleSelect(pos)}
                    disabled={status !== 'idle'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      x: isWrong ? [-4, 4, -3, 3, 0] : 0,
                    }}
                    transition={{ delay: i * 0.08, x: { duration: 0.45 } }}
                    className={cn(
                      'relative aspect-square rounded-2xl border-b-[6px] flex flex-col items-center justify-center transition-all overflow-hidden',
                      !isSelected && status === 'idle' && 'bg-[#1e3a8a] border-[#172554] hover:bg-[#1e40af] active:translate-y-[6px] active:border-b-0',
                      isRight && 'bg-emerald-400 border-emerald-700 shadow-[0_0_25px_rgba(16,185,129,0.85)] scale-105 z-10',
                      isWrong && 'bg-red-400 border-red-700 shadow-[0_0_25px_rgba(239,68,68,0.85)] z-10',
                      !isSelected && status !== 'idle' && 'bg-[#1e3a8a]/40 border-[#172554]/30 opacity-50',
                    )}
                  >
                    {/* Vensterkruis */}
                    <div className="absolute inset-3 border-2 border-white/30 rounded-md pointer-events-none" />
                    <div className="absolute inset-y-3 left-1/2 w-[2px] bg-white/30 -translate-x-1/2 pointer-events-none" />
                    <div className="absolute inset-x-3 top-1/2 h-[2px] bg-white/30 -translate-y-1/2 pointer-events-none" />

                    <span className="relative text-3xl md:text-4xl font-black text-white drop-shadow-lg">
                      {i + 1}
                    </span>
                    <span className="relative text-[11px] md:text-xs font-bold text-white/90 mt-1 uppercase tracking-wider">
                      {POSITION_LABEL[pos]}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Deur */}
            <div className="mx-auto mt-4 w-12 h-14 md:w-14 md:h-16 bg-[#7c2d12] rounded-t-xl border-2 border-[#451a03] relative">
              <div className="absolute right-1.5 top-1/2 w-1.5 h-1.5 bg-amber-300 rounded-full" />
            </div>
          </div>
        </div>

        {/* Woord-hint (alleen na fout, om te helpen lezen) */}
        <AnimatePresence>
          {status === 'wrong' && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-white/80 text-sm font-bold lowercase tracking-wider"
            >
              luister nog eens: {current.display}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </ExerciseShell>
  );
}
