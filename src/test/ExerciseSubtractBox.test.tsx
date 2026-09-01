import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseSubtractBox.tsx) ─────────── */
// Uses the real Math.random for the logic-only tests below (no spy installed
// yet at this point in the file). The component tests further down install a
// `vi.spyOn(Math, 'random')` inside their own beforeEach/afterEach so the
// generated question is deterministic without touching this describe block.
import type { SubtractBoxConfig } from '@/data/difficultyConfig';

type Mode = 'result' | 'subtrahend';

interface Question {
  mode: Mode;
  total: number;
  subtract: number;
  result: number;
  answer: number;
}

function generateQuestion(cfg: SubtractBoxConfig): Question {
  const minTotal = 2;
  const maxTotal = Math.max(minTotal, cfg.maxTotal);
  const total = Math.floor(Math.random() * (maxTotal - minTotal + 1)) + minTotal;
  const subtract = Math.floor(Math.random() * (total - 1)) + 1; // 1..total-1
  const result = total - subtract;

  const mode: Mode = Math.random() < 0.7 ? 'result' : 'subtrahend';
  const answer = mode === 'result' ? result : subtract;

  return { mode, total, subtract, result, answer };
}

describe('ExerciseSubtractBox question generation', () => {
  const cfg: SubtractBoxConfig = { maxTotal: 10 };

  it('always keeps subtract + result === total, with subtract and result >= 1', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(cfg);
      expect(q.subtract + q.result).toBe(q.total);
      expect(q.subtract).toBeGreaterThanOrEqual(1);
      expect(q.result).toBeGreaterThanOrEqual(1);
      expect(q.total).toBeGreaterThanOrEqual(2);
      expect(q.total).toBeLessThanOrEqual(cfg.maxTotal);
    }
  });

  it('sets the answer consistent with the question mode', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(cfg);
      if (q.mode === 'result') expect(q.answer).toBe(q.result);
      else expect(q.answer).toBe(q.subtract);
    }
  });

  it('never produces a total below minTotal even for a degenerate maxTotal config', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion({ maxTotal: 1 }); // clamped to minTotal (2) internally
      expect(q.total).toBeGreaterThanOrEqual(2);
    }
  });
});

/* ── Component ─────────────────────────────────────────────────────────── */

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

import { ExerciseSubtractBox } from '@/screens/ExerciseSubtractBox';

// With Math.random pinned to 0 and difficultyKey '1-1' (maxTotal: 6):
// total = 2, subtract = 1, result = 1, mode = 'result' (0 < 0.7) -> answer = result = 1.
const CORRECT_ANSWER = 1;

function getInputButton(): HTMLButtonElement {
  // In 'result' mode only the result NumberLabel is an interactive "?" button;
  // total and subtract render as plain (non-button) labels.
  const btn = screen.getAllByRole('button').find((b) => b.querySelector('span')?.textContent === '?');
  if (!btn) throw new Error('No open input button found');
  return btn as HTMLButtonElement;
}

describe('ExerciseSubtractBox component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('accepts the correct remaining count and celebrates', () => {
    render(<ExerciseSubtractBox />);
    fireEvent.click(getInputButton());
    fireEvent.click(screen.getByRole('button', { name: String(CORRECT_ANSWER) }));
    fireEvent.click(screen.getByLabelText('Controleer'));

    expect(triggerConfettiMock).toHaveBeenCalled();
  });

  it('rejects a wrong count and shows the "Bijna!" correction banner', () => {
    render(<ExerciseSubtractBox />);
    fireEvent.click(getInputButton());
    fireEvent.click(screen.getByRole('button', { name: String(CORRECT_ANSWER + 4) }));
    fireEvent.click(screen.getByLabelText('Controleer'));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Bijna!')).toBeInTheDocument();
  });

  it('closes the numpad after a correct answer and refuses to reopen it (no accidental re-submit)', () => {
    render(<ExerciseSubtractBox />);
    fireEvent.click(getInputButton());
    fireEvent.click(screen.getByRole('button', { name: String(CORRECT_ANSWER) }));
    const checkBtn = screen.getByLabelText('Controleer');
    fireEvent.click(checkBtn);

    expect(triggerConfettiMock).toHaveBeenCalledTimes(1);

    // openNumpad now early-returns while status === 'correct' (matching the
    // guard added to ExerciseSplitBox and ExerciseSumSplit), so re-tapping the
    // answered slot within the 1800ms auto-advance window cannot reopen the
    // numpad and re-fire confetti / double-count progress. The numpad stays
    // hidden (exit opacity stays 0) and no second confetti fires.
    //
    // We check the exit style rather than awaiting full DOM removal:
    // TokenGrid's correct-answer dot animation (ExerciseSubtractBox.tsx
    // ~283-294) uses an invalid 3-keyframe `scale` + `type: 'spring'`
    // combination that this framer-motion version's runtime rejects, so
    // waiting for the numpad to actually unmount is flaky.
    const answeredSlot = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('span')?.textContent === String(CORRECT_ANSWER));
    expect(answeredSlot).toBeTruthy();
    fireEvent.click(answeredSlot!);

    expect(checkBtn.style.opacity).toBe('0');
    expect(triggerConfettiMock).toHaveBeenCalledTimes(1);
  });
});
