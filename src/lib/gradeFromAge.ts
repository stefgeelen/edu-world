import { MAX_SUPPORTED_GRADE } from '@/data/difficultyConfig';

export const GRADE_LABELS: Record<number, string> = {
  1: '1ste leerjaar', 2: '2de leerjaar', 3: '3de leerjaar',
  4: '4de leerjaar', 5: '5de leerjaar', 6: '6de leerjaar',
};

/** Age-appropriate Flemish grade (1-6), uncapped by content availability. */
export function gradeForAge(age: number | ''): number {
  if (age === '' || age <= 6) return 1;
  if (age >= 11) return 6;
  return age - 5;
}

export interface GradeAssignment {
  /** The grade actually written to children.grade — clamped to what has real content today. */
  assignedGrade: number;
  assignedLabel: string;
  /** The age-appropriate grade before clamping, for an honest note when it differs from assignedGrade. */
  suggestedGrade: number;
  suggestedLabel: string;
  wasClamped: boolean;
}

/**
 * Resolves both what grade a child's age suggests and what grade they'll
 * actually be assigned. Without the clamp, onboarding a 9-year-old would
 * write grade:4 to the DB even though every content/theme/promotion read
 * path clamps to MAX_SUPPORTED_GRADE — silently mismatching the stored
 * grade from what the child actually sees. Returns null while age is unset.
 */
export function getGradeAssignment(age: number | ''): GradeAssignment | null {
  if (age === '') return null;
  const suggestedGrade = gradeForAge(age);
  const assignedGrade = Math.min(suggestedGrade, MAX_SUPPORTED_GRADE);
  return {
    assignedGrade,
    assignedLabel: GRADE_LABELS[assignedGrade] ?? `groep ${assignedGrade}`,
    suggestedGrade,
    suggestedLabel: GRADE_LABELS[suggestedGrade] ?? `groep ${suggestedGrade}`,
    wasClamped: assignedGrade !== suggestedGrade,
  };
}
