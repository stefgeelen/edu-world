/*
 * Vragen voor de rekenoefeningen van de 3de kleuterklas: Hoeveel?, Meer of
 * minder en Cijfer bij aantal. Tellen tot 10, in drie stappen per trimester
 * (tot 5, tot 7, tot 10). Zie docs/kleuters-3de-kleuterklas.md.
 */

/** Hoeveel er hoogstens getoond worden, per trimester (de :id in de route). */
export const KLEUTER_MAX_BY_STAGE: Record<number, number> = { 1: 5, 2: 7, 3: 10 };

export function kleuterMax(stage: number | string | undefined): number {
  return KLEUTER_MAX_BY_STAGE[Number(stage)] ?? 10;
}

/** Tien vragen per oefening, zoals de andere oefeningen. */
export const KLEUTER_ROUNDS = 10;

/** Hoe een groepje getekend wordt: losse voorwerpen, een dobbelsteen of een getalbeeld. */
export type GroupLook = 'things' | 'dice' | 'getalbeeld';

export interface Thing {
  emoji: string;
  /** Meervoud, zoals de Buddy het zegt: "Hoeveel appels zie je?" */
  plural: string;
}

export const THINGS: Thing[] = [
  { emoji: '🍎', plural: 'appels' },
  { emoji: '🍓', plural: 'aardbeien' },
  { emoji: '🐟', plural: 'vissen' },
  { emoji: '⭐', plural: 'sterren' },
  { emoji: '🌸', plural: 'bloemen' },
  { emoji: '🚗', plural: "auto's" },
  { emoji: '🐞', plural: 'lieveheersbeestjes' },
  { emoji: '🎈', plural: 'ballonnen' },
  { emoji: '🍌', plural: 'bananen' },
  { emoji: '🐥', plural: 'kuikentjes' },
];

export interface Group {
  count: number;
  look: GroupLook;
  thing: Thing;
}

type Rng = () => number;

const pick = <T,>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

const between = (min: number, max: number, rng: Rng) => min + Math.floor(rng() * (max - min + 1));

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Een dobbelsteen kan tot 6; daarboven een getalbeeld of losse voorwerpen. */
function lookFor(count: number, rng: Rng): GroupLook {
  const looks: GroupLook[] = count <= 6 ? ['things', 'things', 'dice', 'getalbeeld'] : ['things', 'things', 'getalbeeld'];
  return pick(looks, rng);
}

/**
 * Drie verschillende aantallen 1..max: het juiste en twee die er hoogstens 3
 * van verschillen. Willekeurig gekozen, zodat het juiste niet altijd het
 * middelste is.
 */
export function threeCounts(answer: number, max: number, rng: Rng): number[] {
  const near = [-3, -2, -1, 1, 2, 3].map((d) => answer + d).filter((n) => n >= 1 && n <= max);
  const others = shuffle(near, rng).slice(0, 2);
  return shuffle([answer, ...others], rng);
}

/** Tien aantallen 1..max, zonder twee keer na elkaar hetzelfde. */
function counts(max: number, rounds: number, rng: Rng): number[] {
  const out: number[] = [];
  while (out.length < rounds) {
    const n = between(1, max, rng);
    if (n !== out[out.length - 1]) out.push(n);
  }
  return out;
}

// ── Hoeveel? ─────────────────────────────────────────────────────────────

export interface HowManyQuestion {
  group: Group;
  /** Drie cijfers om uit te kiezen, met het juiste erbij. */
  choices: number[];
}

export function howManyRound(max: number, rng: Rng = Math.random, rounds = KLEUTER_ROUNDS): HowManyQuestion[] {
  return counts(max, rounds, rng).map((count) => ({
    group: { count, look: lookFor(count, rng), thing: pick(THINGS, rng) },
    choices: threeCounts(count, max, rng),
  }));
}

/** Wat de Buddy vraagt. Bij een dobbelsteen of getalbeeld tel je stippen. */
export function howManyQuestionText(group: Group): string {
  if (group.look === 'dice') return 'Hoeveel stippen staan er op de dobbelsteen?';
  if (group.look === 'getalbeeld') return 'Hoeveel stippen zie je?';
  return `Hoeveel ${group.thing.plural} zie je?`;
}

// ── Meer of minder ───────────────────────────────────────────────────────

export type Side = 'left' | 'right' | 'equal';

export interface MoreLessQuestion {
  ask: 'meer' | 'minder';
  left: Group;
  right: Group;
  answer: Side;
}

/**
 * Twee groepjes van hetzelfde voorwerp. Ongeveer één op vijf keer zijn ze
 * evenveel. Tot 5 verschillen ze minstens 1, daarboven minstens 2, zodat
 * het nog te zien of te tellen is.
 */
export function moreLessRound(max: number, rng: Rng = Math.random, rounds = KLEUTER_ROUNDS): MoreLessQuestion[] {
  const minGap = max <= 5 ? 1 : 2;
  const out: MoreLessQuestion[] = [];
  for (let i = 0; i < rounds; i++) {
    const thing = pick(THINGS, rng);
    const ask = rng() < 0.5 ? 'meer' : 'minder';
    let a: number;
    let b: number;
    if (rng() < 0.2) {
      a = between(1, max, rng);
      b = a;
    } else {
      do {
        a = between(1, max, rng);
        b = between(1, max, rng);
      } while (Math.abs(a - b) < minGap);
    }
    const answer: Side = a === b ? 'equal' : (a > b) === (ask === 'meer') ? 'left' : 'right';
    out.push({
      ask,
      left: { count: a, look: 'things', thing },
      right: { count: b, look: 'things', thing },
      answer,
    });
  }
  return out;
}

export function moreLessQuestionText(q: MoreLessQuestion): string {
  return `Waar zijn er ${q.ask}?`;
}

// ── Cijfer bij aantal ────────────────────────────────────────────────────

export interface NumberMatchQuestion {
  number: number;
  /** Drie groepjes; één heeft er precies `number`. */
  groups: Group[];
}

export function numberMatchRound(max: number, rng: Rng = Math.random, rounds = KLEUTER_ROUNDS): NumberMatchQuestion[] {
  return counts(max, rounds, rng).map((number) => {
    const thing = pick(THINGS, rng);
    // Alle drie hetzelfde soort groepje, zodat het kind telt en niet de vorm vergelijkt.
    const look: GroupLook = max <= 6 && rng() < 0.3 ? 'dice' : rng() < 0.3 ? 'getalbeeld' : 'things';
    return {
      number,
      groups: threeCounts(number, max, rng).map((count) => ({ count, look, thing })),
    };
  });
}

export function numberMatchQuestionText(q: NumberMatchQuestion): string {
  return `Waar zijn er ${q.number}?`;
}
