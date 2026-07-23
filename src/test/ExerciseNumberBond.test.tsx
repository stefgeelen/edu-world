import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseNumberBond.tsx) ──────────── */
function generateQuestion(bondConfig: { minTarget: number; maxTarget: number }) {
  const { minTarget, maxTarget } = bondConfig;
  const target = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;
  const known = Math.floor(Math.random() * (target - 1)) + 1;
  return { target, known, answer: target - known };
}

describe('ExerciseNumberBond question generation', () => {
  it('always produces a target within [minTarget, maxTarget]', () => {
    for (let i = 0; i < 200; i++) {
      const { target } = generateQuestion({ minTarget: 3, maxTarget: 6 });
      expect(target).toBeGreaterThanOrEqual(3);
      expect(target).toBeLessThanOrEqual(6);
    }
  });

  it('known is always at least 1 and strictly less than target, so answer is always >= 1', () => {
    for (let i = 0; i < 200; i++) {
      const { target, known, answer } = generateQuestion({ minTarget: 3, maxTarget: 20 });
      expect(known).toBeGreaterThanOrEqual(1);
      expect(known).toBeLessThan(target);
      expect(answer).toBe(target - known);
      expect(answer).toBeGreaterThanOrEqual(1);
    }
  });
});

/* ── Component: numpad-driven correct/incorrect round ─────────────────────── */

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => undefined }));
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: vi.fn() }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

import { ExerciseNumberBond } from '@/screens/ExerciseNumberBond';

// With Math.random mocked to 0 and NUMBER_BOND_CONFIG['1-1'] = {minTarget:3,
// maxTarget:6}: target = floor(0*(6-3+1))+3 = 3, known = floor(0*(3-1))+1 = 1,
// answer = target - known = 2.
function openNumpad() {
  fireEvent.click(screen.getByText('?').closest('button')!);
}
function digitButton(n: number | string): HTMLElement {
  const label = String(n);
  const btn = screen.getAllByRole('button').find((b) => b.textContent === label);
  if (!btn) throw new Error(`No digit button found for "${label}"`);
  return btn;
}
function checkButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Controleer' });
}
// The mystery/answer circle is the only button with this class (numpad keys
// use rounded-2xl, not rounded-full/transform-gpu), so it's a stable target
// regardless of what digit it currently displays — unlike getByText(digit),
// which becomes ambiguous once the same digit appears on both the mystery
// button and a numpad key at once.
function mysteryButton(): HTMLElement {
  return document.querySelector('button.transform-gpu') as HTMLElement;
}

describe('ExerciseNumberBond component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('accepts the correct sum (known + answer = target) and celebrates with confetti', () => {
    render(<ExerciseNumberBond />);
    openNumpad();
    fireEvent.click(digitButton(2)); // the only "2" button at this point is the numpad key
    fireEvent.click(checkButton());

    expect(triggerConfettiMock).toHaveBeenCalled();
    // The mystery circle now displays the submitted (correct) answer.
    expect(mysteryButton().className).toMatch(/emerald/);
  });

  it('rejects a wrong sum and shows the "Bijna!" correction banner', () => {
    render(<ExerciseNumberBond />);
    openNumpad();
    fireEvent.click(digitButton(9));
    fireEvent.click(checkButton());

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Bijna!')).toBeInTheDocument();
  });

  it('typing a new digit after a wrong answer clears the mistake and starts fresh', () => {
    render(<ExerciseNumberBond />);
    openNumpad();
    fireEvent.click(digitButton(9));
    fireEvent.click(checkButton());
    expect(screen.getByText('Bijna!')).toBeInTheDocument();

    // handleNumberClick resets status -> 'idle' and replaces inputValue when
    // a digit is tapped while status is 'incorrect' (mystery shows '9', so
    // the numpad's own "2" key is still unambiguous here).
    // Note: the "Bijna!" tooltip itself is wrapped in framer-motion's
    // AnimatePresence, which keeps it mounted through its (never-completing,
    // under jsdom) exit transition, so its absence can't be asserted
    // reliably here — the mystery button's own class (updated synchronously,
    // no animation-exit gate) is used instead to confirm the status flip.
    fireEvent.click(digitButton(2));

    expect(mysteryButton().className).toMatch(/purple/);
    expect(mysteryButton().className).not.toMatch(/orange/);
  });
});
