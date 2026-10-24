import { describe, it, expect } from 'vitest';
import { LETTER_SOUND, letterSound, soundLine } from '@/data/letterSounds';

// The Buddy says a letter as its sound in class ("puh"), never its name ("pee").

describe('letterSounds', () => {
  it('has a sound for every letter of the alphabet', () => {
    expect(Object.keys(LETTER_SOUND).sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz');
  });

  it('spells a sound for the voice', () => {
    expect(letterSound('p')).toBe('puh');
    expect(letterSound('M')).toBe('mmm');
  });

  it('falls back to the voice for a sound without a recording', () => {
    expect(soundLine('zz-not-recorded', 'zzz')).toBe('zzz');
  });
});
