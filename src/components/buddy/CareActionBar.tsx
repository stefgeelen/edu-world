import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CARE_ACTIONS, itemsByCategory, type CareActionId } from '@/lib/buddy/catalog';
import { useBuddy } from '@/hooks/useBuddy';
import { cn } from '@/lib/utils';

const ACTION_ORDER: CareActionId[] = ['feed', 'play', 'sleep', 'medicine', 'wash'];

const ACTION_STYLE: Record<CareActionId, string> = {
  feed: 'bg-edu-orange shadow-edu-orange/40',
  play: 'bg-edu-pink shadow-edu-pink/40',
  sleep: 'bg-edu-purple shadow-edu-purple/40',
  medicine: 'bg-edu-teal shadow-edu-teal/40',
  wash: 'bg-edu-blue shadow-edu-blue/40',
};

export function CareActionBar({
  disabled,
  highlight,
}: {
  disabled?: boolean;
  /** De Care Action die de Buddy nu nodig heeft; die knop wiebelt als hint. */
  highlight?: CareActionId;
}) {
  const { buddy, care } = useBuddy();
  const [open, setOpen] = useState<CareActionId | null>(null);

  const action = open ? CARE_ACTIONS[open] : null;
  // Alleen wat het kind echt heeft: grijze, niet-klikbare items lezen als "dit werkt niet".
  const items = action
    ? itemsByCategory(action.category).filter((item) => (buddy.inventory[item.id] ?? 0) > 0)
    : [];
  const ownsAny = items.length > 0;

  return (
    <>
      <div className="grid grid-cols-5 gap-2">
        {ACTION_ORDER.map((id) => {
          const a = CARE_ACTIONS[id];
          const owned = itemsByCategory(a.category).reduce(
            (sum, item) => sum + (buddy.inventory[item.id] ?? 0),
            0
          );
          const nudge = !disabled && highlight === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => setOpen(id)}
              className={cn(
                'relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-3xl px-1 py-3 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40',
                ACTION_STYLE[id],
                nudge && 'animate-care-nudge ring-4 ring-white'
              )}
            >
              <span className="text-3xl leading-none" aria-hidden>
                {a.emoji}
              </span>
              <span className="text-[13px] font-extrabold leading-none">{a.label}</span>
              {owned > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-foreground shadow">
                  {owned}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">
              {action?.emoji} {action?.label}
            </DialogTitle>
            <DialogDescription>
              {open === 'sleep'
                ? 'Slapen is gratis. Met een dekentje of kussen is je Buddy sneller uitgerust.'
                : ownsAny
                  ? 'Tik op wat je wil geven.'
                  : 'Je hebt hier nog niets van. Koop iets in de Winkel!'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {open === 'sleep' && (
              <button
                type="button"
                onClick={() => {
                  care('sleep');
                  setOpen(null);
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-edu-purple px-4 py-3 text-left text-white shadow-md active:scale-[0.98]"
              >
                <span className="text-2xl">🌙</span>
                <span>
                  <span className="block text-sm font-extrabold">Gewoon slapen</span>
                  <span className="block text-xs opacity-90">Gratis, duurt 30 minuten</span>
                </span>
              </button>
            )}

            {items.map((item) => {
              const count = buddy.inventory[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (open) care(open, item.id);
                    setOpen(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-2 ring-black/10 transition active:scale-[0.98]"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-extrabold text-foreground">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                  <span className="text-xs font-extrabold text-muted-foreground">{count}x</span>
                </button>
              );
            })}

            <Link
              to="/app/buddy-room/shop"
              onClick={() => setOpen(null)}
              className={cn(
                'block rounded-2xl px-4 py-3 text-center text-base font-extrabold',
                ownsAny || open === 'sleep' ? 'bg-muted text-foreground' : 'bg-edu-green text-white shadow-md'
              )}
            >
              🛍️ Naar de Winkel →
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
