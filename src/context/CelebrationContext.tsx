import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { RewardCompletedPopup } from '@/components/RewardCompletedPopup';

interface CompletedReward { id: string; title: string }

type CelebrationContextType = {
  celebrateRewards: (rewards: CompletedReward[]) => void;
};

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [rewards, setRewards] = useState<CompletedReward[]>([]);

  const celebrateRewards = useCallback((r: CompletedReward[]) => {
    if (r.length > 0) setRewards(r);
  }, []);

  const value = useMemo(() => ({ celebrateRewards }), [celebrateRewards]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      <RewardCompletedPopup rewards={rewards} onClose={() => setRewards([])} />
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    // Fallback no-op so hooks outside provider don't throw during dev
    return { celebrateRewards: () => {} };
  }
  return ctx;
}
