import type { BuddyCue, BuddyMood } from '@/lib/buddy/state';
import type { CareActionId } from '@/lib/buddy/catalog';
import type { CareFx } from '@/hooks/useBuddy';
import buddyHappy from '@/assets/buddy/buddy-happy.png';
import buddyNeutral from '@/assets/buddy/buddy-neutral.png';
import buddySad from '@/assets/buddy/buddy-sad.png';
import buddyIll from '@/assets/buddy/buddy-ill.png';
import buddySleeping from '@/assets/buddy/buddy-sleeping.png';
import buddyGone from '@/assets/buddy/buddy-gone.png';
import hintHunger from '@/assets/buddy/hint-hunger.png';
import hintFun from '@/assets/buddy/hint-fun.png';
import hintEnergy from '@/assets/buddy/hint-energy.png';
import hintHygiene from '@/assets/buddy/hint-hygiene.png';
import hintIll from '@/assets/buddy/hint-ill.png';
import hintSleep from '@/assets/buddy/hint-sleep.png';

const BUDDY_ART: Record<BuddyMood, string> = {
  happy: buddyHappy,
  neutral: buddyNeutral,
  sad: buddySad,
  ill: buddyIll,
  sleeping: buddySleeping,
  gone: buddyGone,
};

const CUE_ANIMATION: Record<BuddyCue, string> = {
  gone: '',
  sleeping: 'animate-buddy-breathe',
  ill: 'animate-buddy-ill',
  hunger: 'animate-buddy-hungry',
  fun: 'animate-buddy-bored',
  energy: 'animate-buddy-tired',
  hygiene: 'animate-buddy-itchy',
  ok: 'animate-buddy-float',
};

const CUE_HINT: Partial<Record<BuddyCue, string>> = {
  sleeping: hintSleep,
  ill: hintIll,
  hunger: hintHunger,
  fun: hintFun,
  energy: hintEnergy,
  hygiene: hintHygiene,
};

const ACTION_ANIMATION: Record<CareActionId, string> = {
  feed: 'animate-buddy-eat',
  play: 'animate-buddy-play',
  sleep: 'animate-buddy-doze',
  medicine: 'animate-buddy-heal',
  wash: 'animate-buddy-wash',
};

type Particle = { emoji: string; className: string; style: React.CSSProperties };

function particlesFor(fx: CareFx): Particle[] {
  const spread = (i: number, total: number) => `${20 + (i * 60) / Math.max(1, total - 1)}%`;

  switch (fx.action) {
    case 'feed': {
      const items = [fx.emoji ?? '🍎', '✨', '🍞', '✨'];
      return items.map((emoji, i) => ({
        emoji,
        className: 'animate-fx-pop',
        style: { left: spread(i, items.length), bottom: '22%', animationDelay: `${i * 0.14}s` },
      }));
    }
    case 'play': {
      const items = [fx.emoji ?? '🧸', '⭐', '🎉', '⭐', '🎈'];
      return items.map((emoji, i) => ({
        emoji,
        className: 'animate-fx-pop',
        style: { left: spread(i, items.length), bottom: '28%', animationDelay: `${i * 0.11}s` },
      }));
    }
    case 'sleep': {
      const items = ['💤', 'z', 'Z', '💤'];
      return items.map((emoji, i) => ({
        emoji,
        className: 'animate-fx-rise',
        style: { left: `${58 + i * 7}%`, bottom: '45%', animationDelay: `${i * 0.18}s` },
      }));
    }
    case 'medicine': {
      const items = [fx.emoji ?? '💊', '✚', '✨', '✚'];
      return items.map((emoji, i) => ({
        emoji,
        className: 'animate-fx-rise',
        style: { left: spread(i, items.length), bottom: '30%', animationDelay: `${i * 0.13}s` },
      }));
    }
    case 'wash':
    default: {
      const items = [fx.emoji ?? '🧼', '🫧', '🫧', '✨', '🫧'];
      return items.map((emoji, i) => ({
        emoji,
        className: 'animate-fx-bubble',
        style: { left: spread(i, items.length), bottom: '20%', animationDelay: `${i * 0.12}s` },
      }));
    }
  }
}

export function BuddyStage({
  name,
  mood,
  cue,
  fx,
}: {
  name: string;
  mood: BuddyMood;
  cue: BuddyCue;
  fx?: CareFx | null;
}) {
  const hint = fx ? undefined : CUE_HINT[cue];
  const animation = fx ? ACTION_ANIMATION[fx.action] : CUE_ANIMATION[cue];

  return (
    <div className="relative flex h-60 w-full items-center justify-center">
      <img
        key={fx ? `fx-${fx.at}` : `cue-${cue}`}
        src={BUDDY_ART[mood]}
        alt={`Je Buddy ${name}`}
        width={768}
        height={768}
        className={`h-56 w-56 drop-shadow-2xl ${animation}`}
      />

      {fx && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {particlesFor(fx).map((p, i) => (
            <span
              key={`${fx.at}-${i}`}
              className={`absolute text-3xl drop-shadow ${p.className}`}
              style={p.style}
            >
              {p.emoji}
            </span>
          ))}
        </div>
      )}

      {hint && (
        <img
          key={cue}
          src={hint}
          alt=""
          aria-hidden
          loading="lazy"
          width={512}
          height={512}
          className="pointer-events-none absolute bottom-2 right-0 h-28 w-28 animate-fade-in animate-buddy-hint drop-shadow-lg"
        />
      )}
    </div>
  );
}
