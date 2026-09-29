import { NEED_EMOJI, NEED_LABEL, type NeedId } from '@/lib/buddy/constants';
import { cn } from '@/lib/utils';

const COLOR: Record<NeedId, string> = {
  hunger: 'bg-edu-orange',
  fun: 'bg-edu-pink',
  energy: 'bg-edu-purple',
  hygiene: 'bg-edu-blue',
  health: 'bg-edu-green',
};

export function NeedBar({ id, value }: { id: NeedId; value: number }) {
  const critical = value < 20;
  return (
    <div className="rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-black/5">
      <div className="mb-1.5 flex items-center justify-between text-[13px] font-extrabold">
        <span className="flex items-center gap-1.5 text-foreground">
          <span aria-hidden>{NEED_EMOJI[id]}</span>
          {NEED_LABEL[id]}
        </span>
        {critical && (
          <span className="text-base leading-none" role="img" aria-label="Bijna leeg">
            ❗
          </span>
        )}
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={NEED_LABEL[id]}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', COLOR[id], critical && 'animate-pulse')}
          style={{ width: `${Math.max(2, value)}%` }}
        />
      </div>
    </div>
  );
}
