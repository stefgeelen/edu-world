/*
 * What Admin → Oefeningen tells about each type of exercise (route family,
 * e.g. "/exercises/money"): a fixed name, the choices the child gets inside
 * the app, rules outside the trimesters, and a one-line summary of a row's
 * config ("tot 20, met brug"). The rows themselves keep their own title: that
 * is what the child sees on the tile.
 *
 * Config keys and meaning match the *Config interfaces in difficultyConfig.ts.
 */

type Config = Record<string, unknown>;

export interface ExerciseTypeInfo {
  /** Name of the type in the admin, the same for every grade and trimester. */
  name: string;
  /** What the child picks inside the exercise, before the first question. */
  choices?: string[];
  /** A rule outside the trimesters, in one short line. */
  rule?: string;
  /** One line about a row's settings; empty when there is nothing to say. */
  summary?: (config: Config) => string;
}

const num = (c: Config, key: string): number | undefined => {
  const v = c[key];
  return typeof v === 'number' ? v : undefined;
};

const list = <T,>(c: Config, key: string): T[] => (Array.isArray(c[key]) ? (c[key] as T[]) : []);

/** "1–5", "1–10", "2, 5, 10" */
export function compactNumbers(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  const runs: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const n of [...sorted.slice(1), Infinity]) {
    if (n === prev + 1) { prev = n; continue; }
    runs.push(prev - start >= 2 ? `${start}–${prev}` : start === prev ? `${start}` : `${start}, ${prev}`);
    start = n;
    prev = n;
  }
  return runs.join(', ');
}

const range = (c: Config, min: string, max: string, unit = '') => {
  const lo = num(c, min);
  const hi = num(c, max);
  if (hi === undefined) return '';
  return `${lo ?? 1}–${hi}${unit}`;
};

const upTo = (c: Config, key: string, prefix = 'tot ') => {
  const v = num(c, key);
  return v === undefined ? '' : `${prefix}${v}`;
};

const euro = (cents: number | undefined) => (cents === undefined ? '' : `tot €${Math.round(cents / 100)}`);

