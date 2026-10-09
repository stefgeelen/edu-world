import React, { createContext, useCallback, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Badge } from '@/types/game';
import { badgesData } from '@/data/badges';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useBuddyRow } from '@/hooks/useBuddy';
import { buddySpecies, type BuddySpecies } from '@/lib/buddy/species';

// Re-export for backwards compatibility
export type { Badge };
export { badgesData };

type GameContextType = {
  /** De Buddy van het kind: naam en tekeningen. */
  buddy: BuddySpecies;
  badges: Badge[];
  updateBadgeProgress: (badgeId: string, progress: number) => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

/** Map a hex color to a rough Tailwind bg class (used as fallback) */
function hexToColorClass(hex: string): string {
  return 'bg-slate-400';
}

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { data: child } = useCurrentChild();
  const [badges, setBadges] = useState<Badge[]>(badgesData);
  const { data: buddyRow } = useBuddyRow();
  const buddy = buddySpecies(buddyRow?.species);

  // Fetch badges from DB + child_badges for progress
  const { data: dbBadges } = useQuery({
    queryKey: ['game-badges', child?.id],
    queryFn: async () => {
      const { data: badgeDefs, error: bErr } = await supabase
        .from('badges')
        .select('*');
      if (bErr) throw bErr;

      const { data: childBadges, error: cbErr } = await supabase
        .from('child_badges')
        .select('*')
        .eq('child_id', child!.id);
      if (cbErr) throw cbErr;

      const childBadgeMap = new Map(
        (childBadges ?? []).map(cb => [cb.badge_id, cb])
      );

      return (badgeDefs ?? []).map(b => {
        const cb = childBadgeMap.get(b.id);
        return {
          id: b.id,
          name: b.name,
          description: b.description ?? '',
          requirement: b.requirement ?? '',
          icon: b.icon,
          color: hexToColorClass(b.gradient_from ?? '#64748b'),
          gradientFrom: b.gradient_from ?? '#64748b',
          gradientTo: b.gradient_to ?? '#475569',
          progress: cb?.progress ?? 0,
          maxProgress: b.max_progress,
          isUnlocked: cb?.is_unlocked ?? false,
        } satisfies Badge;
      });
    },
    enabled: !!child?.id,
  });

  // Sync badges from DB to state
  useEffect(() => {
    if (dbBadges && dbBadges.length > 0) {
      setBadges(dbBadges);
    }
  }, [dbBadges]);

  const updateBadgeProgress = useCallback((badgeId: string, progress: number) => {
    setBadges((prev) =>
      prev.map((badge) =>
        badge.id === badgeId
          ? { ...badge, progress, isUnlocked: progress >= badge.maxProgress }
          : badge
      )
    );
  }, []);

  const value = useMemo(
    () => ({ buddy, badges, updateBadgeProgress }),
    [buddy, badges, updateBadgeProgress]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
