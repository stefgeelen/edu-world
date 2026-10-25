import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/seededRandom';
import { RECORDED_SOUNDS } from '@/data/letterSounds';
import {
  BLEND_WORDS, FIRST_SOUNDS, KLEUTER_WORDS, RHYME_PAIRS, blendRound, blendSay, firstSoundRound, firstSoundSay,
  NAME_PAUSE_MS, pictureWord, rhymeEnd, rhymeRound, rhymeSay,
} from '@/data/kleuterTaal';

// Taal in de 3de kleuterklas: rijmen, de beginklank horen, klanken plakken.

const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

describe('the words', () => {
  it('are unique, each with a picture and sounds that spell the word', () => {
    expect(new Set(KLEUTER_WORDS.map((p) => p.word)).size).toBe(KLEUTER_WORDS.length);
    expect(new Set(KLEUTER_WORDS.map((p) => p.emoji)).size).toBe(KLEUTER_WORDS.length);
    for (const p of KLEUTER_WORDS) {
      // "lepel" is lee-pel and "raket" raa-ket: said as in class, not spelled.
      if (['lepel', 'raket', 'zebra', 'leeuw'].includes(p.word)) continue;
      expect(p.sounds.join(''), p.word).toBe(p.word);
    }
  });

  it('only uses rhyme pairs that really rhyme, with pictures for both', () => {
    for (const [a, b] of RHYME_PAIRS) {
      expect(rhymeEnd(pictureWord(a)), `${a}/${b}`).toBe(rhymeEnd(pictureWord(b)));
    }
  });

  it('only blends words whose every sound has a recording', () => {
    expect(BLEND_WORDS.length).toBeGreaterThanOrEqual(20);
    for (const p of BLEND_WORDS) for (const s of p.sounds) expect(RECORDED_SOUNDS.has(s), `${p.word}: ${s}`).toBe(true);
  });
});

describe('rhymeRound', () => {
  it('has exactly one picture that rhymes', () => {
    for (const seed of seeds) {
      const round = rhymeRound(mulberry32(seed));
      expect(round).toHaveLength(10);
      for (const q of round) {
        expect(q.choices).toHaveLength(3);
        expect(q.choices.filter((c) => rhymeEnd(c) === rhymeEnd(q.prompt!))).toEqual([q.answer]);
        expect(q.answer).not.toBe(q.prompt);
      }
    }
  });

  it('says the word, then names the three pictures one by one with a pause before each', () => {
    const [q] = rhymeRound(mulberry32(3), 1);
    expect(rhymeSay(q)).toEqual([
      `Wat rijmt op ${q.prompt!.word}?`,
      ...q.choices.flatMap((c) => [{ pause: NAME_PAUSE_MS }, c.word]),
    ]);
  });
});

describe('firstSoundRound', () => {
  it('has exactly one picture with the sound in front, and no look-alike sound', () => {
    for (const seed of seeds) {
      for (const q of firstSoundRound(mulberry32(seed))) {
        expect(FIRST_SOUNDS).toContain(q.sound);
        expect(q.choices.filter((c) => c.sounds[0] === q.sound)).toEqual([q.answer]);
        const firsts = q.choices.map((c) => c.sounds[0]);
        if (q.sound === 's') expect(firsts).not.toContain('z');
        if (q.sound === 'b') expect(firsts).not.toContain('p');
        if (q.sound === 's') expect(q.choices.map((c) => c.word)).not.toContain('schip');
      }
    }
  });

  it('plays the recorded sound, not the letter name, then the pictures with pauses', () => {
    const [q] = firstSoundRound(mulberry32(5), 1);
    const lines = firstSoundSay(q);
    expect(lines[1]).toEqual({ clip: `/klanken/${q.sound}.mp3`, text: expect.any(String) });
    expect(lines.slice(2)).toEqual(q.choices.flatMap((c) => [{ pause: NAME_PAUSE_MS }, c.word]));
  });
});

describe('blendRound', () => {
  it('says the word sound by sound, with a recording for each, and does not name the pictures', () => {
    for (const seed of seeds) {
      for (const q of blendRound(mulberry32(seed))) {
        expect(q.choices.filter((c) => c.word === q.answer.word)).toHaveLength(1);
        const lines = blendSay(q);
        const clips = lines.filter((l) => typeof l !== 'string');
        expect(clips).toHaveLength(q.answer.sounds.length);
        const words = lines.filter((l): l is string => typeof l === 'string').join(' ');
        for (const c of q.choices) expect(words).not.toContain(c.word);
      }
    }
  });
});
