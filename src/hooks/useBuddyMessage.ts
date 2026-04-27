import { useCallback, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { BUDDY_MESSAGES, getMoodForSituation, type BuddySituation, type BuddyMood } from '@/data/buddyMessages';

/**
 * Returns a buddy message + mood for the current avatar and given situation.
 * Tracks shown messages per session to avoid repetition.
 * Replaces `{name}` placeholders with the child's name.
 */
export function useBuddyMessage() {
  const { selectedAvatar } = useGame();
  const { data: child } = useCurrentChild();
  const shownRef = useRef<Map<string, Set<number>>>(new Map());

  const getMessage = useCallback((situation: BuddySituation): { message: string; mood: BuddyMood; avatarUrl: string | null; avatarName: string } | null => {
    if (!selectedAvatar) return null;

    const avatarId = selectedAvatar.id;
    const messages = BUDDY_MESSAGES[avatarId]?.[situation];
    if (!messages || messages.length === 0) return null;

    const key = `${avatarId}-${situation}`;
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

    const childName = (child as any)?.name ?? 'Vriend';
    const message = messages[idx].replace(/\{name\}/g, childName);

    return {
      message,
      mood: getMoodForSituation(situation),
      avatarUrl: selectedAvatar.imageUrl,
      avatarName: selectedAvatar.name,
    };
  }, [selectedAvatar, child]);

  return { getMessage, hasAvatar: !!selectedAvatar };
}
