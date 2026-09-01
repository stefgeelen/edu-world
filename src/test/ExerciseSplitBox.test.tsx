import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseSplitBox.tsx) ────────────── */
// Uses the real Math.random for the logic-only tests below (no spy installed
// yet at this point in the file). The component tests further down install a
// `vi.spyOn(Math, 'random')` inside their own beforeEach/afterEach so the
// generated question is deterministic without touching this describe block.
import type { SplitBoxConfig } from '@/data/difficultyConfig';

type Side = 'left' | 'right';
type Mode = 'target' | 'left' | 'right' | 'sum';

interface Question {
  mode: Mode;
  target: number;
  leftCount: number;
  rightCount: number;
  knownSide: Side;
  answer: number;
}

function generateQuestion(cfg: SplitBoxConfig): Question {
  const { minTarget, maxTarget } = cfg;
  const target = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;
  const leftCount = Math.floor(Math.random() * (target - 1)) + 1; // 1..target-1
  const rightCount = target - leftCount;

  const modes: Mode[] = ['target', 'left', 'right', 'sum'];
  const mode = modes[Math.floor(Math.random() * modes.length)];
  const knownSide: Side = Math.random() < 0.5 ? 'left' : 'right';

  let answer: number;
  if (mode === 'target' || mode === 'sum') answer = target;
  else if (mode === 'left') answer = leftCount;
  else answer = rightCount;

  if (mode === 'target') {
    answer = knownSide === 'left' ? rightCount : leftCount;
  }

  return { mode, target, leftCount, rightCount, knownSide, answer };
}

describe('ExerciseSplitBox question generation', () => {
  const cfg: SplitBoxConfig = { minTarget: 5, maxTarget: 10 };

  it('always keeps leftCount + rightCount === target, within [minTarget, maxTarget]', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(cfg);
      expect(q.leftCount + q.rightCount).toBe(q.target);
      expect(q.target).toBeGreaterThanOrEqual(cfg.minTarget);
      expect(q.target).toBeLessThanOrEqual(cfg.maxTarget);
      expect(q.leftCount).toBeGreaterThanOrEqual(1);
      expect(q.rightCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('sets the answer consistent with the question mode', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(cfg);
      if (q.mode === 'sum') expect(q.answer).toBe(q.target);
      else if (q.mode === 'left') expect(q.answer).toBe(q.leftCount);
      else if (q.mode === 'right') expect(q.answer).toBe(q.rightCount);
      else expect(q.answer).toBe(q.knownSide === 'left' ? q.rightCount : q.leftCount);
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

import { ExerciseSplitBox } from '@/screens/ExerciseSplitBox';

// With Math.random pinned to 0 and difficultyKey '1-1' (minTarget: 3, maxTarget: 6):
// target = 3, leftCount = 1, rightCount = 2, mode = 'target' (modes[0]),
// knownSide = 'left' (0 < 0.5) -> the right side is the unknown/answer slot, answer = rightCount = 2.
const CORRECT_ANSWER = 2;

function getInputButton(): HTMLButtonElement {
  // Only one NumberLabel renders as an interactive "?" button in 'target' mode
  // (the other two equation slots are plain, non-button divs).
  const btn = screen.getAllByRole('button').find((b) => b.querySelector('span')?.textContent === '?');
  if (!btn) throw new Error('No open input button found');
  return btn as HTMLButtonElement;
}

describe('ExerciseSplitBox component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('accepts the correct missing count and celebrates', () => {
    render(<ExerciseSplitBox />);
    fireEvent.click(getInputButton());
    fireEvent.click(screen.getByRole('button', { name: String(CORRECT_ANSWER) }));
    fireEvent.click(screen.getByLabelText('Controleer'));

    expect(triggerConfettiMock).toHaveBeenCalled();
  });

  it('rejects a wrong count and shows the "Bijna!" correction banner', () => {
    render(<ExerciseSplitBox />);
    fireEvent.click(getInputButton());
    fireEvent.click(screen.getByRole('button', { name: String(CORRECT_ANSWER + 3) }));
    fireEvent.click(screen.getByLabelText('Controleer'));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Bijna!')).toBeInTheDocument();
  });

  it('closes the numpad after a correct answer and refuses to reopen it (no accidental re-submit)', () => {
    render(<ExerciseSplitBox />);
    fireEvent.click(getInputButton());
    fireEvent.click(screen.getByRole('button', { name: String(CORRECT_ANSWER) }));
    const checkBtn = screen.getByLabelText('Controleer');
    fireEvent.click(checkBtn);

    expect(triggerConfettiMock).toHaveBeenCalledTimes(1);

    // openNumpad now early-returns while status === 'correct' (matching
    // ExerciseSumSplit's openSlot guard), so re-tapping the answered slot
    // during the 1800ms auto-advance window cannot reopen the numpad and
    // re-fire confetti / double-count progress. Tapping the now-filled slot
    // leaves the numpad hidden (exit opacity stays 0, it does not snap back to
    // 1) and does not trigger a second confetti.
    //
    // We check the exit style rather than awaiting full DOM removal: the
    // correct-answer dot-scale animation in SplitHalf (ExerciseSplitBox.tsx
    // ~348-357) uses a 3-keyframe `scale: [0, 1.25, 1]` with `type: 'spring'`,
    // which this framer-motion version's runtime rejects ("Only two keyframes
    // currently supported with spring and inertia animations"), so waiting for
    // the numpad to actually unmount is flaky.
    const answeredSlot = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('span')?.textContent === String(CORRECT_ANSWER));
    expect(answeredSlot).toBeTruthy();
    fireEvent.click(answeredSlot!);

    expect(checkBtn.style.opacity).toBe('0');
    expect(triggerConfettiMock).toHaveBeenCalledTimes(1);
  });
});
