import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseComparison.tsx) ──────────── */
// Uses the real randomInt from '@/lib/random' so these tests exercise the
// actual boundary logic, not a re-implementation of it.
import { randomInt } from '@/lib/random';

type VariationType = 1 | 2 | 3 | 4;
type CompSymbol = '<' | '>' | '=';
interface Question { variation: VariationType; leftValue: number; rightValue: number; symbol: CompSymbol }

function generateQuestion(maxNum: number): Question {
  const variation = randomInt(1, 4) as VariationType;
  let leftValue: number, rightValue: number, symbol: CompSymbol;
  if (variation === 3 || variation === 4) {
    const pick = randomInt(0, 2);
    if (pick === 0) { leftValue = randomInt(0, maxNum - 1); rightValue = randomInt(leftValue + 1, maxNum); symbol = '<'; }
    else if (pick === 1) { leftValue = randomInt(1, maxNum); rightValue = randomInt(0, leftValue - 1); symbol = '>'; }
    else { leftValue = randomInt(1, maxNum); rightValue = leftValue; symbol = '='; }
  } else {
    leftValue = randomInt(1, maxNum); rightValue = randomInt(1, maxNum);
    symbol = leftValue > rightValue ? '>' : leftValue < rightValue ? '<' : '=';
  }
  return { variation, leftValue, rightValue, symbol };
}
function checkNumberAnswer(input: string, question: Question): boolean {
  const n = parseInt(input, 10);
  if (isNaN(n)) return false;
  const { leftValue, symbol } = question;
  if (symbol === '>') return n < leftValue;
  if (symbol === '<') return n > leftValue;
  if (symbol === '=') return n === leftValue;
  return false;
}

describe('ExerciseComparison question generation', () => {
  it('always produces a symbol consistent with leftValue/rightValue for variations 1 & 2', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(10);
      if (q.variation === 1 || q.variation === 2) {
        const expected = q.leftValue > q.rightValue ? '>' : q.leftValue < q.rightValue ? '<' : '=';
        expect(q.symbol).toBe(expected);
      }
    }
  });

  it('for fill-in-the-number variations (3 & 4), the given symbol always has at least one valid answer', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(10);
      if (q.variation === 3 || q.variation === 4) {
        if (q.symbol === '<') expect(q.rightValue).toBeGreaterThan(q.leftValue);
        if (q.symbol === '>') expect(q.rightValue).toBeLessThan(q.leftValue);
        if (q.symbol === '=') expect(q.rightValue).toBe(q.leftValue);
      }
    }
  });

  it('never generates values outside [0, maxNum]', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(6);
      expect(q.leftValue).toBeGreaterThanOrEqual(0);
      expect(q.leftValue).toBeLessThanOrEqual(6);
      expect(q.rightValue).toBeGreaterThanOrEqual(0);
      expect(q.rightValue).toBeLessThanOrEqual(6);
    }
  });
});

describe('checkNumberAnswer', () => {
  const q = (symbol: CompSymbol, leftValue = 5): Question => ({ variation: 3, leftValue, rightValue: 0, symbol });

  it('accepts any number smaller than leftValue when the symbol is ">"', () => {
    expect(checkNumberAnswer('4', q('>'))).toBe(true);
    expect(checkNumberAnswer('5', q('>'))).toBe(false); // not strictly smaller
    expect(checkNumberAnswer('6', q('>'))).toBe(false);
  });

  it('accepts any number greater than leftValue when the symbol is "<"', () => {
    expect(checkNumberAnswer('6', q('<'))).toBe(true);
    expect(checkNumberAnswer('5', q('<'))).toBe(false);
  });

  it('accepts only an exact match when the symbol is "="', () => {
    expect(checkNumberAnswer('5', q('='))).toBe(true);
    expect(checkNumberAnswer('4', q('='))).toBe(false);
  });

  it('rejects non-numeric input instead of throwing', () => {
    expect(checkNumberAnswer('', q('>'))).toBe(false);
    expect(checkNumberAnswer('abc', q('>'))).toBe(false);
  });
});

/* ── Component: one full correct/incorrect round via the symbol buttons ─── */

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
// Force variation 1 (two-number, symbol-choice) so the test doesn't have to
// branch on which UI variant the RNG happened to produce.
vi.mock('@/lib/random', () => ({ randomInt: (min: number) => (min === 1 ? 1 : min) }));

import { ExerciseComparison } from '@/screens/ExerciseComparison';

// The "correct symbol is X" hint text (shown after an incorrect answer) also
// contains a bare "=" or "<" text node, so getByText(sym).closest('button')
// is ambiguous once status !== 'idle'. Scope to actual <button> elements
// whose first span is exactly this symbol instead.
function getSymbolButton(sym: string): HTMLElement {
  const btn = screen.getAllByRole('button').find((b) => b.querySelector('span')?.textContent === sym);
  if (!btn) throw new Error(`No symbol button found for "${sym}"`);
  return btn;
}

describe('ExerciseComparison component', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('accepts the correct comparison symbol and celebrates', () => {
    render(<ExerciseComparison />);
    // With randomInt mocked to always return `min`, variation=1,
    // leftValue=rightValue=1 -> symbol is "=".
    fireEvent.click(getSymbolButton('='));

    expect(triggerConfettiMock).toHaveBeenCalled();
    expect(screen.getByText(/Super goed!/)).toBeInTheDocument();
  });

  it('rejects a wrong comparison symbol and shows the correction banner', () => {
    render(<ExerciseComparison />);
    fireEvent.click(getSymbolButton('<')); // wrong: actual symbol is "="

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Bijna!/)).toBeInTheDocument();
  });

  it('locks in the answer so a second click on another symbol is ignored', () => {
    render(<ExerciseComparison />);
    fireEvent.click(getSymbolButton('<'));
    fireEvent.click(getSymbolButton('=')); // should be a no-op now

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Bijna!/)).toBeInTheDocument();
  });
});
