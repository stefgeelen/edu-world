import { describe, it, expect } from 'vitest';
import { GRADE_LABELS, gradeForAge, getGradeAssignment } from '@/lib/gradeFromAge';
import { MAX_SUPPORTED_GRADE } from '@/data/difficultyConfig';

/**
 * Onboarding writes children.grade from the age a parent types. Getting this
 * wrong is invisible at signup and only shows up later as content that is too
 * hard or too easy, so the age->grade mapping and the content clamp are pinned
 * here. Expectations use MAX_SUPPORTED_GRADE rather than its current value, so
 * these stay true as more grades ship.
 */

describe('gradeForAge', () => {
  it('maps each school age to its Flemish grade', () => {
    expect(gradeForAge(7)).toBe(2);
    expect(gradeForAge(8)).toBe(3);
    expect(gradeForAge(9)).toBe(4);
    expect(gradeForAge(10)).toBe(5);
  });

  it('puts every child aged 6 or younger in the first grade', () => {
    expect(gradeForAge(6)).toBe(1);
    expect(gradeForAge(4)).toBe(1);
    expect(gradeForAge(0)).toBe(1);
  });

  it('caps at the sixth grade for older children', () => {
    expect(gradeForAge(11)).toBe(6);
    expect(gradeForAge(14)).toBe(6);
    expect(gradeForAge(99)).toBe(6);
  });

  it('falls back to the first grade while the age field is empty', () => {
    expect(gradeForAge('')).toBe(1);
  });

  it('never returns a grade outside 1-6, for any age a parent could type', () => {
    for (let age = 0; age <= 20; age++) {
      const grade = gradeForAge(age);
      expect(grade, `age ${age}`).toBeGreaterThanOrEqual(1);
      expect(grade, `age ${age}`).toBeLessThanOrEqual(6);
    }
  });

  it('never decreases as the age goes up', () => {
    for (let age = 1; age <= 20; age++) {
      expect(gradeForAge(age), `age ${age}`).toBeGreaterThanOrEqual(gradeForAge(age - 1));
    }
  });
});

describe('getGradeAssignment', () => {
  it('returns null while the age is unset, so nothing is written yet', () => {
    expect(getGradeAssignment('')).toBeNull();
  });

  it('assigns the age-appropriate grade when content for it exists', () => {
    const assignment = getGradeAssignment(6)!;

    expect(assignment.suggestedGrade).toBe(1);
    expect(assignment.assignedGrade).toBe(1);
    expect(assignment.wasClamped).toBe(false);
  });

  it('clamps the stored grade to what has content, while keeping the honest suggestion', () => {
    // Storing an unclamped grade would mismatch every read path (content,
    // themes, promotion), which all clamp to MAX_SUPPORTED_GRADE.
    const assignment = getGradeAssignment(10)!;

    expect(assignment.suggestedGrade).toBe(5);
    expect(assignment.assignedGrade).toBe(MAX_SUPPORTED_GRADE);
    expect(assignment.wasClamped).toBe(MAX_SUPPORTED_GRADE < 5);
  });

  it('never assigns a grade beyond what content supports, for any age', () => {
    for (let age = 0; age <= 20; age++) {
      expect(getGradeAssignment(age)!.assignedGrade, `age ${age}`).toBeLessThanOrEqual(MAX_SUPPORTED_GRADE);
    }
  });

  it('only flags wasClamped when the two grades actually differ', () => {
    for (let age = 0; age <= 20; age++) {
      const a = getGradeAssignment(age)!;
      expect(a.wasClamped, `age ${age}`).toBe(a.assignedGrade !== a.suggestedGrade);
    }
  });

  it('labels both grades in Dutch for the onboarding copy', () => {
    const assignment = getGradeAssignment(9)!;

    expect(assignment.assignedLabel).toBe(GRADE_LABELS[assignment.assignedGrade]);
    expect(assignment.suggestedLabel).toBe(GRADE_LABELS[assignment.suggestedGrade]);
    expect(assignment.suggestedLabel).toMatch(/leerjaar/);
  });

  it('produces a label for every reachable grade rather than an empty string', () => {
    for (let age = 0; age <= 20; age++) {
      const a = getGradeAssignment(age)!;
      expect(a.assignedLabel.length, `age ${age} assigned`).toBeGreaterThan(0);
      expect(a.suggestedLabel.length, `age ${age} suggested`).toBeGreaterThan(0);
    }
  });
});

describe('GRADE_LABELS', () => {
  it('covers all six grades', () => {
    for (let grade = 1; grade <= 6; grade++) {
      expect(GRADE_LABELS[grade], `grade ${grade}`).toBeTruthy();
    }
  });
});
