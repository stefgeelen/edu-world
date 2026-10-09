import { useCallback, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { BUDDY_MESSAGES, getMoodForSituation, type BuddySituation, type BuddyMood } from '@/data/buddyMessages';

/** Een fout antwoord toont de Buddy rustig, niet verdrietig: het kind mag zich vergissen. */
const ART_FOR_MOOD = { greeting: 'happy', correct: 'happy', wrong: 'neutral', complete: 'happy', idle: 'neutral' } as const;

/**
 * Returns a message + mood from the child's Buddy for the given situation.
 * Tracks shown messages per session to avoid repetition.
 * Replaces `{name}` placeholders with the child's name.
 */
export function useBuddyMessage() {
  const { buddy } = useGame();
  const { data: child } = useCurrentChild();
  const shownRef = useRef<Map<string, Set<number>>>(new Map());

  const getMessage = useCallback((situation: BuddySituation): { message: string; mood: BuddyMood; buddyImage: string; buddyName: string } | null => {
    const messages = BUDDY_MESSAGES[buddy.id][situation];
    if (messages.length === 0) return null;

    const key = `${buddy.id}-${situation}`;
    if (!shownRef.current.has(key)) {
      shownRef.current.set(key, new Set());
    }
    const shown = shownRef.current.get(key)!;

    if (shown.size >= messages.length) {
      shown.clear();
    }

    const available = messages.map((_, i) => i).filter((i) => !shown.has(i));
    const idx = available[Math.floor(Math.random() * available.length)];
    shown.add(idx);

    const childName = child?.name ?? 'Vriend';
    const message = messages[idx].replace(/\{name\}/g, childName);
    const mood = getMoodForSituation(situation);

    return {
      message,
      mood,
      buddyImage: buddy.art[ART_FOR_MOOD[mood]],
      buddyName: buddy.name,
    };
  }, [buddy, child]);

  return { getMessage };
}
