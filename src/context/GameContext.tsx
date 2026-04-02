import React, { createContext, useContext, useState, ReactNode } from 'react';
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

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [badges, setBadges] = useState<Badge[]>(badgesData);

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
