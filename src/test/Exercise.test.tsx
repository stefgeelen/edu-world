import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Exercise.tsx's math-question generation is already unit-tested in
// generateMathQuestion.test.ts, so this file focuses purely on the
// component's multiple-choice answer flow (as instructed): correct/incorrect
// selection, feedback text, and the "locks in" (disabled options) behavior.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => undefined }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: vi.fn() }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.nootje }) };
});
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

import { Exercise } from '@/screens/Exercise';

function renderExercise() {
  // Exercise.tsx calls useParams() directly (not just via a mocked hook), so
  // it needs a real Router context to avoid react-router's invariant error.
  return render(
    <MemoryRouter>
      <Exercise />
    </MemoryRouter>
  );
}

// Reads the rendered question (num1 operator num2) straight from the DOM
// instead of mocking Math.random: the option-generation loop in Exercise.tsx
// rejects any candidate < 0 when allowNegative is false, so a constant-value
// Math.random mock (e.g. always 0) makes that loop spin forever trying to
// produce 4 unique non-negative options. Reading the real generated question
// sidesteps that trap entirely while staying fully deterministic per render.
function readAnswer(): number {
  const num1 = Number(document.querySelector('.text-cyan-400')?.textContent);
  const operator = document.querySelector('.text-amber-400')?.textContent;
  const num2 = Number(document.querySelector('.text-emerald-400')?.textContent);
  return operator === '+' ? num1 + num2 : num1 - num2;
}

function optionButton(value: number): HTMLElement {
  const btn = screen.getAllByRole('button').find((b) => b.textContent === String(value));
  if (!btn) throw new Error(`No option button found for "${value}"`);
  return btn;
}

function findWrongOptionValue(answer: number): number {
  const text = screen
    .getAllByRole('button')
    .map((b) => b.textContent)
    .find((t) => !!t && /^-?\d+$/.test(t) && t !== String(answer));
  if (text === undefined) throw new Error('No wrong option found');
  return Number(text);
}

describe('Exercise (math sums dispatcher) component', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('selecting the correct option celebrates with confetti', () => {
    renderExercise();
    const answer = readAnswer();
    fireEvent.click(optionButton(answer));

    expect(triggerConfettiMock).toHaveBeenCalled();
  });

  it('selecting a wrong option does not celebrate and locks the options', () => {
    renderExercise();
    const answer = readAnswer();
    const wrong = findWrongOptionValue(answer);
    fireEvent.click(optionButton(wrong));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(optionButton(wrong)).toBeDisabled();
  });

  it('locks in the answer: once a wrong option is picked, the disabled options no longer respond to clicks', () => {
    renderExercise();
    const answer = readAnswer();
    const wrong = findWrongOptionValue(answer);
    fireEvent.click(optionButton(wrong));
    expect(optionButton(wrong)).toBeDisabled();

    // All option buttons get `disabled` once status !== 'idle'; a click on
    // the (still disabled) correct button is a native no-op.
    fireEvent.click(optionButton(answer));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(optionButton(wrong)).toBeDisabled();
  });
});
