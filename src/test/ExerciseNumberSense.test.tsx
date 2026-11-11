import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';

// Question generation is covered in numberSense.test.ts; this file covers the
// picker and the answer flow of each kind.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'ex-number-sense' }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
const completeMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeMock }),
  useCurrentChild: () => ({ data: { id: 'child-1', grade: 2 } }),
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
const speakMock = vi.fn((_text: string) => Promise.resolve());
vi.mock('@/hooks/useSpeech', () => ({
  speakText: (t: string) => speakMock(t),
  stopSpeaking: vi.fn(),
  useSpeech: () => ({ speak: vi.fn(), speakLines: vi.fn(), stopSpeaking: vi.fn() }),
}));
vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.nootje }) };
});
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

import { ExerciseNumberSense } from '@/screens/ExerciseNumberSense';
import { dutchNumberWord } from '@/lib/numberSense';

// jsdom has no PointerEvent: fireEvent.pointerDown would drop clientX/Y.
// Same MouseEvent workaround as ExerciseClock.test.tsx.
function firePointer(el: Element, type: 'pointerdown' | 'pointerup', clientX = 0, clientY = 0) {
  act(() => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY })); });
}

function pick(title: string) {
  fireEvent.click(screen.getByText(title).closest('button')!);
}

function numpad() {
  return within(screen.getByLabelText('Verberg numpad').parentElement!.parentElement as HTMLElement);
}

function type(n: number | string) {
  for (const digit of String(n)) fireEvent.click(numpad().getByRole('button', { name: digit }));
}

function check() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Controleer' }).at(-1)!);
}

function next() {
  act(() => { vi.advanceTimersByTime(1000); });
}

/** The number on the honderdveld square that holds the picture. */
function thingNumber(): number {
  return Number(screen.getByTestId('grid-thing').closest('[data-cell]')!.getAttribute('data-cell'));
}

describe('ExerciseNumberSense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('opens with a choice of the five kinds and "Door elkaar"', () => {
    render(<ExerciseNumberSense />);
    expect(screen.getByText('Wat wil je oefenen?')).toBeInTheDocument();
    for (const title of ['Honderdveld', 'Luister', 'Groepjes van 10', 'H T E', 'Kleur het getal', 'Door elkaar']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('Honderdveld: six right numbers pay through complete_exercise', () => {
    render(<ExerciseNumberSense />);
    pick('Honderdveld');
    for (let i = 0; i < 6; i++) {
      type(thingNumber());
      check();
      next();
    }
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 'ex-number-sense', score: 6, maxScore: 6, stars: 3 }));
    expect(navigateMock).toHaveBeenCalled();
  });

  it('Honderdveld: a wrong number costs a heart and says Bijna!', () => {
    render(<ExerciseNumberSense />);
    pick('Honderdveld');
    const right = thingNumber();
    type(right === 1 ? 2 : 1);
    check();
    expect(screen.getByText('Bijna!')).toBeInTheDocument();
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('Luister: says the number in words, and the typed number is checked', () => {
    render(<ExerciseNumberSense />);
    pick('Luister');
    act(() => { vi.advanceTimersByTime(500); });
    expect(speakMock).toHaveBeenCalledTimes(1);
    const word = speakMock.mock.calls[0][0];
    let said = 0;
    for (let n = 11; n <= 100; n++) if (dutchNumberWord(n) === word) said = n;
    expect(said).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText('Luister naar het getal'));
    expect(speakMock).toHaveBeenLastCalledWith(word);
    type(said);
    check();
    expect(screen.queryByText('Bijna!')).not.toBeInTheDocument();
  });

  it('H T E: the rods and blocks make the number', () => {
    render(<ExerciseNumberSense />);
    pick('H T E');
    const tens = screen.getByTestId('tens-rods').children.length;
    const ones = screen.queryByTestId('ones-blocks')?.children.length ?? 0;
    type(tens * 10 + ones);
    check();
    next();
    expect(screen.getByTestId('number-sense-question')).toBeInTheDocument();
    expect(screen.queryByText('Bijna!')).not.toBeInTheDocument();
  });

  it('Groepjes van 10: T and E open only after grouping, then both are checked', () => {
    render(<ExerciseNumberSense />);
    pick('Groepjes van 10');
    const dots = () => screen.queryAllByRole('button', { name: /^Stip$/ });
    const total = dots().length;
    expect(screen.getByLabelText('Tientallen')).toBeDisabled();

    // Ten taps make one group; tapping a grouped dot undoes it.
    for (const dot of dots().slice(0, 10)) fireEvent.pointerDown(dot);
    expect(screen.getAllByRole('button', { name: 'Stip in groepje 1' })).toHaveLength(10);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Stip in groepje 1' })[0]);
    expect(dots()).toHaveLength(total);

    while (dots().length >= 10) {
      for (const dot of dots().slice(0, 10)) fireEvent.pointerDown(dot);
    }
    expect(screen.getByText('Hoeveel tientallen (T) en eenheden (E)?')).toBeInTheDocument();
    expect(screen.getByLabelText('Tientallen')).not.toBeDisabled();

    type(Math.floor(total / 10));
    type(total % 10);
    check();
    expect(screen.queryByText('Bijna!')).not.toBeInTheDocument();
  });

  it('Kleur het getal: tapping a square colours up to it, row by row', () => {
    render(<ExerciseNumberSense />);
    pick('Kleur het getal');
    const target = Number(screen.getByTestId('color-target').textContent);
    const grid = screen.getByTestId('hundred-grid');
    grid.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    const tapCell = (n: number) => {
      const row = Math.floor((n - 1) / 10);
      const col = (n - 1) % 10;
      firePointer(grid, 'pointerdown', col * 10 + 5, row * 10 + 5);
      firePointer(grid, 'pointerup');
    };

    tapCell(target);
    expect(grid.querySelectorAll('[data-painted]')).toHaveLength(target);
    // Tapping the last coloured square takes it off again.
    tapCell(target);
    expect(grid.querySelectorAll('[data-painted]')).toHaveLength(target - 1);
    check();
    expect(screen.getByText('Bijna!')).toBeInTheDocument();

    tapCell(target);
    check();
    // Right: the grid turns green (Bijna! is still fading out).
    expect(grid.className).toContain('border-emerald-400');
  });
});
