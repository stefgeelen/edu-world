import React, { useEffect, useState } from 'react';
import type { BuddyMood } from '@/data/buddyMessages';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

interface BuddyBubbleProps {
  message: string;
  mood: BuddyMood;
  avatarUrl: string;
  avatarName: string;
  /** Auto-dismiss delay in ms. Set to 0 to disable. Default 4000. */
  autoDismissMs?: number;
  onDismiss?: () => void;
}

const MOOD_AVATAR_ANIMATION: Record<BuddyMood, string> = {
  greeting: 'animate-buddy-bounce-in',
  correct: 'animate-buddy-celebrate',
  wrong: 'animate-buddy-sad-shake',
  complete: 'animate-buddy-celebrate',
  idle: 'animate-buddy-idle-float',
};

/**
 * Animated buddy avatar with speech bubble overlay.
 * Shows the selected study buddy with a contextual message and mood-based animation.
 */
export function BuddyBubble({ message, mood, avatarUrl, avatarName, autoDismissMs = 4000, onDismiss }: BuddyBubbleProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 400);
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!visible) return null;

  const handleTap = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 400);
  };

  return (
    <div
      className={`fixed bottom-24 left-4 z-50 flex items-end gap-2 cursor-pointer md:bottom-8 md:left-6 ${exiting ? 'animate-buddy-exit' : ''}`}
      onClick={handleTap}
      role="status"
      aria-label={`${avatarName} zegt: ${message}`}
    >
      {/* Avatar */}
      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-[3px] border-amber-400 overflow-hidden shadow-lg shadow-amber-400/20 bg-[#2d1b54] flex-shrink-0 ${MOOD_AVATAR_ANIMATION[mood]}`}>
        <ImageWithFallback
          src={avatarUrl}
          alt={avatarName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Speech bubble */}
      <div className={`relative max-w-[220px] md:max-w-[280px] bg-[#1a103c]/95 backdrop-blur-xl rounded-2xl rounded-bl-sm px-4 py-3 border-2 border-[#3b2d71] shadow-xl ${exiting ? '' : 'animate-bubble-pop'}`}>
        {/* Triangle pointer */}
        <div className="absolute bottom-2 -left-2 w-3 h-3 bg-[#1a103c]/95 border-l-2 border-b-2 border-[#3b2d71] rotate-45" />
        <p className="text-sm font-bold text-white/90 leading-snug">{message}</p>
        <p className="text-[10px] font-bold text-[#a78bfa] mt-1">{avatarName}</p>
      </div>
    </div>
  );
}
