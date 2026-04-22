import React, { useState } from 'react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { BuddyBubble } from '@/components/BuddyBubble';
import { useBuddyMessage } from '@/hooks/useBuddyMessage';
import { useGame } from '@/context/GameContext';
import type { BuddySituation } from '@/data/buddyMessages';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

type Position = 'inline' | 'floating-tr' | 'floating-br';

interface BuddyCompanionProps {
  situation: BuddySituation;
  position?: Position;
  /** Visual size in px. Default 52. */
  size?: number;
  className?: string;
}

const POSITION_CLASS: Record<Position, string> = {
  inline: '',
  'floating-tr': 'fixed top-24 right-4 z-40 md:top-28 md:right-6',
  'floating-br': 'fixed bottom-28 right-4 z-40 md:bottom-10 md:right-6',
};

/**
 * Persistent buddy avatar. Tap to receive a contextual message via BuddyBubble.
 * Uses idle-float animation; reuses BuddyBubble for the actual speech.
 */
export function BuddyCompanion({
  situation,
  position = 'inline',
  size = 52,
  className,
}: BuddyCompanionProps) {
  const { getMessage, hasAvatar } = useBuddyMessage();
  const { selectedAvatar } = useGame();
  const [bubble, setBubble] = useState<{
    message: string;
    mood: any;
    avatarUrl: string;
    avatarName: string;
  } | null>(null);

  if (!hasAvatar || !selectedAvatar) return null;

  const handleTap = () => {
    if (bubble) return;
    const result = getMessage(situation);
    if (result?.avatarUrl) {
      setBubble({
        message: result.message,
        mood: result.mood,
        avatarUrl: result.avatarUrl,
        avatarName: result.avatarName,
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        aria-label="Praat met je studiemaatje"
        className={cn(
          POSITION_CLASS[position],
          'group outline-none active:scale-95 transition-transform',
          className
        )}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-md animate-pulse" />
          <div
            className="relative rounded-full border-[3px] border-amber-400 overflow-hidden shadow-lg shadow-amber-400/30 bg-[#2d1b54] animate-buddy-idle-float"
            style={{ width: size, height: size }}
          >
            <ImageWithFallback
              src={selectedAvatar.imageUrl}
              alt={selectedAvatar.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#1a103c] flex items-center justify-center">
            <Sparkles className="w-2 h-2 text-[#1a103c]" strokeWidth={3} />
          </div>
        </div>
      </button>

      {bubble && (
        <BuddyBubble
          message={bubble.message}
          mood={bubble.mood}
          avatarUrl={bubble.avatarUrl}
          avatarName={bubble.avatarName}
          onDismiss={() => setBubble(null)}
        />
      )}
    </>
  );
}
