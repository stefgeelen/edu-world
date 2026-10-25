import { SOUND_WORD_POOL, type SoundWord } from '@/data/soundHousePool';
import { PICTURE_POOL, type PictureItem } from '@/data/picturePool';

/**
 * Lezen per thema (1ste leerjaar). Afspraken en woordenlijsten:
 * docs/lezen-per-thema.md.
 *
 * Het leesjaar heeft 10 thema's. Per thema komen er klanken en letters bij,
 * en een woord mag pas in een oefening als het kind alles erin al kent.
 * Welk thema een kind heeft, beslist de server (child_reading_theme): de
 * kalender, of wat de ouder koos.
 */

export const READING_THEME_COUNT = 10;

export interface ReadingTheme {
  theme: number;
  /** Wat erbij komt, zoals de ouder het in het ouderportaal leest. */
  newInClass: string;
  /** Nieuwe klanken en letters: de bouwstenen waarmee een woord gelezen wordt. */
  graphemes: string[];
  /** Medeklinkergroepen vooraan die het kind als één stukje leert (thema 7). */
  clusters?: string[];
}

export const READING_THEMES: ReadingTheme[] = [
  { theme: 1, newInClass: 'i, a, e, ee, aa, ij · k, n, l, t, p, s', graphemes: ['i', 'a', 'e', 'ee', 'aa', 'ij', 'k', 'n', 'l', 't', 'p', 's'] },
  { theme: 2, newInClass: 'o, ui, oo, uu, u · m, g, r, f', graphemes: ['o', 'ui', 'oo', 'uu', 'u', 'm', 'g', 'r', 'f'] },
  { theme: 3, newInClass: 'oe · d, v, z, h, b', graphemes: ['oe', 'd', 'v', 'z', 'h', 'b'] },
  { theme: 4, newInClass: 'ie, eu, ou · j, w, sch', graphemes: ['ie', 'eu', 'ou', 'j', 'w', 'sch'] },
  { theme: 5, newInClass: 'de, je, me, ze, we · eerste zinnetjes (hij loopt)', graphemes: [] },
  { theme: 6, newInClass: 'twee medeklinkers achteraan (tent, hand, wolf) · ng, nk', graphemes: ['ng', 'nk'] },
  {
    theme: 7,
    newInClass: 'twee medeklinkers vooraan (bril, spook, schroef) · aai, ooi, oei, ieuw, eeuw · -je',
    graphemes: ['aai', 'ooi', 'oei', 'ieuw', 'eeuw'],
    clusters: ['bl', 'br', 'fl', 'fr', 'gr', 'kl', 'kn', 'pl', 'pr', 'schr', 'sl', 'sm', 'sn', 'sp', 'st', 'tr', 'vl', 'zw'],
  },
  { theme: 8, newInClass: 'woorden met twee stukken (rimpel, voetbal) · meervoud -en · ge-, be-, ver-', graphemes: [] },
  { theme: 9, newInClass: '-lijk · zagen, boten, muren', graphemes: [] },
  { theme: 10, newInClass: '-el (winkel) · vragen met wie, wat, waar', graphemes: [] },
];

/**
 * Het thema volgens de kalender. Zelfde datums als reading_theme_for_date in
 * supabase/migrations/20261025120000_reading_themes.sql; enkel gebruikt als de
 * server niet te bereiken is.
 */
