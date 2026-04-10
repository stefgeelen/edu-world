import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Avatar, Badge } from '@/types/game';
import { avatars } from '@/data/avatars';
import { badgesData } from '@/data/badges';

// Re-export for backwards compatibility
export type { Avatar, Badge };
export { avatars, badgesData };

type GameContextType = {
  selectedAvatar: Avatar | null;
  setSelectedAvatar: (avatar: Avatar) => void;
  xp: number;
  addXp: (amount: number) => void;
  streak: number;
  level: number;
  unlockedLevels: number[];
  completeLevel: (level: number) => void;
  badges: Badge[];
  updateBadgeProgress: (badgeId: string, progress: number) => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

/** Map a hex color to a rough Tailwind bg class (used as fallback) */
function hexToColorClass(hex: string): string {
  return 'bg-slate-400';
}

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [badges, setBadges] = useState<Badge[]>(badgesData);

  // Fetch the active child for this parent
  const { data: child } = useQuery({
    queryKey: ['game-child', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, xp, level, streak, avatar_id')
        .eq('parent_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Sync child data to local state
  useEffect(() => {
    if (child) {
      setXp(child.xp ?? 0);
      setLevel(child.level ?? 1);
      setStreak(child.streak ?? 0);
      if (child.avatar_id) {
        const found = avatars.find(a => a.id === child.avatar_id);
        if (found) setSelectedAvatar(found);
      }
    }
  }, [child]);

  // Fetch badges from DB + child_badges for progress
  const { data: dbBadges } = useQuery({
    queryKey: ['game-badges', child?.id],
    queryFn: async () => {
      // Fetch badge definitions
      const { data: badgeDefs, error: bErr } = await supabase
        .from('badges')
        .select('*');
      if (bErr) throw bErr;

      // Fetch child badge progress
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

  const addXp = (amount: number) => setXp((prev) => prev + amount);
  const completeLevel = (lvl: number) => {
    if (!unlockedLevels.includes(lvl + 1)) {
      setUnlockedLevels([...unlockedLevels, lvl + 1]);
    }
  };

  const updateBadgeProgress = (badgeId: string, progress: number) => {
    setBadges((prev) =>
      prev.map((badge) =>
        badge.id === badgeId
          ? { ...badge, progress, isUnlocked: progress >= badge.maxProgress }
          : badge
      )
    );
  };

  return (
    <GameContext.Provider value={{ selectedAvatar, setSelectedAvatar, xp, addXp, streak, level, unlockedLevels, completeLevel, badges, updateBadgeProgress }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
