import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import type { TableProgress } from '@/hooks/useTimesTables';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
let configMock: unknown = null;
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => configMock ?? fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'ex-tables' }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
const completeMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeMock }),
  useCurrentChild: () => ({ data: { id: 'child-1', grade: 2 } }),
}));
let progressMock: Record<number, TableProgress> = {};
const recordMock = vi.fn();
vi.mock('@/hooks/useTimesTables', () => ({
  useTimesTables: () => ({ data: progressMock }),
  useRecordTimesTableRun: () => ({ mutate: recordMock }),
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

import { ExerciseTimesTables } from '@/screens/ExerciseTimesTables';

function currentAnswer(): number {
  const num1 = Number(document.querySelector('.text-cyan-400')?.textContent);
  const op = document.querySelector('.text-amber-400')?.textContent;
  const num2 = Number(document.querySelector('.text-emerald-400')?.textContent);
  return op === '×' ? num1 * num2 : num1 / num2;
}

function numpad() {
  return within(screen.getByLabelText('Verberg numpad').parentElement!.parentElement as HTMLElement);
}

function answer(n: number) {
  for (const digit of String(n)) fireEvent.click(numpad().getByRole('button', { name: digit }));
  fireEvent.click(screen.getByLabelText('Controleer'));
}

describe('ExerciseTimesTables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    configMock = null;
    progressMock = {};
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('lets the child pick one of the open tables, with a sticker on known ones', () => {
    progressMock = { 5: { table: 5, runs: 4, flawlessRuns: 3, sticker: true } };
    render(<ExerciseTimesTables />);
    expect(screen.getByText('Welke tafel oefen je?')).toBeInTheDocument();
    expect(screen.getByLabelText('Tafel van 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Tafel van 5, die ken je!')).toBeInTheDocument();
    expect(screen.getByLabelText('Tafel van 10')).toBeInTheDocument();
    expect(screen.getByTestId('sticker-5')).toBeInTheDocument();
    expect(screen.queryByTestId('sticker-2')).not.toBeInTheDocument();
  });

  it('asks only that table, and a run of 10 pays through complete_exercise and saves the run', () => {
    render(<ExerciseTimesTables />);
    fireEvent.click(screen.getByLabelText('Tafel van 5'));
    expect(screen.getByText('De tafel van 5')).toBeInTheDocument();

    for (let i = 0; i < 10; i++) {
      expect(document.querySelector('.text-emerald-400')?.textContent).toBe('5');
      answer(currentAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }

    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 'ex-tables', stars: 3 }));
    expect(recordMock).toHaveBeenCalledWith({ table: 5, mistakes: 0 });
    expect(navigateMock).toHaveBeenCalled();
  });

  it('a mistake costs a heart and is saved with the run', () => {
    render(<ExerciseTimesTables />);
    fireEvent.click(screen.getByLabelText('Tafel van 2'));
    answer(currentAnswer() + 1);
    expect(screen.getByText('Bijna!')).toBeInTheDocument();

    for (let i = 0; i < 10; i++) {
      answer(currentAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({ stars: 2 }));
    expect(recordMock).toHaveBeenCalledWith({ table: 2, mistakes: 1 });
  });

  it('three mistakes end the run without paying or saving it', () => {
    render(<ExerciseTimesTables />);
    fireEvent.click(screen.getByLabelText('Tafel van 10'));
    for (let i = 0; i < 3; i++) {
      // Typing again after a wrong answer starts a new try.
      answer(currentAnswer() + 1);
    }
    act(() => { vi.advanceTimersByTime(1500); });
    expect(completeMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalled();
  });

  it('the third run without a mistake shows the new sticker', () => {
    progressMock = { 10: { table: 10, runs: 2, flawlessRuns: 2, sticker: false } };
    render(<ExerciseTimesTables />);
    fireEvent.click(screen.getByLabelText('Tafel van 10'));
    for (let i = 0; i < 10; i++) {
      answer(currentAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }
    expect(screen.getByText('Je kent de tafel van 10!')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(navigateMock).toHaveBeenCalled();
  });

  it('mixes in divisions for tables that have them', () => {
    configMock = { tables: [2, 5, 10], divisionTables: [5] };
    render(<ExerciseTimesTables />);
    fireEvent.click(screen.getByLabelText('Tafel van 5'));
    const ops = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ops.add(document.querySelector('.text-amber-400')?.textContent ?? '');
      answer(currentAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }
    expect(ops).toEqual(new Set(['×', ':']));
  });
});
