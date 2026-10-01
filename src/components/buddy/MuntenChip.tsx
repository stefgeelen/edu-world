import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Munten, shown the same way everywhere: amber chip with a coin icon. */
export function MuntenChip({
  amount,
  label,
  muted = false,
  size = 'sm',
}: {
  amount: number | string;
  /** Accessible name; defaults to "<amount> Munten". */
  label?: string;
  muted?: boolean;
  size?: 'sm' | 'lg';
}) {
  return (
    <span
      aria-label={label ?? `${amount} Munten`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-black tabular-nums',
        size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2 py-0.5 text-xs',
        muted ? 'bg-slate-100 text-slate-500' : 'border border-amber-200 bg-amber-50 text-amber-700'
      )}
    >
      <Coins className={cn(size === 'lg' ? 'h-4 w-4' : 'h-3 w-3', muted ? 'text-slate-400' : 'text-amber-500')} aria-hidden />
      {amount}
    </span>
  );
}
