import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { LETTER_SOUND, RECORDED_SOUNDS, letterSound, soundLine } from '@/data/letterSounds';

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

  it('uses the recording for a recorded sound, with the voice as fallback', () => {
    expect(soundLine('p')).toEqual({ clip: '/klanken/p.mp3', text: 'puh' });
  });
});

describe('recorded sounds', () => {
  it('has a file in public/klanken for every recorded sound', () => {
    for (const sound of RECORDED_SOUNDS) {
      expect(existsSync(join(process.cwd(), 'public', 'klanken', `${sound}.mp3`)), sound).toBe(true);
    }
  });

  it('plays the same recording for two spellings of one sound', () => {
    expect(soundLine('ou', 'ou')).toEqual({ clip: '/klanken/au.mp3', text: 'ou' });
    expect(soundLine('ei', 'ei')).toEqual({ clip: '/klanken/ij.mp3', text: 'ei' });
  });

  it('still lets the voice say a sound nobody recorded yet', () => {
    expect(soundLine('sch', 'sch')).toBe('sch');
  });
});
