import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Starry sky behind the dashboard and the exercise list. */
export function StarryBackground() {
  const stars = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      key: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 1}px`,
      height: `${Math.random() * 3 + 1}px`,
      animation: `pulse ${Math.random() * 2 + 2}s infinite ${Math.random() * 3}s`,
    })),
  []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map(s => (
        <div key={s.key} className="absolute rounded-full bg-white opacity-20" style={s} />
      ))}
    </div>
  );
}

/** The little corner brackets on every vitrine. */
export function Ornaments({ tone }: { tone: string }) {
  return (
    <>
      <div className={`absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 ${tone} rounded-tl-md pointer-events-none`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 ${tone} rounded-tr-md pointer-events-none`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 ${tone} rounded-bl-md pointer-events-none`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 ${tone} rounded-br-md pointer-events-none`} />
    </>
  );
}

/** Munten on the dark vitrines. */
export function Payout({ amount, muted }: { amount: number; muted?: boolean }) {
  return (
    <span className={cn(
      'font-black text-xs whitespace-nowrap px-2 py-1 rounded-full',
      muted ? 'text-[#9d8bce] bg-[#0f0828]/60' : 'text-amber-200 bg-amber-500/10 border border-amber-500/30'
    )}>
      +{amount} 🪙
    </span>
  );
}
