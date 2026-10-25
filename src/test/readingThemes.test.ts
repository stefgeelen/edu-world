import { describe, it, expect } from 'vitest';
import {
  READING_THEMES,
  THEME_WORDS,
  THEME_BUILD_SENTENCES,
  THEME_FIX_SENTENCES,
  calendarReadingTheme,
  graphemes,
  readableFromTheme,
  splitOnset,
  onsetChoices,
  wordMakerItems,
  wordsUpToTheme,
  soundHousePositions,
} from '@/data/readingThemes';
import { PICTURE_POOL } from '@/data/picturePool';

/** A sentence word may be a verb with -t from thema 5 on ("hij loopt"). */
function sentenceWordFits(word: string, theme: number): boolean {
  const t = readableFromTheme(word);
  if (t !== null && t <= theme) return true;
  if (theme >= 5 && word.endsWith('t')) {
    const stem = readableFromTheme(word.slice(0, -1));
    return stem !== null && stem <= theme;
  }
  return false;
}

describe('graphemes', () => {
  it('splits into the sounds a child reads, longest first', () => {
    expect(graphemes('schoen')).toEqual(['sch', 'oe', 'n']);
    expect(graphemes('leeuw')).toEqual(['l', 'eeuw']);
    expect(graphemes('kijk')).toEqual(['k', 'ij', 'k']);
    expect(graphemes('bank')).toEqual(['b', 'a', 'nk']);
  });
});

describe('readableFromTheme', () => {
  it('needs every sound to be known', () => {
    expect(readableFromTheme('kip')).toBe(1);
    expect(readableFromTheme('muis')).toBe(2);
    expect(readableFromTheme('vis')).toBe(3);
    expect(readableFromTheme('schip')).toBe(4);
  });

  it('waits for two consonants at the end, then at the start, then two parts', () => {
    expect(readableFromTheme('tent')).toBe(6);
    expect(readableFromTheme('bril')).toBe(7);
    expect(readableFromTheme('huisje')).toBe(7);
    expect(readableFromTheme('konijn')).toBe(8);
  });

  it('never reads a sound that is in no theme yet', () => {
    expect(readableFromTheme('ei')).toBeNull();
    expect(readableFromTheme('auto')).toBeNull();
    expect(readableFromTheme('lucht')).toBeNull();
  });
});

describe('word lists', () => {
  it('every word fits its theme', () => {
    for (const [theme, words] of Object.entries(THEME_WORDS)) {
      for (const word of words) {
        const t = readableFromTheme(word);
        expect(t, word).not.toBeNull();
        expect(t!, word).toBeLessThanOrEqual(Number(theme));
      }
    }
  });

  it('has no word twice', () => {
    const all = wordsUpToTheme(10);
    expect(new Set(all).size).toBe(all.length);
  });

  it('has enough words for four choices from thema 1 on', () => {
    expect(wordsUpToTheme(1).length).toBeGreaterThanOrEqual(8);
  });

  it('every sentence word fits its theme, and nothing comes before thema 5', () => {
    for (const [theme, sentences] of Object.entries(THEME_BUILD_SENTENCES)) {
      expect(Number(theme)).toBeGreaterThanOrEqual(5);
      for (const s of sentences) for (const w of s) expect(sentenceWordFits(w, Number(theme)), `${w} in ${s.join(' ')}`).toBe(true);
    }
    for (const [theme, sentences] of Object.entries(THEME_FIX_SENTENCES)) {
      expect(Number(theme)).toBeGreaterThanOrEqual(6);
      for (const s of sentences) {
        for (const w of [...s.sentence, s.correctWord, ...s.distractors]) {
          expect(sentenceWordFits(w, Number(theme)), `${w} in ${s.sentence.join(' ')}`).toBe(true);
        }
      }
    }
  });

  it('Prent & Woord has pictures for at least 3 words from thema 3 on', () => {
    const readable = PICTURE_POOL.filter((p) => (readableFromTheme(p.word) ?? 99) <= 3);
    expect(readable.length).toBeGreaterThanOrEqual(3);
  });
});

describe('calendarReadingTheme', () => {
  it('follows the school year', () => {
    expect(calendarReadingTheme(new Date(2026, 8, 1))).toBe(1);
    expect(calendarReadingTheme(new Date(2026, 9, 25))).toBe(2);
    expect(calendarReadingTheme(new Date(2026, 10, 9))).toBe(3);
    expect(calendarReadingTheme(new Date(2026, 11, 24))).toBe(4);
    expect(calendarReadingTheme(new Date(2027, 0, 2))).toBe(4);
    expect(calendarReadingTheme(new Date(2027, 0, 4))).toBe(5);
    expect(calendarReadingTheme(new Date(2027, 1, 10))).toBe(6);
    expect(calendarReadingTheme(new Date(2027, 2, 15))).toBe(7);
    expect(calendarReadingTheme(new Date(2027, 3, 20))).toBe(8);
    expect(calendarReadingTheme(new Date(2027, 4, 20))).toBe(9);
    expect(calendarReadingTheme(new Date(2027, 6, 15))).toBe(10);
  });

  it('has a description for every theme', () => {
    expect(READING_THEMES.map((t) => t.theme)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('Woordenmaker', () => {
  it('splits a word into its beginning and the rest', () => {
    expect(splitOnset('kip')).toEqual({ word: 'kip', onset: 'k', rest: 'ip', cluster: false });
    expect(splitOnset('schip')).toEqual({ word: 'schip', onset: 'sch', rest: 'ip', cluster: false });
    expect(splitOnset('bril')).toEqual({ word: 'bril', onset: 'br', rest: 'il', cluster: true });
    expect(splitOnset('ijs')).toBeNull();
    expect(splitOnset('konijn')).toBeNull();
  });

  it('only offers beginnings the child already knows', () => {
    expect(onsetChoices(1, false).sort()).toEqual(['k', 'l', 'n', 'p', 's', 't']);
    expect(onsetChoices(6, true)).toEqual([]);
    expect(onsetChoices(7, true)).toContain('br');
  });

  it('every word has its own beginning among the choices', () => {
    for (const theme of [1, 2, 3, 4, 7, 10]) {
      for (const item of wordMakerItems(theme)) {
        const choices = onsetChoices(theme, item.cluster);
        expect(choices, `${item.word} in thema ${theme}`).toContain(item.onset);
      }
    }
  });
});

describe('Klankhuis', () => {
  it('asks for the middle only from thema 5 on', () => {
    expect(soundHousePositions(4)).toEqual(['begin', 'end']);
    expect(soundHousePositions(5)).toEqual(['begin', 'middle', 'end']);
  });
});
