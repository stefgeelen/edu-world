import { useEffect, useState } from 'react';
import type { BuddyCue, BuddyMood } from '@/lib/buddy/state';
import type { CareActionId } from '@/lib/buddy/catalog';
import type { CareFx } from '@/hooks/useBuddy';
import type { GrowthForm } from '@/lib/buddy/growth';
import type { BuddySpecies } from '@/lib/buddy/species';
import hintHunger from '@/assets/buddy/hint-hunger.png';
import hintFun from '@/assets/buddy/hint-fun.png';
import hintEnergy from '@/assets/buddy/hint-energy.png';
import hintHygiene from '@/assets/buddy/hint-hygiene.png';
import hintIll from '@/assets/buddy/hint-ill.png';
import hintSleep from '@/assets/buddy/hint-sleep.png';

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

/** Duur van de reactie als het kind de Buddy aantikt. */
const BOOP_MS = 700;

const BOOP_PARTICLES: Particle[] = ['💛', '✨', '💛'].map((emoji, i) => ({
  emoji,
  className: 'animate-fx-pop',
  style: { left: `${30 + i * 20}%`, bottom: '62%', animationDelay: `${i * 0.08}s` },
}));

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
  species,
  mood,
  cue,
  fx,
  onPoke,
  pointer,
  growth,
}: {
  /** Welke Buddy: naam en tekeningen. */
  species: BuddySpecies;
  mood: BuddyMood;
  cue: BuddyCue;
  fx?: CareFx | null;
  /** Het kind tikt de Buddy aan; de Buddy springt op en de ouder-component laat hem iets zeggen. */
  onPoke?: () => void;
  /** Rondleiding: een wijzend handje toont dat je de Buddy kan aantikken. */
  pointer?: boolean;
  /** Hoe groot de Buddy al is en wat hij draagt. Zonder: volwassen, zonder accessoires. */
  growth?: GrowthForm;
}) {
  const [boopAt, setBoopAt] = useState<number | null>(null);

  useEffect(() => {
    if (boopAt === null) return;
    const id = setTimeout(() => setBoopAt(null), BOOP_MS);
    return () => clearTimeout(id);
  }, [boopAt]);

  // Een Care Action-animatie gaat altijd voor; een tik speelt daar niet doorheen.
  const boop = !fx && boopAt !== null;
  const hint = fx || boop || pointer ? undefined : CUE_HINT[cue];
  const animation = fx ? ACTION_ANIMATION[fx.action] : boop ? 'animate-buddy-boop' : CUE_ANIMATION[cue];
  const imgKey = fx ? `fx-${fx.at}` : boop ? `boop-${boopAt}` : `cue-${cue}`;

  return (
    <div className="relative flex h-60 w-full items-center justify-center md:h-80">
      <button
        type="button"
        onClick={() => {
          // Tijdens de sprong telt een nieuwe tik niet: anders praat de Buddy over zichzelf heen.
          if (fx || boopAt !== null) return;
          setBoopAt(Date.now());
          onPoke?.();
        }}
        aria-label={`Tik op ${species.name}`}
        className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/80"
      >
        {/* Eigen laag voor de groei: de animaties op de afbeelding gebruiken zelf transform. */}
        <span
          className="relative inline-block transition-transform duration-700"
          style={{ transform: `scale(${growth?.scale ?? 1})` }}
          data-testid="buddy-growth"
        >
        <img
          key={imgKey}
          src={species.art[mood]}
          alt=""
          width={768}
          height={768}
          draggable={false}
          className={`h-56 w-56 select-none drop-shadow-2xl md:h-72 md:w-72 ${animation}`}
        />
        {growth?.accessories.map((emoji, i) => (
          <span
            key={emoji}
            aria-hidden
            className="pointer-events-none absolute text-4xl drop-shadow md:text-5xl"
            style={i === 0 ? { top: '4%', right: '18%' } : { bottom: '10%', left: '10%' }}
          >
            {emoji}
          </span>
        ))}
        </span>
      </button>

      {pointer && !boop && (
        <span
          className="pointer-events-none absolute bottom-0 right-[18%] animate-bounce text-5xl drop-shadow-lg"
          aria-hidden
        >
          👆
        </span>
      )}

      {boop && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {BOOP_PARTICLES.map((p, i) => (
            <span key={`${boopAt}-${i}`} className={`absolute text-3xl drop-shadow ${p.className}`} style={p.style}>
              {p.emoji}
            </span>
          ))}
        </div>
      )}

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
          className="pointer-events-none absolute bottom-2 right-0 h-28 w-28 animate-fade-in md:h-36 md:w-36 animate-buddy-hint drop-shadow-lg"
        />
      )}
    </div>
  );
}