export function calendarReadingTheme(day: Date): number {
  const md = `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  if (md >= '09-01' && md < '09-28') return 1;
  if (md >= '09-28' && md < '11-09') return 2;
  if (md >= '11-09' && md < '12-07') return 3;
  if (md >= '12-07' || md < '01-04') return 4;
  if (md < '01-25') return 5;
  if (md < '03-01') return 6;
  if (md < '04-20') return 7;
  if (md < '05-11') return 8;
  if (md < '06-01') return 9;
  return 10;
}

// ── Kan een kind dit woord lezen? ─────────────────────────────────────────

const GRAPHEME_THEME = new Map<string, number>();
for (const t of READING_THEMES) for (const g of t.graphemes) GRAPHEME_THEME.set(g, t.theme);

/** Langste eerst, zodat "schoen" sch-oe-n wordt en niet s-c-h-o-e-n. */
const ALL_GRAPHEMES = [
  ...new Set([...GRAPHEME_THEME.keys(), 'ei', 'au', 'ch', 'c', 'q', 'x', 'y']),
].sort((a, b) => b.length - a.length);

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'aa', 'ee', 'oo', 'uu', 'ie', 'oe', 'eu', 'ui', 'ij', 'ou', 'ei', 'au', 'aai', 'ooi', 'oei', 'ieuw', 'eeuw']);

/** "schoen" → ['sch', 'oe', 'n']. */
export function graphemes(word: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < word.length) {
    const g = ALL_GRAPHEMES.find((c) => word.startsWith(c, i)) ?? word[i];
    out.push(g);
    i += g.length;
  }
  return out;
}

/**
 * Het eerste thema waarin een kind dit woord kan lezen, of null als er een
 * klank in zit die (nog) in geen enkel thema staat (bv. ei, au).
 *  - elke klank moet gekend zijn;
 *  - twee medeklinkers achteraan pas vanaf thema 6, vooraan vanaf thema 7;
 *  - meer dan één klinker (twee stukken) pas vanaf thema 8, behalve -je in thema 7.
 */
export function readableFromTheme(word: string): number | null {
  const gs = graphemes(word.toLowerCase());
  let theme = 1;
  for (const g of gs) {
    const t = GRAPHEME_THEME.get(g);
    if (t === undefined) return null;
    theme = Math.max(theme, t);
  }

  const vowelAt = gs.map((g) => VOWELS.has(g));
  const first = vowelAt.indexOf(true);
  const last = vowelAt.lastIndexOf(true);
  if (first < 0) return null;
  const vowels = vowelAt.filter(Boolean).length;

  if (first > 1) theme = Math.max(theme, 7);
  if (gs.length - 1 - last > 1) theme = Math.max(theme, 6);
  if (vowels > 1) theme = Math.max(theme, word.endsWith('je') && vowels === 2 ? 7 : 8);
  return theme;
}

/** De klanken en letters die een kind in dit thema kent. */
export function knownGraphemes(theme: number): Set<string> {
  return new Set(READING_THEMES.filter((t) => t.theme <= theme).flatMap((t) => t.graphemes));
}

// ── Woorden per thema ─────────────────────────────────────────────────────

/** Luisterwoord en Woordenmaker. Elk thema gebruikt ook de woorden van de vorige. */
export const THEME_WORDS: Record<number, string[]> = {
  1: ['kip', 'kat', 'pak', 'tak', 'pan', 'kan', 'tas', 'sap', 'pet', 'net', 'pen', 'nek', 'les', 'lek', 'pit', 'lip', 'pil', 'kaas', 'aap', 'taak', 'laan', 'teen', 'lees', 'ijs', 'pijl', 'pijp', 'lijn', 'kijk'],
  2: ['kom', 'mol', 'pot', 'pop', 'rok', 'sok', 'top', 'mug', 'rug', 'gum', 'kus', 'mus', 'put', 'muis', 'uil', 'ruit', 'tuin', 'kuil', 'luik', 'oog', 'roos', 'rook', 'oor', 'uur', 'muur', 'fuut', 'raam', 'naam', 'maan', 'mat', 'ram', 'gat', 'gek', 'rem', 'mes', 'fijn', 'rijm', 'raaf'],
  3: ['boek', 'voet', 'koe', 'soep', 'poes', 'hoek', 'boom', 'boot', 'bus', 'bom', 'vis', 'zak', 'zon', 'zee', 'zeep', 'huis', 'duif', 'doos', 'dak', 'das', 'hok', 'haas', 'haan', 'vaas', 'vuur', 'bijl', 'dik', 'hut', 'bal', 'vos'],
  4: ['wiel', 'riet', 'biet', 'vier', 'dier', 'reus', 'neus', 'deur', 'kous', 'zout', 'hout', 'jas', 'jaar', 'wol', 'wip', 'schip', 'schaap', 'schuur', 'schoen', 'schep'],
  6: ['tent', 'hand', 'wolf', 'verf', 'lint', 'mond', 'kalf', 'korf', 'feest', 'vork', 'heks', 'worm', 'ring', 'bank', 'zink', 'kast', 'melk', 'lamp', 'hond', 'wolk', 'kind', 'web', 'hoed'],
  7: ['blik', 'bril', 'snoep', 'spook', 'friet', 'fluit', 'stuur', 'pruik', 'kluif', 'haai', 'kooi', 'leeuw', 'huisje', 'brood', 'slak', 'klok', 'gras', 'plant', 'vlag', 'zwaan'],
  8: ['rimpel', 'deksel', 'bussen', 'voetbal', 'boeken', 'verhaal', 'konijn', 'banaan'],
  9: ['zagen', 'boten', 'gitaar'],
  10: ['winkel', 'borstel', 'kruimel'],
};

/** Alle woorden tot en met dit thema. */
export function wordsUpToTheme(theme: number): string[] {
  return Object.entries(THEME_WORDS)
    .filter(([t]) => Number(t) <= theme)
    .flatMap(([, words]) => words);
}

// ── Zinnendokter (vanaf thema 5) ──────────────────────────────────────────

export interface ThemeFixSentence {
  sentence: string[];
  wrongIndex: number;
  correctWord: string;
  distractors: string[];
}

/** Zinnen om in de juiste volgorde te leggen, per thema waarin ze kunnen. */
export const THEME_BUILD_SENTENCES: Record<number, string[][]> = {
  5: [
    ['de', 'kat', 'zit', 'op', 'de', 'mat'],
    ['ik', 'zie', 'de', 'boot'],
    ['de', 'poes', 'is', 'dik'],
    ['ik', 'lees', 'een', 'boek'],
    ['de', 'vis', 'is', 'nat'],
    ['we', 'zien', 'de', 'bus'],
    ['ik', 'zie', 'een', 'koe'],
    ['ik', 'zit', 'in', 'de', 'zon'],
    ['de', 'muis', 'loopt', 'weg'],
    ['hij', 'kijkt', 'naar', 'de', 'maan'],
  ],
  6: [
    ['de', 'hond', 'ligt', 'in', 'de', 'mand'],
    ['ik', 'zit', 'in', 'de', 'tent'],
    ['mam', 'heeft', 'een', 'ring'],
    ['de', 'kat', 'wil', 'melk'],
    ['ik', 'heb', 'een', 'lamp'],
  ],
  7: [
    ['de', 'slak', 'is', 'traag'],
    ['ik', 'eet', 'een', 'broodje'],
    ['de', 'leeuw', 'is', 'boos'],
    ['de', 'poes', 'slaapt', 'op', 'de', 'mat'],
    ['de', 'bal', 'rolt', 'weg'],
    ['ik', 'zie', 'een', 'ster'],
  ],
  8: [
    ['de', 'vogel', 'zingt', 'mooi'],
    ['wij', 'spelen', 'in', 'de', 'tuin'],
    ['papa', 'kookt', 'het', 'eten'],
    ['mama', 'leest', 'een', 'boek', 'voor'],
  ],
  10: [
    ['wie', 'zit', 'er', 'in', 'de', 'klas'],
    ['wat', 'eet', 'de', 'aap'],
    ['waar', 'is', 'mijn', 'borstel'],
  ],
};

/** Zinnen met één fout woord, vanaf thema 6 ("welk woord past in de zin?"). */
export const THEME_FIX_SENTENCES: Record<number, ThemeFixSentence[]> = {
  6: [
    { sentence: ['de', 'hond', 'leest', 'in', 'de', 'tuin'], wrongIndex: 2, correctWord: 'rent', distractors: ['kookt', 'zingt'] },
    { sentence: ['de', 'kat', 'zingt', 'op', 'de', 'mat'], wrongIndex: 2, correctWord: 'zit', distractors: ['kookt', 'leest'] },
    { sentence: ['de', 'vis', 'zit', 'in', 'de', 'boom'], wrongIndex: 5, correctWord: 'kom', distractors: ['lamp', 'bank'] },
    { sentence: ['ik', 'zit', 'in', 'de', 'hond'], wrongIndex: 4, correctWord: 'tent', distractors: ['vork', 'melk'] },
  ],
  7: [
    { sentence: ['de', 'vis', 'loopt', 'in', 'de', 'kom'], wrongIndex: 2, correctWord: 'zwemt', distractors: ['zingt', 'leest'] },
    { sentence: ['ik', 'slaap', 'in', 'mijn', 'tas'], wrongIndex: 4, correctWord: 'bed', distractors: ['pot', 'hoed'] },
    { sentence: ['de', 'kat', 'leest', 'op', 'de', 'bank'], wrongIndex: 2, correctWord: 'slaapt', distractors: ['kookt', 'rijdt'] },
    { sentence: ['de', 'vis', 'klimt', 'in', 'de', 'boom'], wrongIndex: 2, correctWord: 'zwemt', distractors: ['vliegt', 'rent'] },
  ],
  8: [
    { sentence: ['ik', 'eet', 'soep', 'met', 'een', 'vork'], wrongIndex: 5, correctWord: 'lepel', distractors: ['pen', 'kam'] },
    { sentence: ['de', 'koe', 'blaft', 'in', 'de', 'stal'], wrongIndex: 2, correctWord: 'loeit', distractors: ['vliegt', 'zingt'] },
    { sentence: ['de', 'zon', 'regent', 'vandaag'], wrongIndex: 2, correctWord: 'schijnt', distractors: ['slaapt', 'zingt'] },
    { sentence: ['de', 'vogel', 'zwemt', 'in', 'de', 'boom'], wrongIndex: 2, correctWord: 'zit', distractors: ['rent', 'kookt'] },
    { sentence: ['papa', 'rijdt', 'op', 'een', 'banaan'], wrongIndex: 4, correctWord: 'fiets', distractors: ['appel', 'wortel'] },
    { sentence: ['de', 'bloem', 'loopt', 'in', 'de', 'tuin'], wrongIndex: 2, correctWord: 'groeit', distractors: ['slaapt', 'vliegt'] },
    { sentence: ['de', 'appel', 'groeit', 'in', 'het', 'water'], wrongIndex: 5, correctWord: 'boom', distractors: ['gras', 'zand'] },
  ],
};

function upTo<T>(byTheme: Record<number, T[]>, theme: number): T[] {
  return Object.entries(byTheme)
    .filter(([t]) => Number(t) <= theme)
    .flatMap(([, items]) => items);
}

export function buildSentencesUpTo(theme: number): string[][] {
  return upTo(THEME_BUILD_SENTENCES, theme);
}

export function fixSentencesUpTo(theme: number): ThemeFixSentence[] {
  return upTo(THEME_FIX_SENTENCES, theme);
}

// ── Klankhuis ──────────────────────────────────────────────────────────────

/** Klankhuis: vóór thema 5 enkel vooraan of achteraan, daarna ook in het midden. */
export function soundHousePositions(theme: number): ('begin' | 'middle' | 'end')[] {
  return theme >= 5 ? ['begin', 'middle', 'end'] : ['begin', 'end'];
}

/**
 * Een ronde Klankhuis: enkel klanken die het kind al kent. Het woord zelf
 * hoort het kind alleen, dus dat mag nieuwe letters hebben. Hoogstens twee
 * keer dezelfde klank en zo gelijk mogelijk verdeeld over de ramen.
 */
export function themedSoundHouseRound(theme: number, total = 5): SoundWord[] {
  const known = knownGraphemes(theme);
  const positions = soundHousePositions(theme);
  const pool = shuffle(SOUND_WORD_POOL.filter((w) => known.has(w.sound) && positions.includes(w.position)));

  const picked: SoundWord[] = [];
  const perSound = new Map<string, number>();
  const perPosition = new Map<string, number>();
  const maxPerPosition = Math.ceil(total / positions.length);
  for (const pass of [true, false]) {
    for (const w of pool) {
      if (picked.length >= total) break;
      if (picked.includes(w)) continue;
      if (pass && ((perSound.get(w.sound) ?? 0) >= 2 || (perPosition.get(w.position) ?? 0) >= maxPerPosition)) continue;
      picked.push(w);
      perSound.set(w.sound, (perSound.get(w.sound) ?? 0) + 1);
      perPosition.set(w.position, (perPosition.get(w.position) ?? 0) + 1);
    }
  }
  return picked;
}

// ── Prent & Woord ──────────────────────────────────────────────────────────

/** De prenten waarvan het kind het woord al kan lezen. */
export function picturesUpToTheme(theme: number): PictureItem[] {
  return PICTURE_POOL.filter((p) => (readableFromTheme(p.word) ?? Infinity) <= theme);
}

/** Prent & Woord: vier woorden om uit te kiezen vanaf thema 8, anders drie. */
export function pictureOptionCount(theme: number): 3 | 4 {
  return theme >= 8 ? 4 : 3;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Woordenmaker ───────────────────────────────────────────────────────────

export interface WordMakerItem {
  word: string;
  /** Wat vooraan komt: één medeklinker, of vanaf thema 7 een groepje (br, schr). */
  onset: string;
  /** Het stukje dat er al staat: "ip" van "kip". */
  rest: string;
  /** Het begin is een groepje van twee medeklinkers. */
  cluster: boolean;
}

/** Splitst een woord van één stuk in begin en rest; null als dat niet past. */
export function splitOnset(word: string): WordMakerItem | null {
  const gs = graphemes(word);
  const first = gs.findIndex((g) => VOWELS.has(g));
  if (first <= 0) return null;
  if (gs.filter((g) => VOWELS.has(g)).length !== 1) return null;
  return { word, onset: gs.slice(0, first).join(''), rest: gs.slice(first).join(''), cluster: first > 1 };
}

/** De beginstukjes waaruit het kind kan kiezen in dit thema. */
export function onsetChoices(theme: number, cluster: boolean): string[] {
  if (cluster) return READING_THEMES.filter((t) => t.theme <= theme).flatMap((t) => t.clusters ?? []);
  return [...knownGraphemes(theme)].filter((g) => !VOWELS.has(g) && g !== 'ng' && g !== 'nk');
}

/** Alle woorden voor Woordenmaker tot en met dit thema. */
export function wordMakerItems(theme: number): WordMakerItem[] {
  return wordsUpToTheme(theme)
    .map(splitOnset)
    .filter((item): item is WordMakerItem => item !== null);
}

export interface WordMakerQuestion {
  item: WordMakerItem;
  /** Het juiste begin en twee andere, door elkaar. */
  choices: string[];
}

/** Een ronde Woordenmaker: verschillende woorden, elk met drie beginnen om uit te kiezen. */
export function wordMakerRound(theme: number, total = 5): WordMakerQuestion[] {
  return shuffle(wordMakerItems(theme))
    .slice(0, total)
    .map((item) => {
      const others = shuffle(onsetChoices(theme, item.cluster).filter((o) => o !== item.onset));
      return { item, choices: shuffle([item.onset, ...others.slice(0, 2)]) };
    });
}
