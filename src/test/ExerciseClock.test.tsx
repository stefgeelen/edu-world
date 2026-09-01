import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// jsdom (v20, used by this project) does not implement a global PointerEvent
// constructor. @testing-library's fireEvent.pointerDown() silently falls back
// to a bare Event without clientX/clientY in that case, which turns the
// component's angle math into NaN instead of throwing — a fireEvent call
// that looks correct but produces garbage. Dispatching a real MouseEvent
// typed "pointerdown" (which does carry clientX/clientY, and which React's
// synthetic event system accepts since it dispatches on event.type, not the
// constructor) sidesteps that gap.
function firePointerDown(el: Element, clientX: number, clientY: number) {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { clientX, clientY, bubbles: true, cancelable: true }));
  });
}

// ExerciseClock is one of CLAUDE.md's flagged high-risk files: "Pointer drag,
// potential missing listener cleanup". Two things are worth pinning:
//   1. The pure angle/time math that decides right vs. wrong (copied out of
//      the component, same convention as generateMathQuestion.test.ts, since
//      none of it is exported).
//   2. That the component-level `document.addEventListener('pointermove'/
//      'pointerup', ...)` pair set up for drag-outside-the-SVG support is
//      actually removed on unmount.
// A full drag-and-drop simulation is deliberately avoided — jsdom's pointer
// event + layout support is too thin to make that reliable — but one
// end-to-end "answer correctly" pass is included using the fact that jsdom's
// default (0,0,0,0) getBoundingClientRect makes the pointer-to-angle math
// fully predictable without needing to mock layout.

/* ── Copied pure logic (not exported by ExerciseClock.tsx) ──────────────── */
function generateTask(allowHalf = true) {
  const hour = Math.floor(Math.random() * 12) + 1;
  const half = allowHalf && Math.random() < 0.5;
  const hourNames = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf'];
  if (half) {
    const nextHour = hour === 12 ? 1 : hour + 1;
    return { hour, half, label: `Het is half ${hourNames[nextHour]}`, digital: `${hour}:30` };
  }
  return { hour, half, label: `Het is ${hourNames[hour]} uur`, digital: `${hour}:00` };
}
function expectedHourAngle(hour: number, half: boolean): number {
  return (hour % 12) * 30 + (half ? 15 : 0);
}
function expectedMinuteAngle(half: boolean): number {
  return half ? 180 : 0;
}
function snapHour(angle: number): number {
  return Math.round(angle / 15) * 15;
}
function snapMinute(angle: number): number {
  return (Math.round((((angle % 360) + 360) % 360) / 30) * 30) % 360;
}
function norm(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

describe('ExerciseClock time-checking math', () => {
  it('a whole hour expects the minute hand at 0deg and the hour hand at hour*30deg', () => {
    expect(expectedHourAngle(3, false)).toBe(90);
    expect(expectedMinuteAngle(false)).toBe(0);
  });

  it('a half hour expects the minute hand at 180deg and the hour hand offset by 15deg', () => {
    expect(expectedHourAngle(3, true)).toBe(105);
    expect(expectedMinuteAngle(true)).toBe(180);
  });

  it('hour 12 wraps to 0deg (12 o\'clock is angle 0, not 360)', () => {
    expect(expectedHourAngle(12, false)).toBe(0);
  });

  it('snapHour rounds to the nearest 15deg (hour + half-hour tick positions)', () => {
    expect(snapHour(89)).toBe(90);
    expect(snapHour(82)).toBe(75);
  });

  it('snapMinute rounds to the nearest 30deg (each number position) and wraps at 360', () => {
    expect(snapMinute(14)).toBe(0);
    expect(snapMinute(346)).toBe(0); // wraps back to 0, not 360
  });

  it('norm always returns a value in [0, 360)', () => {
    expect(norm(-30)).toBe(330);
    expect(norm(720 + 45)).toBe(45);
  });

  it('generateTask never produces half-hour tasks when the difficulty config disallows them', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1); // would be "half" if allowed
    for (let i = 0; i < 20; i++) {
      expect(generateTask(false).half).toBe(false);
    }
    randomSpy.mockRestore();
  });

  it('generateTask produces an hour between 1 and 12 inclusive', () => {
    for (let i = 0; i < 50; i++) {
      const { hour } = generateTask(true);
      expect(hour).toBeGreaterThanOrEqual(1);
      expect(hour).toBeLessThanOrEqual(12);
    }
  });
});

/* ── Component: listener cleanup + one end-to-end pass ───────────────────── */

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/hooks/useDifficultyLevel', () => ({
  useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }), // DEFAULT_CLOCK-equivalent: halfHours=false
}));
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => undefined }));
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: vi.fn() }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));

// ExerciseShell (rendered by every exercise screen) calls useBuddyMessage(),
// which needs GameProvider — mock it directly rather than wrapping every
// exercise test in a full game/auth provider tree just to satisfy that call.
vi.mock('@/hooks/useBuddyMessage', () => ({
  useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }),
}));

import { ExerciseClock } from '@/screens/ExerciseClock';

describe('ExerciseClock component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('registers document-level pointermove/pointerup listeners on mount and removes them on unmount', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(<ExerciseClock />);

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: false });
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    const [, pointerMoveHandler] = addSpy.mock.calls.find((c) => c[0] === 'pointermove')!;
    const [, pointerUpHandler] = addSpy.mock.calls.find((c) => c[0] === 'pointerup')!;

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('pointermove', pointerMoveHandler);
    expect(removeSpy).toHaveBeenCalledWith('pointerup', pointerUpHandler);
  });

  it('accepts a correctly-set whole hour (hour hand at 30deg, minute hand at 0deg) as correct', () => {
    // With halfHours=false and Math.random() mocked to 0, generateTask(false)
    // deterministically produces hour=1 ("Het is een uur"): expectedHourAngle
    // = 30deg, expectedMinuteAngle = 0deg.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<ExerciseClock />);
    expect(screen.getByText('1:00')).toBeInTheDocument();

    // Note: ExerciseShell also renders several lucide-react icon <svg>s (the
    // close button, hearts, ...), so a plain `querySelector('svg')` would
    // grab the wrong one — the clock face is the only svg with this viewBox.
    const svg = document.querySelector('svg[viewBox="0 0 200 200"]')!;

    // jsdom's default getBoundingClientRect is {left:0, top:0, width:0,
    // height:0}, so the clock center is (0,0) and clientX/clientY map
    // directly onto the dx/dy used by getAngleFromPointer. These points are
    // chosen so atan2(dy,dx)+90 lands on 30deg (hour) and 0deg (minute).
    firePointerDown(svg, 50, -86.6); // sets hour hand to ~30deg

    fireEvent.click(screen.getByText('Lange wijzer 🔵'));
    firePointerDown(svg, 0, -100); // sets minute hand to 0deg

    fireEvent.click(screen.getByText('Klok nakijken ⏰'));

    expect(triggerConfettiMock).toHaveBeenCalled();
  });

  it('rejects a wrong hand position as incorrect and shows a hint', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<ExerciseClock />);

    // Leave both hands at their initial 0deg/0deg (correct for minute, wrong
    // for hour which should be at 30deg) — do not touch the hour hand at all.
    fireEvent.click(screen.getByText('Klok nakijken ⏰'));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Kijk goed/)).toBeInTheDocument();
  });
});
