import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, HeartCrack } from 'lucide-react';
import { BuddyBubble } from '@/components/BuddyBubble';
import { useBuddyMessage } from '@/hooks/useBuddyMessage';
import type { BuddyMood } from '@/data/buddyMessages';

interface ExerciseShellProps {
  children: React.ReactNode;
  progress: number;
  lives: number;
  onClose: () => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  /** Set to trigger buddy feedback (correct/wrong/complete). Resets on change. */
  buddyMood?: BuddyMood | null;
  /** Disable TTS for the buddy bubble (e.g. in reading exercises that already speak). */
  silenceBuddy?: boolean;
}

/**
 * Shared exercise layout: dark space-themed background with stars,
 * unified header (close button + progress bar + lives), and buddy integration.
 */
export function ExerciseShell({ children, progress, lives, onClose, onClick, className = '', buddyMood, silenceBuddy = false }: ExerciseShellProps) {
  const { getMessage } = useBuddyMessage();
  const [buddyData, setBuddyData] = useState<{ message: string; mood: BuddyMood; avatarUrl: string; avatarName: string } | null>(null);

  // Show buddy on mood change
  useEffect(() => {
    if (!buddyMood) {
      setBuddyData(null);
      return;
    }
    const situationMap: Record<BuddyMood, 'correct_answer' | 'wrong_answer' | 'exercise_complete' | 'exercise_start' | 'dashboard_greeting'> = {
      correct: 'correct_answer',
      wrong: 'wrong_answer',
      complete: 'exercise_complete',
      greeting: 'exercise_start',
      idle: 'exercise_start',
    };
    const result = getMessage(situationMap[buddyMood]);
    if (result) {
      setBuddyData({ message: result.message, mood: result.mood, avatarUrl: result.avatarUrl!, avatarName: result.avatarName });
    }
  }, [buddyMood, getMessage]);

  return (
    <div
      className={`h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] flex flex-col relative overflow-hidden font-sans ${className}`}
      onClick={onClick}
    >
      {/* Background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animation: `pulse ${Math.random() * 2 + 2}s infinite ${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="pt-8 md:pt-12 px-6 flex items-center gap-4 z-10 w-full max-w-2xl mx-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-12 h-12 bg-[#2d1b54] rounded-full flex items-center justify-center border-b-[4px] border-[#1c1134] active:border-b-0 active:translate-y-1 transition-all flex-shrink-0 shadow-lg"
        >
          <X className="w-6 h-6 text-[#9d8bce]" />
        </button>

        <div className="flex-1 h-6 md:h-8 bg-[#1c1134]/50 backdrop-blur-sm rounded-full overflow-hidden relative border-2 border-[#3b2d71] shadow-inner">
          <motion.div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-400 to-emerald-500"
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[40%] bg-white/30 rounded-t-full" />
          </motion.div>
        </div>

        <div className="flex gap-1 md:gap-2">
          {[...Array(3)].map((_, i) => (
            i < lives ?
              <Heart key={i} className="w-6 h-6 md:w-8 md:h-8 text-red-500 fill-red-500 animate-pulse drop-shadow-md" /> :
              <HeartCrack key={i} className="w-6 h-6 md:w-8 md:h-8 text-[#3b2d71] drop-shadow-md" />
          ))}
        </div>
      </div>

      {/* Content */}
      {children}

      {/* Buddy Bubble */}
      {buddyData && (
        <BuddyBubble
          key={`${buddyData.mood}-${buddyData.message}`}
          message={buddyData.message}
          mood={buddyData.mood}
          avatarUrl={buddyData.avatarUrl}
          avatarName={buddyData.avatarName}
          speakOnMount={!silenceBuddy}
          onDismiss={() => setBuddyData(null)}
        />
      )}
    </div>
  );
}
