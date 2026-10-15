import React from 'react';
import { NightSkyScreen } from '@/components/auth/NightSky';

/** `tone="dark"` on the night-sky onboarding screens; the parent portal stays light. */
export function LoadingSpinner({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  if (tone === 'dark') {
    return (
      <NightSkyScreen className="h-[100dvh] min-h-0 justify-center">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[#c9bdf0] font-semibold">Laden...</p>
        </div>
      </NightSkyScreen>
    );
  }
  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-semibold">Laden...</p>
      </div>
    </div>
  );
}
