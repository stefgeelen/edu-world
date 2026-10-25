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
// Open tables: the calendar plus what the parent opened (child_times_table_access).
const OPEN = { multiply: [2, 5, 10], divide: [] as number[], extraMultiply: [], extraDivide: [], schedule: [] };
let accessMock: { data?: typeof OPEN; isError: boolean } = { data: OPEN, isError: false };
vi.mock('@/hooks/useTimesTables', () => ({
  useTimesTables: () => ({ data: progressMock }),
  useRecordTimesTableRun: () => ({ mutate: recordMock }),
  useTimesTableAccess: () => accessMock,
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.nootje }) };
});
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
    accessMock = { data: OPEN, isError: false };
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

  function operatorsOfRun(table: number): Set<string> {
    fireEvent.click(screen.getByLabelText(`Tafel van ${table}`));
    const ops = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ops.add(document.querySelector('.text-amber-400')?.textContent ?? '');
      answer(currentAnswer());
      act(() => { vi.advanceTimersByTime(1000); });
    }
    return ops;
  }

  it('mixes in divisions for tables whose deeltafel is open', () => {
    accessMock = { data: { ...OPEN, divide: [5] }, isError: false };
    render(<ExerciseTimesTables />);
    expect(operatorsOfRun(5)).toEqual(new Set(['×', ':']));
  });

  it('asks only divisions when only the deeltafel is open', () => {
    accessMock = { data: { ...OPEN, divide: [4] }, isError: false };
    render(<ExerciseTimesTables />);
    expect(operatorsOfRun(4)).toEqual(new Set([':']));
  });

  it('offers only the open tables, and nothing while they load', () => {
    accessMock = { data: { ...OPEN, multiply: [10, 2] }, isError: false };
    render(<ExerciseTimesTables />);
    expect(screen.getByLabelText('Tafel van 2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Tafel van 5')).not.toBeInTheDocument();
    cleanup();

    accessMock = { data: undefined, isError: false };
    render(<ExerciseTimesTables />);
    expect(screen.queryByLabelText('Tafel van 2')).not.toBeInTheDocument();
  });

  it("falls back to the trimester's tables when the server cannot be reached", () => {
    accessMock = { data: undefined, isError: true };
    configMock = { tables: [3, 4], divisionTables: [] };
    render(<ExerciseTimesTables />);
    expect(screen.getByLabelText('Tafel van 3')).toBeInTheDocument();
    expect(screen.queryByLabelText('Tafel van 2')).not.toBeInTheDocument();
  });
});