export const EXERCISE_CATALOG: Record<string, ExerciseTypeInfo> = {
  // Rekenen
  '/exercises/math': {
    name: 'Sommen',
    summary: (c) => {
      const ops = list<string>(c, 'operators').map((o) => (o === '-' ? '−' : o === '*' ? '×' : o === '/' ? ':' : o)).join(' ');
      const bridge = c.bridge === 'with' ? 'met brug' : c.bridge === 'without' ? 'zonder brug' : '';
      return [ops, upTo(c, 'maxNumber'), bridge].filter(Boolean).join(', ');
    },
  },
  '/exercises/bonds': { name: 'Getallen splitsen', summary: (c) => range(c, 'minTarget', 'maxTarget') && `splitsen ${range(c, 'minTarget', 'maxTarget')}` },
  '/exercises/split-box': { name: 'Splitsdoos', summary: (c) => range(c, 'minTarget', 'maxTarget') && `splitsen ${range(c, 'minTarget', 'maxTarget')}` },
  '/exercises/subtract-box': { name: 'Aftrekdoos', summary: (c) => upTo(c, 'maxTotal') },
  '/exercises/sum-split': { name: 'Splitsen over 10', summary: (c) => range(c, 'minSum', 'maxSum') && `sommen ${range(c, 'minSum', 'maxSum')}` },
  '/exercises/dots': { name: 'Stippen tellen', summary: (c) => range(c, 'minDots', 'maxDots', ' stippen') },
  '/exercises/compare-objects': { name: 'Voorwerpen vergelijken', summary: (c) => range(c, 'minObjects', 'maxObjects', ' voorwerpen') },
  '/exercises/comparison': { name: 'Vergelijken', summary: (c) => upTo(c, 'maxNumber') },
  '/exercises/number-line': {
    name: 'Getallenlijn',
    summary: (c) => {
      const steps = list<number>(c, 'steps');
      const jumps = steps.length === 0 || (steps.length === 1 && steps[0] === 1)
        ? 'per 1'
        : steps.length === 1 ? `sprongen van ${steps[0]}` : `sprongen ${steps.join(', ')}`;
      return [upTo(c, 'maxNumber'), jumps].filter(Boolean).join(', ');
    },
  },
  '/exercises/even-odd': {
    name: 'Even of oneven',
    summary: (c) => {
      const kinds = list<string>(c, 'kinds');
      const extra = kinds.filter((k) => k !== 'even-odd').map((k) => (k === 'double' ? 'dubbel' : 'helft'));
      return [upTo(c, 'maxNumber'), extra.length ? `ook ${extra.join(' en ')}` : ''].filter(Boolean).join(', ');
    },
  },
  '/exercises/half-double': {
    name: 'Helft en dubbel',
    choices: ['De helft', 'Het dubbel', 'Door elkaar'],
    summary: (c) => upTo(c, 'maxNumber'),
  },
  '/exercises/number-sense': {
    name: 'Getallen tot 100',
    choices: ['Honderdveld', 'Luister', 'Groepjes van 10', 'H T E', 'Kleur het getal', 'Door elkaar'],
    summary: (c) => [upTo(c, 'maxNumber'), num(c, 'maxDots') !== undefined ? `max. ${num(c, 'maxDots')} stippen` : ''].filter(Boolean).join(', '),
  },
  '/exercises/times-tables': {
    name: 'Tafels',
    choices: ['Een tafel kiezen'],
    rule: 'Opent volgens de kalender; de ouder kan tafels vroeger openen',
    // Online the calendar decides which tables are open; config.tables is only
    // the fallback without a connection.
    summary: () => 'volgens de kalender',
  },
  '/exercises/money': { name: 'Geld', summary: (c) => euro(num(c, 'maxPriceCents')) },
  '/exercises/how-many': { name: 'Hoeveel?', rule: 'Trimester bepaalt het getal: tot 5, 7 of 10' },
  '/exercises/more-less': { name: 'Meer of minder', rule: 'Trimester bepaalt het getal: tot 5, 7 of 10' },
  '/exercises/number-match': { name: 'Cijfer bij aantal', rule: 'Trimester bepaalt het getal: tot 5, 7 of 10' },

  // Meetkunde
  '/exercises/geometry-terms': {
    name: 'Lijnen en hoeken',
    choices: ['Lijnen', 'Punt, rechte, lijnstuk', 'Hoeken', 'Evenwijdig en snijdend', 'Door elkaar'],
    summary: (c) => {
      const n = list<string>(c, 'topics').length;
      return n ? `${n} ${n === 1 ? 'onderdeel' : 'onderdelen'}` : '';
    },
  },

  // Andere
  '/exercises/clock': {
    name: 'Klokkijken',
    summary: (c) => [c.wholeHours ? 'hele uren' : '', c.halfHours ? 'halve uren' : '', c.quarterHours ? 'kwartier' : ''].filter(Boolean).join(', '),
  },

  // Lezen
  '/exercises/language': { name: 'Woord kiezen' },
  '/exercises/picture-word': { name: 'Prent & Woord', summary: (c) => upTo(c, 'optionCount', '') && `${num(c, 'optionCount')} woorden om te kiezen` },
  '/exercises/sound-house': {
    name: 'Klankhuis',
    summary: (c) => {
      const where: Record<string, string> = { begin: 'vooraan', middle: 'midden', end: 'achteraan' };
      return list<string>(c, 'allowedPositions').map((p) => where[p] ?? p).join(', ');
    },
  },
  '/exercises/word-maker': { name: 'Woordenmaker' },
  '/exercises/sentence-doctor': { name: 'Zinnendokter' },
  '/exercises/rhyme': { name: 'Rijmen' },
  '/exercises/first-sound': { name: 'Beginklank' },
  '/exercises/blend': { name: 'Klanken plakken' },

  // Schrijven
  '/exercises/write-letter': { name: 'Letters schrijven' },
  '/exercises/write-number': { name: 'Getal schrijven' },
  '/exercises/write-digit': { name: 'Cijfers schrijven' },
};

/** "/exercises/money/2" → "/exercises/money" */
export function exerciseFamilyKey(route: string): string {
  return route.replace(/\/\d+$/, '');
}

/** Admin name of a type; falls back to a row's own title for a type not in the catalog. */
export function exerciseTypeName(familyKey: string, fallbackTitle: string): string {
  return EXERCISE_CATALOG[familyKey]?.name ?? fallbackTitle;
}

/** One line about a row's settings, or '' when there is nothing to say. */
export function summarizeConfig(familyKey: string, config: unknown): string {
  const summary = EXERCISE_CATALOG[familyKey]?.summary;
  if (!summary || !config || typeof config !== 'object' || Array.isArray(config)) return '';
  return summary(config as Config);
}

/** 1 for "stage-1"; null for anything else. */
export function stageNumber(stage: string): number | null {
  const n = parseInt(stage.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export const GRADE_NAMES: Record<number, string> = {
  0: '3de kleuterklas',
  1: '1ste leerjaar',
  2: '2de leerjaar',
  3: '3de leerjaar',
  4: '4de leerjaar',
  5: '5de leerjaar',
  6: '6de leerjaar',
};

/** Subject badge in the admin (light look). */
export const SUBJECT_LABELS: Record<string, { label: string; color: string }> = {
  math: { label: 'Rekenen', color: 'bg-blue-100 text-blue-700' },
  geometry: { label: 'Meetkunde', color: 'bg-pink-100 text-pink-700' },
  reading: { label: 'Lezen', color: 'bg-violet-100 text-violet-700' },
  writing: { label: 'Schrijven', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Andere', color: 'bg-teal-100 text-teal-700' },
};

export function subjectLabel(subject: string): { label: string; color: string } {
  return SUBJECT_LABELS[subject] ?? { label: subject, color: 'bg-slate-100 text-slate-600' };
}
