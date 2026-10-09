import { describe, it, expect } from 'vitest';
import { BUDDY_SPECIES_LIST, buddyChoiceMode, buddySpecies, schoolYear } from '@/lib/buddy/species';
import { BUDDY_MESSAGES } from '@/data/buddyMessages';
import { growthForm } from '@/lib/buddy/growth';

describe('Buddy species', () => {
  it('has four Buddies, each with art for every mood and lines for every situation', () => {
    expect(BUDDY_SPECIES_LIST.map((s) => s.name)).toEqual(['Nootje', 'Vosje', 'Prikkel', 'Loeka']);
    for (const s of BUDDY_SPECIES_LIST) {
      expect(Object.keys(s.art).sort()).toEqual(['gone', 'happy', 'ill', 'neutral', 'sad', 'sleeping']);
      expect(s.intro).toContain(s.name);
      for (const lines of Object.values(BUDDY_MESSAGES[s.id])) expect(lines.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('falls back to Nootje for a missing or unknown value', () => {
    expect(buddySpecies().name).toBe('Nootje');
    expect(buddySpecies('draak').name).toBe('Nootje');
    expect(buddySpecies('loeka').name).toBe('Loeka');
  });

  it('names growth stages after the Buddy', () => {
    expect(growthForm(1, 'Vosje').title).toBe('Baby Vosje');
    expect(growthForm(7, 'Loeka').title).toBe('Loeka');
  });
});

describe('school year', () => {
  it('starts on 1 September', () => {
    expect(schoolYear(new Date(2026, 7, 31))).toBe(2025);
    expect(schoolYear(new Date(2026, 8, 1))).toBe(2026);
    expect(schoolYear(new Date(2027, 5, 30))).toBe(2026);
  });

  it('asks the first time, then once per school year', () => {
    const oct2026 = new Date(2026, 9, 9);
    expect(buddyChoiceMode(null, oct2026)).toBe('first');
    expect(buddyChoiceMode(2026, oct2026)).toBeNull();
    expect(buddyChoiceMode(2026, new Date(2027, 7, 31))).toBeNull();
    expect(buddyChoiceMode(2026, new Date(2027, 8, 1))).toBe('yearly');
  });
});
