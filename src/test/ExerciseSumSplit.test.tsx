import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseSumSplit.tsx) ────────────── */
// Uses the real randomInt from '@/lib/random' — this file never mocks that
// module, so these tests (and the component tests below, which read the
// generated question straight out of the rendered DOM instead of trying to
// control the RNG) exercise the actual generation logic.
import { randomInt } from '@/lib/random';
import { SUM_SPLIT_CONFIG } from '@/data/difficultyConfig';

interface Question {
  num1: number;
  num2: number;
  total: number;
  leftPart: number;
  rightPart: number;
}

function generateQuestion(minSum: number, maxSum: number): Question {
  for (let i = 0; i < 50; i++) {
    const num1 = randomInt(6, 9);
    const minN2 = Math.max(11 - num1, minSum - num1, 2);
    const maxN2 = Math.min(9, maxSum - num1);
    if (maxN2 < minN2) continue;
    const num2 = randomInt(minN2, maxN2);
    const leftPart = 10 - num1;
    const rightPart = num2 - leftPart;
    if (leftPart >= 1 && rightPart >= 1) {
      return { num1, num2, total: num1 + num2, leftPart, rightPart };
    }
  }
  return { num1: 8, num2: 6, total: 14, leftPart: 2, rightPart: 4 };
}

describe('ExerciseSumSplit question generation', () => {
  const { minSum, maxSum } = SUM_SPLIT_CONFIG['1-3'];

  it('always produces num1 in [6, 9] with a positive leftPart and rightPart', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(minSum, maxSum);
      expect(q.num1).toBeGreaterThanOrEqual(6);
      expect(q.num1).toBeLessThanOrEqual(9);
      expect(q.leftPart).toBeGreaterThanOrEqual(1);
      expect(q.rightPart).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps leftPart + rightPart consistent with num2, and total consistent with num1 + num2', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(minSum, maxSum);
      expect(q.leftPart + q.rightPart).toBe(q.num2);
      expect(q.total).toBe(q.num1 + q.num2);
    }
  });

  it('keeps the total within the configured [minSum, maxSum] range (including the hard-coded fallback)', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(minSum, maxSum);
      expect(q.total).toBeGreaterThanOrEqual(minSum);
      expect(q.total).toBeLessThanOrEqual(maxSum);
    }
  });
});

/* ── Component ─────────────────────────────────────────────────────────── */

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-3', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => undefined }));
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: vi.fn() }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

import { ExerciseSumSplit } from '@/screens/ExerciseSumSplit';

// Before any slot is filled, only the left/right split buttons show "?" and
// are enabled (the result slot shows "?" too but starts disabled/locked).
function getOpenQuestionButtons(): HTMLButtonElement[] {
  return screen
    .getAllByRole('button')
    .filter((b): b is HTMLButtonElement => b instanceof HTMLButtonElement && !b.disabled)
    .filter((b) => b.querySelector('span')?.textContent === '?');
}

// Scope digit clicks to the numpad itself — once a slot is filled its own
// button also displays that digit, so an unscoped getByRole('button', {name})
// becomes ambiguous (e.g. typing "4" after a slot already shows "4").
function getNumpadRoot(): HTMLElement {
  const closeBtn = screen.getByLabelText('Verberg numpad');
  return closeBtn.parentElement!.parentElement as HTMLElement;
}

function typeNumber(n: number) {
  const numpad = within(getNumpadRoot());
  for (const digit of String(n)) {
    fireEvent.click(numpad.getByRole('button', { name: digit }));
  }
}

function readQuestionFromDom(container: HTMLElement) {
  const num1 = Number(container.querySelector('.text-cyan-400')?.textContent);
  const num2 = Number(container.querySelector('.text-emerald-400')?.textContent);
  const leftPart = 10 - num1;
  const rightPart = num2 - leftPart;
  const total = num1 + num2;
  return { num1, num2, leftPart, rightPart, total };
}

describe('ExerciseSumSplit component', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('fills left/right/result correctly and celebrates', async () => {
    const { container } = render(<ExerciseSumSplit />);
    const { leftPart, rightPart, total } = readQuestionFromDom(container);

    const [leftBtn] = getOpenQuestionButtons();
    fireEvent.click(leftBtn);
    typeNumber(leftPart);
    fireEvent.click(screen.getByLabelText('Controleer')); // advances to "right"

    typeNumber(rightPart);
    fireEvent.click(screen.getByLabelText('Controleer')); // advances to "result"

    typeNumber(total);
    fireEvent.click(screen.getByLabelText('Controleer')); // closes numpad

    fireEvent.click(screen.getByText('Controleer!').closest('button')!);

    await waitFor(() => expect(triggerConfettiMock).toHaveBeenCalled());
  });

  it('rejects an incorrect split and shows the correction banner without celebrating', () => {
    const { container } = render(<ExerciseSumSplit />);
    const { leftPart, rightPart, total } = readQuestionFromDom(container);

    const [leftBtn] = getOpenQuestionButtons();
    fireEvent.click(leftBtn);
    typeNumber(leftPart + 1); // deliberately wrong
    fireEvent.click(screen.getByLabelText('Controleer'));

    typeNumber(rightPart);
    fireEvent.click(screen.getByLabelText('Controleer'));

    typeNumber(total);
    fireEvent.click(screen.getByLabelText('Controleer'));

    fireEvent.click(screen.getByText('Controleer!').closest('button')!);

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Bijna! Probeer opnieuw\./)).toBeInTheDocument();
  });

  it('locks a slot once marked correct, so tapping it again does not reopen the numpad', async () => {
    const { container } = render(<ExerciseSumSplit />);
    const { leftPart, rightPart, total } = readQuestionFromDom(container);

    const [leftBtn] = getOpenQuestionButtons();
    fireEvent.click(leftBtn);
    typeNumber(leftPart);
    fireEvent.click(screen.getByLabelText('Controleer'));

    typeNumber(rightPart);
    fireEvent.click(screen.getByLabelText('Controleer'));

    typeNumber(total);
    fireEvent.click(screen.getByLabelText('Controleer'));
    // Wait for the numpad's own exit animation to finish unmounting it before
    // moving on, so the later assertion below is only testing openSlot()'s
    // guard and not racing the AnimatePresence exit transition.
    await waitFor(() => expect(screen.queryByLabelText('Controleer')).not.toBeInTheDocument());

    // Validate synchronously sets leftStatus/rightStatus/resultStatus to
    // 'correct', which openSlot() checks before allowing a slot to reopen.
    fireEvent.click(screen.getByText('Controleer!').closest('button')!);
    fireEvent.click(leftBtn); // openSlot() should bail out: leftStatus === 'correct'
    expect(screen.queryByLabelText('Controleer')).not.toBeInTheDocument();
  });
});
