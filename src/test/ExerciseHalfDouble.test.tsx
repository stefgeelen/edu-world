import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';

// Question generation is covered in halfDouble.test.ts; this file covers the
// in-between screen and the answer flow.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
let configMock: unknown = null;
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => configMock ?? fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'ex-half' }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
const completeMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeMock }),
  useCurrentChild: () => ({ data: { id: 'child-1', grade: 2 } }),
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.nootje }) };
});
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

import { ExerciseHalfDouble } from '@/screens/ExerciseHalfDouble';

function shown(): { kind: 'half' | 'double'; number: number } {
  const number = Number(screen.getByTestId('half-double-number').textContent);
  return { kind: screen.queryByText('De helft van') ? 'half' : 'double', number };
}

function correctAnswer(): number {
  const q = shown();
  return q.kind === 'half' ? q.number / 2 : q.number * 2;
}

function answer(n: number) {
  const numpad = within(screen.getByLabelText('Verberg numpad').parentElement!.parentElement as HTMLElement);
  for (const digit of String(n)) fireEvent.click(numpad.getByRole('button', { name: digit }));
  fireEvent.click(screen.getByLabelText('Controleer'));
}

function pick(title: string) {
  fireEvent.click(screen.getByText(title).closest('button')!);
}

describe('ExerciseHalfDouble', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    configMock = null;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('opens with a choice: halves, doubles or both', () => {
    render(<ExerciseHalfDouble />);
    expect(screen.getByText('Wat wil je oefenen?')).toBeInTheDocument();
    expect(screen.getByText('De helft')).toBeInTheDocument();
    expect(screen.getByText('Het dubbel')).toBeInTheDocument();
    expect(screen.getByText('Door elkaar')).toBeInTheDocument();
    expect(screen.queryByTestId('half-double-number')).not.toBeInTheDocument();
  });

  it('"De helft" asks only halves, and six right answers pay through complete_exercise', () => {
    render(<ExerciseHalfDouble />);
    pick('De helft');
    let pictures = 0;
    for (let i = 0; i < 6; i++) {
      expect(shown().kind).toBe('half');
      if (screen.queryByTestId('count-picture')) {
        pictures += 1;
        expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(new RegExp(`^${shown().number} `));
      }
      answer(correctAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }
    expect(pictures).toBe(3);
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 'ex-half', stars: 3, maxScore: 6 }));
    expect(navigateMock).toHaveBeenCalled();
  });

  it('"Door elkaar" mixes halves and doubles', () => {
    render(<ExerciseHalfDouble />);
    pick('Door elkaar');
    const kinds = new Set<string>();
    for (let i = 0; i < 6; i++) {
      kinds.add(shown().kind);
      answer(correctAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }
    expect(kinds).toEqual(new Set(['half', 'double']));
  });

  it('a mistake costs a heart; three end the run without paying', () => {
    render(<ExerciseHalfDouble />);
    pick('Het dubbel');
    answer(correctAnswer() + 1);
    expect(screen.getByText('Bijna!')).toBeInTheDocument();
    answer(correctAnswer() + 1);
    answer(correctAnswer() + 1);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(completeMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalled();
  });

  it('uses the trimester limit from the config', () => {
    configMock = { maxNumber: 100 };
    render(<ExerciseHalfDouble />);
    pick('Het dubbel');
    for (let i = 0; i < 6; i++) {
      expect(correctAnswer()).toBeLessThanOrEqual(100);
      answer(correctAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }
    expect(completeMock).toHaveBeenCalled();
  });
});
