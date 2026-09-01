import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// jsdom (v20, used by this project) has no global PointerEvent constructor.
// @testing-library's fireEvent.pointerDown() silently falls back to a bare
// Event without clientX/clientY in that case. ExerciseDotCount only needs the
// *count* of taps (the resulting x/y percentages are clamped from NaN and
// never asserted on here), but dispatching a real MouseEvent typed
// "pointerdown" keeps this in line with the convention used for the other
// pointer-driven exercise screens.
function firePointerDown(el: Element, clientX = 10, clientY = 10) {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { clientX, clientY, bubbles: true, cancelable: true }));
  });
}

/* ── Copied pure logic (not exported by ExerciseDotCount.tsx) ─────────────── */
function getRandomTarget(minDots: number, maxDots: number): number {
  return Math.floor(Math.random() * (maxDots - minDots + 1)) + minDots;
}

describe('ExerciseDotCount target generation', () => {
  it('never generates a target outside [minDots, maxDots]', () => {
    for (let i = 0; i < 200; i++) {
      const target = getRandomTarget(1, 6);
      expect(target).toBeGreaterThanOrEqual(1);
      expect(target).toBeLessThanOrEqual(6);
    }
  });

  it('with min === max always returns that single value', () => {
    for (let i = 0; i < 20; i++) {
      expect(getRandomTarget(4, 4)).toBe(4);
    }
  });
});

/* ── Component: tap-to-place-dots correct/incorrect round ─────────────────── */

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

import { ExerciseDotCount } from '@/screens/ExerciseDotCount';

// With Math.random mocked to 0 and DOT_COUNT_CONFIG['1-1'] = {minDots:1,
// maxDots:6}: target = floor(0*(6-1+1))+1 = 1.
function getDropArea(): HTMLElement {
  return document.querySelector('[class*="cursor-crosshair"]') as HTMLElement;
}
function checkButton(): HTMLElement {
  return screen.getByText('Controleer').closest('button')!;
}

describe('ExerciseDotCount component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('placing exactly the target number of dots and confirming celebrates with confetti', () => {
    render(<ExerciseDotCount />);
    const area = getDropArea();
    firePointerDown(area); // target is 1, so a single tap is exact

    fireEvent.click(checkButton());

    expect(triggerConfettiMock).toHaveBeenCalledWith('medium');
    expect(screen.getByText(/Super goed! Precies 1 stip!/)).toBeInTheDocument();
  });

  it('placing too many dots shows the "Oeps!" correction and does not celebrate', () => {
    render(<ExerciseDotCount />);
    const area = getDropArea();
    firePointerDown(area);
    firePointerDown(area); // 2 dots placed, target is 1 -> too many

    fireEvent.click(checkButton());

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Oeps! Je hebt 2 stippen/)).toBeInTheDocument();
  });

  it('locks in the answer: once correct, further taps and confirms are no-ops', () => {
    render(<ExerciseDotCount />);
    const area = getDropArea();
    firePointerDown(area);
    fireEvent.click(checkButton());
    expect(triggerConfettiMock).toHaveBeenCalledTimes(1);

    // addDotAt and handleConfirm both guard on `status !== 'idle'`.
    firePointerDown(area);
    fireEvent.click(checkButton());

    expect(triggerConfettiMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Super goed! Precies 1 stip!/)).toBeInTheDocument();
  });
});
