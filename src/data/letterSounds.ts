import type { SpeechLine } from '@/hooks/useSpeech';

/**
 * How the voice says a single letter: as the sound the child learns in class
 * (klankmethode), not as its name in the alphabet. Text-to-speech reads a lone
 * "p" as "pee", so each sound is spelled the way the voice should say it:
 * sounds you can hold are stretched ("mmm"), short ones get a soft "uh" ("puh"),
 * vowels are the short sound ("ih" as in "pit").
 */
export const LETTER_SOUND: Record<string, string> = {
  a: 'ah',
  b: 'buh',
  c: 'kuh',
  d: 'duh',
  e: 'eh',
  f: 'fff',
  g: 'ggg',
  h: 'huh',
  i: 'ih',
  j: 'juh',
  k: 'kuh',
  l: 'lll',
  m: 'mmm',
  n: 'nnn',
  o: 'oh',
  p: 'puh',
  q: 'kuh',
  r: 'rrr',
  s: 'sss',
  t: 'tuh',
  u: 'uh',
  v: 'vvv',
  w: 'wuh',
  x: 'ks',
  y: 'ie',
  z: 'zzz',
};

/** The sound of a letter for the voice; falls back to the letter itself. */
export function letterSound(letter: string): string {
  return LETTER_SOUND[letter.toLowerCase()] ?? letter;
}

/**
 * Sounds that have a recording in `public/klanken/<sound>.mp3` (made with the
 * ElevenLabs Voice Changer, in the app's voice). The voice can't say a lone
 * sound well, so a recording always wins; add a sound here with its file.
 */
export const RECORDED_SOUNDS: ReadonlySet<string> = new Set<string>(['b', 'k', 'm', 'p']);

/**
 * A letter sound as the Buddy says it: the recording when there is one, else
 * the voice with `text` (the spelled-out sound, e.g. "mmm").
 */
export function soundLine(sound: string, text = letterSound(sound)): SpeechLine {
  const key = sound.toLowerCase();
  return RECORDED_SOUNDS.has(key) ? { clip: `/klanken/${key}.mp3`, text } : text;
}
