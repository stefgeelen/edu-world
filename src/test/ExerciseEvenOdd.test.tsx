import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// Question generation is covered in mathQuestionsGrade2.test.ts; this file
// covers the answer flow of the screen.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
let configMock: unknown = null;
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => configMock ?? fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'ex-1' }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
const mutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: mutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.nootje }) };
});
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

import { ExerciseEvenOdd } from '@/screens/ExerciseEvenOdd';

function shownNumber(): number {
  return Number(screen.getByTestId('even-odd-number').textContent);
}

function correctAnswer(): string {
  const prompt = document.body.textContent ?? '';
  const n = shownNumber();
  if (prompt.includes('het dubbel van')) return String(n * 2);
  if (prompt.includes('de helft van')) return String(n / 2);
  return n % 2 === 0 ? 'even' : 'oneven';
}

function button(label: string): HTMLElement {
  const btn = screen.getAllByRole('button').find((b) => b.textContent === label);
  if (!btn) throw new Error(`No button "${label}"`);
  return btn;
}

describe('ExerciseEvenOdd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    configMock = null;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('asks even or odd with two buttons by default', () => {
    render(<ExerciseEvenOdd />);
    expect(screen.getByText('Is dit getal even of oneven?')).toBeInTheDocument();
    expect(button('even')).toBeInTheDocument();
    expect(button('oneven')).toBeInTheDocument();
  });

  it('five right answers finish the exercise through complete_exercise', () => {
    render(<ExerciseEvenOdd />);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(button(correctAnswer()));
      act(() => { vi.advanceTimersByTime(1500); });
    }
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 'ex-1', stars: 3, maxScore: 5 }));
    expect(navigateMock).toHaveBeenCalled();
  });

  it('three wrong answers end the game without paying anything', () => {
    render(<ExerciseEvenOdd />);
    for (let i = 0; i < 3; i++) {
      fireEvent.click(button(correctAnswer() === 'even' ? 'oneven' : 'even'));
      act(() => { vi.advanceTimersByTime(1500); });
    }
    expect(mutateMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalled();
  });

  it('asks doubles and halves with four number options', () => {
    configMock = { maxNumber: 100, kinds: ['double', 'half'] };
    render(<ExerciseEvenOdd />);
    expect(screen.getByText(/Wat is (het dubbel|de helft)\?/)).toBeInTheDocument();
    const answer = correctAnswer();
    const numberButtons = screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent ?? ''));
    expect(numberButtons).toHaveLength(4);
    expect(numberButtons.map((b) => b.textContent)).toContain(answer);
  });
});
