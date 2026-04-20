import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { RewardCompletedPopup } from '@/components/RewardCompletedPopup';
import { PromotionPopup } from '@/components/PromotionPopup';

interface CompletedReward { id: string; title: string }

type CelebrationContextType = {
  celebrateRewards: (rewards: CompletedReward[]) => void;
  celebratePromotion: () => void;
};

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [rewards, setRewards] = useState<CompletedReward[]>([]);
  const [promotion, setPromotion] = useState(false);

  const celebrateRewards = useCallback((r: CompletedReward[]) => {
    if (r.length > 0) setRewards(r);
  }, []);

  const celebratePromotion = useCallback(() => {
    setPromotion(true);
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrateRewards, celebratePromotion }}>
      {children}
      <RewardCompletedPopup rewards={rewards} onClose={() => setRewards([])} />
      <PromotionPopup show={promotion} onClose={() => setPromotion(false)} />
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    // Fallback no-op so hooks outside provider don't throw during dev
    return { celebrateRewards: () => {}, celebratePromotion: () => {} };
  }
  return ctx;
}
