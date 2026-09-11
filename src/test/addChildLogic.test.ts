import { describe, it, expect } from 'vitest';
import { gradeForAge, getGradeAssignment, GRADE_LABELS } from '@/lib/gradeFromAge';

// gradeForAge/getGradeAssignment used to be copy-pasted separately inside
// AddChild.tsx and ParentAddChild.tsx (with a matching copy of this test file's
// logic) — now extracted to src/lib/gradeFromAge.ts so both screens and this
// test import the real thing.

function getStudyYear(ageValue: number | '') {
  if (ageValue === '') return null;
  return GRADE_LABELS[gradeForAge(ageValue)] ?? null;
}

describe('getStudyYear (age-appropriate label, uncapped)', () => {
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

describe('gradeForAge (uncapped)', () => {
  it('defaults to grade 1 when age is not yet entered', () => {
    expect(gradeForAge('')).toBe(1);
  });

  it('caps young children at grade 1', () => {
    expect(gradeForAge(4)).toBe(1);
    expect(gradeForAge(6)).toBe(1);
  });

  it('maps ages 7-10 to grades 2-5', () => {
    expect(gradeForAge(7)).toBe(2);
    expect(gradeForAge(10)).toBe(5);
  });

  it('caps older children at grade 6', () => {
    expect(gradeForAge(11)).toBe(6);
    expect(gradeForAge(14)).toBe(6);
  });

  it('stays consistent with getStudyYear for every age in the input range (4-14)', () => {
    const yearToGrade: Record<string, number> = {
      '1ste leerjaar': 1, '2de leerjaar': 2, '3de leerjaar': 3,
      '4de leerjaar': 4, '5de leerjaar': 5, '6de leerjaar': 6,
    };
    for (let age = 4; age <= 14; age++) {
      const year = getStudyYear(age)!;
      expect(gradeForAge(age)).toBe(yearToGrade[year]);
    }
  });
});

describe('getGradeAssignment (clamped to MAX_SUPPORTED_GRADE)', () => {
  // These assert against the real, current MAX_SUPPORTED_GRADE (1) rather
  // than a mocked value — this is the actual behavior onboarding has today,
  // and it's exactly the mismatch this module was built to close: without
  // clamping, a 9-year-old would get grade:4 written to children.grade even
  // though every content/theme/promotion read path clamps to grade 1 anyway.

  it('returns null while age is unset', () => {
    expect(getGradeAssignment('')).toBeNull();
  });

  it('assigns grade 1 for an age that is already within the supported range', () => {
    const result = getGradeAssignment(6)!;
    expect(result.assignedGrade).toBe(1);
    expect(result.suggestedGrade).toBe(1);
    expect(result.wasClamped).toBe(false);
  });

  it('clamps an older child down to the highest supported grade, flagging that it was clamped', () => {
    const result = getGradeAssignment(9)!;
    expect(result.suggestedGrade).toBe(4);
    expect(result.suggestedLabel).toBe('4de leerjaar');
    expect(result.assignedGrade).toBe(1);
    expect(result.assignedLabel).toBe('1ste leerjaar');
    expect(result.wasClamped).toBe(true);
  });
});
