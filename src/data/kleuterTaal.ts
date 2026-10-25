/*
 * Woorden voor de taaloefeningen van de 3de kleuterklas: Rijmen, Beginklank
 * en Klanken plakken. Elk woord is een prentje (emoji) dat een kleuter meteen
 * herkent, met de klanken waaruit het bestaat. Zie docs/kleuters-3de-kleuterklas.md.
 */
import { RECORDED_SOUNDS, soundLine } from '@/data/letterSounds';
import type { SpeechLine } from '@/hooks/useSpeech';
import { shuffle } from '@/lib/kleuterRekenen';

export interface PictureWord {
  word: string;
  emoji: string;
  /** De klanken zoals in de klas: "muis" → m, ui, s. */
  sounds: string[];
}

const w = (word: string, emoji: string, sounds: string): PictureWord => ({ word, emoji, sounds: sounds.split(' ') });

export const KLEUTER_WORDS: PictureWord[] = [
  w('aap', '🐒', 'aa p'),
  w('bal', '⚽', 'b a l'),
  w('banaan', '🍌', 'b a n aa n'),
  w('bed', '🛏️', 'b e d'),
  w('beer', '🐻', 'b ee r'),
  w('boom', '🌳', 'b oo m'),
  w('bus', '🚌', 'b u s'),
  w('deur', '🚪', 'd eu r'),
  w('dino', '🦕', 'd i n o'),
  w('doos', '📦', 'd oo s'),
  w('duif', '🕊️', 'd ui f'),
  w('fles', '🍾', 'f l e s'),
  w('haan', '🐓', 'h aa n'),
  w('hand', '✋', 'h a n d'),
  w('hart', '❤️', 'h a r t'),
  w('hoed', '🎩', 'h oe d'),
  w('hond', '🐶', 'h o n d'),
  w('huis', '🏠', 'h ui s'),
  w('jas', '🧥', 'j a s'),
  w('kaas', '🧀', 'k aa s'),
  w('kat', '🐱', 'k a t'),
  w('kip', '🐔', 'k i p'),
  w('koe', '🐄', 'k oe'),
  w('lamp', '💡', 'l a m p'),
  w('leeuw', '🦁', 'l ee uw'),
  w('lepel', '🥄', 'l ee p e l'),
  w('maan', '🌙', 'm aa n'),
  w('melk', '🥛', 'm e l k'),
  w('mes', '🔪', 'm e s'),
  w('mond', '👄', 'm o n d'),
  w('muis', '🐭', 'm ui s'),
  w('neus', '👃', 'n eu s'),
  w('nest', '🪺', 'n e s t'),
  w('paard', '🐴', 'p aa r d'),
  w('pan', '🍳', 'p a n'),
  w('peer', '🍐', 'p ee r'),
  w('pet', '🧢', 'p e t'),
  w('raket', '🚀', 'r aa k e t'),
  w('rat', '🐀', 'r a t'),
  w('ring', '💍', 'r i ng'),
  w('roos', '🌹', 'r oo s'),
  w('sap', '🧃', 's a p'),
  w('schaap', '🐑', 'sch aa p'),
  w('schip', '🚢', 'sch i p'),
  w('sok', '🧦', 's o k'),
  w('soep', '🥣', 's oe p'),
  w('taart', '🎂', 't aa r t'),
  w('tand', '🦷', 't a n d'),
  w('tas', '👜', 't a s'),
  w('tent', '⛺', 't e n t'),
  w('uil', '🦉', 'ui l'),
  w('vis', '🐟', 'v i s'),
  w('voet', '🦶', 'v oe t'),
  w('vos', '🦊', 'v o s'),
  w('vuur', '🔥', 'v uu r'),
  w('zebra', '🦓', 'z ee b r a'),
  w('zee', '🌊', 'z ee'),
  w('zeep', '🧼', 'z ee p'),
  w('zon', '☀️', 'z o n'),
];

const BY_WORD = new Map(KLEUTER_WORDS.map((p) => [p.word, p]));
export const pictureWord = (word: string): PictureWord => BY_WORD.get(word)!;

type Rng = () => number;

/** `count` verschillende woorden uit `pool`, willekeurig. */
const some = (pool: PictureWord[], count: number, rng: Rng) => shuffle(pool, rng).slice(0, count);

/** Tien vragen, zonder twee keer na elkaar hetzelfde juiste woord. */
function rounds<Q>(make: () => Q, key: (q: Q) => string, count: number): Q[] {
  const out: Q[] = [];
  while (out.length < count) {
    const q = make();
    if (key(q) !== (out.length ? key(out[out.length - 1]) : undefined)) out.push(q);
  }
  return out;
}

export interface PictureQuestion {
  /** Het woord dat de Buddy toont of in klanken zegt (bij Beginklank leeg). */
  prompt?: PictureWord;
  /** De klank waarmee het juiste woord begint (Beginklank). */
  sound?: string;
  answer: PictureWord;
  /** Drie prentjes, met het juiste erbij. */
  choices: PictureWord[];
}

// ── Rijmen ───────────────────────────────────────────────────────────────

