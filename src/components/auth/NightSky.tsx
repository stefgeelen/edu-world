import React from 'react';
import { cn } from '@/lib/utils';
import { StarryBackground, Ornaments } from '@/components/dashboard/Vitrine';

// Same dark "vitrine" look as the login screen (Auth.tsx) and the dashboard,
// for the screens a new parent passes through right after registering.
export const FIELD = 'bg-[#0f0828]/70 rounded-2xl border-2 border-[#3b2d71] p-4 flex items-center gap-3 focus-within:border-amber-400 transition-colors';
export const INPUT = 'flex-1 min-w-0 bg-transparent text-white font-bold placeholder:text-[#9d8bce] placeholder:font-semibold outline-none text-base';
export const PRIMARY_BUTTON = 'bg-amber-400 hover:bg-amber-300 text-[#1a103c] shadow-lg shadow-amber-400/25 active:scale-[0.98] border-b-4 border-amber-600 active:border-b-0 active:translate-y-1';
export const DISABLED_BUTTON = 'bg-[#2d1b54] text-[#7e6db8] cursor-not-allowed border-b-4 border-[#3b2d71]';

/** Full-screen night sky: gradient, stars and a soft golden glow at the top. */
export function NightSkyScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-h-[100dvh] w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] flex flex-col items-center relative overflow-hidden',
        className,
      )}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <StarryBackground />
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[90%] max-w-xl h-[45%] bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      {children}
    </div>
  );
}

/** The golden-edged card that holds a form. */
export function VitrineCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-amber-400/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)]',
        className,
      )}
    >
      <Ornaments tone="border-amber-400/40" />
      {children}
    </div>
  );
}
