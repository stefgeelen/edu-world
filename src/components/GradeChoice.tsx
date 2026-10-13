import React from 'react';
import { cn } from '@/lib/utils';
import { MAX_SUPPORTED_GRADE } from '@/data/difficultyConfig';
import { GRADE_LABELS, type GradeAssignment } from '@/lib/gradeFromAge';

const GRADES = Array.from({ length: MAX_SUPPORTED_GRADE }, (_, i) => i + 1);

/**
 * The parent picks the child's grade. The age suggests one (`assignment`),
 * which stays selected until the parent picks another. Only grades the app
 * has content for can be picked.
 */
export function GradeChoice({ assignment, chosen, onChoose, size = 'md' }: {
  assignment: GradeAssignment | null;
  chosen: number | null;
  onChoose: (grade: number) => void;
  size?: 'md' | 'lg';
}) {
  const selected = chosen ?? assignment?.assignedGrade ?? null;
  return (
    <div>
      <div role="radiogroup" aria-label="Leerjaar" className="flex flex-wrap gap-2">
        {GRADES.map((grade) => {
          const on = grade === selected;
          return (
            <button
              key={grade}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChoose(grade)}
              className={cn(
                'rounded-xl border-2 font-black transition-colors',
                size === 'lg' ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm',
                on
                  ? 'border-teal-500 bg-teal-500 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300',
              )}
            >
              {GRADE_LABELS[grade]}
            </button>
          );
        })}
      </div>
      {assignment && chosen === null && (
        <p className="mt-2 text-[11px] font-medium text-slate-400">
          {assignment.wasClamped
            ? `Op basis van de leeftijd zou dit het ${assignment.suggestedLabel} zijn. Dat leerjaar is nog niet beschikbaar in de app.`
            : 'Voorgesteld op basis van de leeftijd. Kies gerust een ander leerjaar.'}
        </p>
      )}
    </div>
  );
}
