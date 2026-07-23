import { describe, it, expect } from 'vitest';

// getStudyYear/getGrade live inline inside src/screens/AddChild.tsx and aren't
// exported, so — following the same pattern as generateMathQuestion.test.ts —
// the logic is copied here for testing. If you touch age->grade mapping in
// AddChild.tsx, update this copy too, or better: extract both functions to
// src/lib/ so this file (and the component) can import the real thing.
function getStudyYear(ageValue: number | '') {
  if (ageValue === '') return null;
  if (ageValue <= 6) return '1ste leerjaar';
  if (ageValue === 7) return '2de leerjaar';
  if (ageValue === 8) return '3de leerjaar';
  if (ageValue === 9) return '4de leerjaar';
  if (ageValue === 10) return '5de leerjaar';
  if (ageValue >= 11) return '6de leerjaar';
  return null;
}

function getGrade(ageValue: number | ''): number {
  if (ageValue === '' || ageValue <= 6) return 1;
  if (ageValue >= 11) return 6;
  return ageValue - 5;
}

describe('getStudyYear', () => {
  it('returns null when age is not yet entered', () => {
    expect(getStudyYear('')).toBeNull();
  });

  it('maps ages 4-6 to 1ste leerjaar', () => {
    expect(getStudyYear(4)).toBe('1ste leerjaar');
    expect(getStudyYear(6)).toBe('1ste leerjaar');
  });

  it.each([
    [7, '2de leerjaar'],
    [8, '3de leerjaar'],
    [9, '4de leerjaar'],
    [10, '5de leerjaar'],
  ])('maps age %i to %s', (age, expected) => {
    expect(getStudyYear(age)).toBe(expected);
  });

  it('maps ages 11+ to 6de leerjaar (caps at grade 6)', () => {
    expect(getStudyYear(11)).toBe('6de leerjaar');
    expect(getStudyYear(14)).toBe('6de leerjaar');
  });
});

describe('getGrade', () => {
  it('defaults to grade 1 when age is not yet entered', () => {
    expect(getGrade('')).toBe(1);
  });

  it('caps young children at grade 1', () => {
    expect(getGrade(4)).toBe(1);
    expect(getGrade(6)).toBe(1);
  });

  it('maps ages 7-10 to grades 2-5', () => {
    expect(getGrade(7)).toBe(2);
    expect(getGrade(10)).toBe(5);
  });

  it('caps older children at grade 6', () => {
    expect(getGrade(11)).toBe(6);
    expect(getGrade(14)).toBe(6);
  });

  it('stays consistent with getStudyYear for every age in the input range (4-14)', () => {
    const yearToGrade: Record<string, number> = {
      '1ste leerjaar': 1, '2de leerjaar': 2, '3de leerjaar': 3,
      '4de leerjaar': 4, '5de leerjaar': 5, '6de leerjaar': 6,
    };
    for (let age = 4; age <= 14; age++) {
      const year = getStudyYear(age)!;
      expect(getGrade(age)).toBe(yearToGrade[year]);
    }
  });
});