/** Paren die rijmen en die een kleuter kent. */
export const RHYME_PAIRS: [string, string][] = [
  ['huis', 'muis'], ['kat', 'rat'], ['maan', 'haan'], ['beer', 'peer'], ['roos', 'doos'],
  ['kip', 'schip'], ['hond', 'mond'], ['pet', 'bed'], ['paard', 'taart'], ['mes', 'fles'],
  ['tas', 'jas'], ['hoed', 'voet'], ['schaap', 'aap'], ['tand', 'hand'],
];

/** Het einde dat rijmt: alles vanaf de laatste klinker ("muis" → ui s). */
export function rhymeEnd(p: PictureWord): string {
  const vowels = /^(a|e|i|o|u|aa|ee|oo|uu|ie|oe|eu|ui|ij|ei|ou|au|uw)$/;
  let i = p.sounds.length - 1;
  while (i > 0 && !vowels.test(p.sounds[i])) i--;
  // Een d op het einde klinkt als t: "bed" rijmt op "pet".
  return p.sounds.slice(i).join(' ').replace(/ d$/, ' t');
}

export function rhymeRound(rng: Rng = Math.random, count = 10): PictureQuestion[] {
  const rhymeWords = RHYME_PAIRS.flat().map(pictureWord);
  return rounds(() => {
    const [a, b] = RHYME_PAIRS[Math.floor(rng() * RHYME_PAIRS.length)];
    const [prompt, answer] = (rng() < 0.5 ? [a, b] : [b, a]).map(pictureWord);
    const others = some(rhymeWords.filter((p) => rhymeEnd(p) !== rhymeEnd(prompt)), 2, rng);
    return { prompt, answer, choices: shuffle([answer, ...others], rng) };
  }, (q) => q.answer.word, count);
}

// ── Beginklank ───────────────────────────────────────────────────────────

/** Klanken die vooraan gevraagd worden: medeklinkers met een opname. */
export const FIRST_SOUNDS = ['b', 'd', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'].filter((s) => RECORDED_SOUNDS.has(s));

/** Klanken die een kleuter nog vaak door elkaar haalt: die staan nooit samen in één vraag. */
const LOOKALIKE: Record<string, string> = { s: 'z', z: 's', v: 'f', f: 'v', b: 'p', p: 'b', d: 't', t: 'd' };

export function firstSoundRound(rng: Rng = Math.random, count = 10): PictureQuestion[] {
  const withSound = (s: string) => KLEUTER_WORDS.filter((p) => p.sounds[0] === s);
  const sounds = FIRST_SOUNDS.filter((s) => withSound(s).length > 0);
  return rounds(() => {
    const sound = sounds[Math.floor(rng() * sounds.length)];
    const [answer] = some(withSound(sound), 1, rng);
    // Andere prentjes beginnen met een andere letter (dus ook niet "sch" bij s) en niet met een klank die erop lijkt.
    const others = some(
      KLEUTER_WORDS.filter((p) => p.word[0] !== sound && p.sounds[0] !== LOOKALIKE[sound]),
      2,
      rng,
    );
    return { sound, answer, choices: shuffle([answer, ...others], rng) };
  }, (q) => q.answer.word, count);
}

// ── Klanken plakken ──────────────────────────────────────────────────────

/** Korte woorden (2 of 3 klanken) waarvan elke klank een opname heeft. Geen d op het einde: die klinkt als t. */
export const BLEND_WORDS = KLEUTER_WORDS.filter(
  (p) => p.sounds.length <= 3 && p.sounds.every((s) => RECORDED_SOUNDS.has(s)) && p.sounds[p.sounds.length - 1] !== 'd',
);

export function blendRound(rng: Rng = Math.random, count = 10): PictureQuestion[] {
  return rounds(() => {
    const [answer] = some(BLEND_WORDS, 1, rng);
    // Soms begint een ander prentje met dezelfde klank (vis, vos): dan moet het kind tot het einde luisteren.
    const others = some(BLEND_WORDS.filter((p) => p.word !== answer.word), 2, rng);
    return { prompt: answer, answer, choices: shuffle([answer, ...others], rng) };
  }, (q) => q.answer.word, count);
}

// ── Wat de Buddy zegt ────────────────────────────────────────────────────

/** Stilte tussen de vraag en de prentjes, en tussen twee prentjes: een kleuter moet elk woord kunnen volgen. */
export const NAME_PAUSE_MS = 700;

/** De drie prentjes, elk apart gezegd met een pauze ervoor. */
const names = (q: PictureQuestion): SpeechLine[] =>
  q.choices.flatMap((p) => [{ pause: NAME_PAUSE_MS }, p.word]);

/** "Wat rijmt op huis? … Muis. … Kat. … Beer." De prentjes noemt hij, zodat het kind weet welk woord bedoeld is. */
export function rhymeSay(q: PictureQuestion): SpeechLine[] {
  return [`Wat rijmt op ${q.prompt!.word}?`, ...names(q)];
}

/** "Welke prent begint met (mmm)? … Maan. … Bal. … Kat." */
export function firstSoundSay(q: PictureQuestion): SpeechLine[] {
  return ['Welke prent begint met', soundLine(q.sound!), ...names(q)];
}

/** "Luister: (v) (i) (s). Welk woord is dat?" Hier noemt hij de prentjes niet: het kind plakt de klanken zelf. */
export function blendSay(q: PictureQuestion): SpeechLine[] {
  return ['Luister.', ...q.prompt!.sounds.map((s) => soundLine(s)), 'Welk woord is dat?'];
}
