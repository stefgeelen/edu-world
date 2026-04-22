import { useMemo } from 'react';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useGame } from '@/context/GameContext';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: 'Goedemorgen',
  afternoon: 'Hallo',
  evening: 'Goedenavond',
  night: 'Hé nachtuil',
};

/**
 * Returns a personalized greeting for the current child + their study buddy.
 * Outputs: { greeting, childName, buddyName, timeOfDay }
 */
export function useChildGreeting() {
  const { data: child } = useCurrentChild();
  const { selectedAvatar } = useGame();

  return useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = getTimeOfDay(hour);
    const childName = (child as any)?.name ?? 'Vriend';
    const buddyName = selectedAvatar?.name ?? 'je studiemaatje';
    const greeting = `${TIME_LABEL[timeOfDay]}, ${childName}!`;

    return { greeting, childName, buddyName, timeOfDay };
  }, [child, selectedAvatar]);
}
