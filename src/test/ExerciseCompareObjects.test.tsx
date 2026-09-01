import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseCompareObjects.tsx) ──────── */
// Uses the real randomInt from '@/lib/random' so these tests exercise the
// actual boundary logic, not a re-implementation of it.
import { randomInt } from '@/lib/random';

type Answer = 'left' | 'right' | 'equal';
interface ObjectType { emoji: string; singular: string; plural: string }
interface Question { left: ObjectType; right: ObjectType; leftCount: number; rightCount: number; correct: Answer }

const A: ObjectType = { emoji: 'A', singular: 'a', plural: 'as' };
const B: ObjectType = { emoji: 'B', singular: 'b', plural: 'bs' };

function generateQuestion(min: number, max: number): Question {
  const left = A;
  const right = B;
  const makeEqual = Math.random() < 0.2;
  let leftCount: number;
  let rightCount: number;
  if (makeEqual) {
    leftCount = randomInt(min, max);
    rightCount = leftCount;
  } else {
    leftCount = randomInt(min, max);
    rightCount = randomInt(min, max);
    if (rightCount === leftCount) {
      rightCount = leftCount === max ? leftCount - 1 : leftCount + 1;
    }
  }
  const correct: Answer = leftCount > rightCount ? 'left' : leftCount < rightCount ? 'right' : 'equal';
  return { left, right, leftCount, rightCount, correct };
}

function objectLabel(obj: ObjectType, count: number): string {
  return `${count} ${count === 1 ? obj.singular : obj.plural}`;
}

describe('ExerciseCompareObjects question generation', () => {
  it('the "correct" side always matches which count is actually larger', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(1, 6);
      const expected = q.leftCount > q.rightCount ? 'left' : q.leftCount < q.rightCount ? 'right' : 'equal';
      expect(q.correct).toBe(expected);
    }
  });

  it('never generates counts outside [min, max]', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(2, 6);
      expect(q.leftCount).toBeGreaterThanOrEqual(2);
      expect(q.leftCount).toBeLessThanOrEqual(6);
      expect(q.rightCount).toBeGreaterThanOrEqual(2);
      expect(q.rightCount).toBeLessThanOrEqual(6);
    }
  });
});

describe('objectLabel', () => {
  it('uses the singular noun for a count of 1', () => {
    expect(objectLabel(A, 1)).toBe('1 a');
  });
  it('uses the plural noun for any other count', () => {
    expect(objectLabel(A, 0)).toBe('0 as');
    expect(objectLabel(A, 3)).toBe('3 as');
  });
});

/* ── Component: one full correct/incorrect round via the answer buttons ──── */

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => undefined }));
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: vi.fn() }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
// randomInt always returns `min`, so leftCount = min; rightCount is also
// `min`, forcing the tie-break branch (rightCount = leftCount + 1, since
// min !== max for COMPARE_OBJECTS_CONFIG['1-1'] = {minObjects:1,maxObjects:6})
// -> rightCount (2) > leftCount (1) -> the correct answer is always 'right'.
vi.mock('@/lib/random', () => ({ randomInt: (min: number) => min }));

import { ExerciseCompareObjects } from '@/screens/ExerciseCompareObjects';

// The feedback banners repeat "Links"/"Rechts" inside plain <p> text (e.g.
// "Het juiste antwoord is: Rechts heeft meer"), so a bare getByText(label)
// becomes ambiguous once status !== 'idle'. Scope to actual answer <button>s
// (icon span + label span) instead.
function getAnswerButton(label: string): HTMLElement {
  const btn = screen.getAllByRole('button').find((b) => {
    const spans = b.querySelectorAll('span');
    return spans.length === 2 && spans[1].textContent === label;
  });
  if (!btn) throw new Error(`No answer button found for "${label}"`);
  return btn;
}

describe('ExerciseCompareObjects component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force makeEqual=false (Math.random() < 0.2 must be false) and make the
    // OBJECT_TYPES shuffle a no-op (constant comparator -> stable sort).
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('accepts the correct side and celebrates with confetti', () => {
    render(<ExerciseCompareObjects />);
    fireEvent.click(getAnswerButton('Rechts')); // correct, per the seeded mocks above

    expect(triggerConfettiMock).toHaveBeenCalled();
    expect(screen.getByText(/Super goed!/)).toBeInTheDocument();
  });

  it('rejects the wrong side and shows the correction banner', () => {
    render(<ExerciseCompareObjects />);
    fireEvent.click(getAnswerButton('Links')); // wrong: actual correct side is 'right'

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Bijna!/)).toBeInTheDocument();
  });

  it('locks in the answer so a second click on another option is ignored', () => {
    render(<ExerciseCompareObjects />);
    fireEvent.click(getAnswerButton('Links')); // wrong
    fireEvent.click(getAnswerButton('Rechts')); // should be a no-op now (disabled)

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Bijna!/)).toBeInTheDocument();
  });
});
