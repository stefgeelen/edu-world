import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// ExerciseWriteNumber is CLAUDE.md's other flagged high-risk file: "Canvas +
// edge function + complex state machine". Unlike ExerciseClock, drawing here
// is wired with plain canvas.addEventListener('mousedown'/'mousemove'/...)
// calls rather than React pointer props, which sidesteps jsdom's missing
// PointerEvent constructor (fireEvent.mouseDown/mouseMove work natively) but
// means the listener cleanup has to be checked directly on the canvas node.
// Real timers are used throughout (rather than fake timers) because
// handleConfirm awaits the mocked supabase.functions.invoke() call before its
// setTimeout fires, and mixing fake timers with unflushed microtasks is a
// common source of flaky tests.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'ex-write-number' }));
const mutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: mutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({
  useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }),
}));

const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { ExerciseWriteNumber } from '@/screens/ExerciseWriteNumber';

const fakeCtx = {
  beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), clearRect: vi.fn(), set fillStyle(_v: string) {}, set strokeStyle(_v: string) {},
  set lineWidth(_v: number) {}, set lineCap(_v: string) {}, set lineJoin(_v: string) {},
};

function draw(canvas: HTMLCanvasElement) {
  fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
  fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
  fireEvent.mouseUp(canvas);
}

function getCanvas() {
  return document.querySelector('canvas') as HTMLCanvasElement;
}

describe('ExerciseWriteNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0); // deterministic target: floor(0*10)+1 = 1
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,FAKE');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('registers all 7 canvas draw listeners on mount and removes the same handlers on unmount', () => {
    const addSpy = vi.spyOn(HTMLCanvasElement.prototype, 'addEventListener');
    const removeSpy = vi.spyOn(HTMLCanvasElement.prototype, 'removeEventListener');

    const { unmount } = render(<ExerciseWriteNumber />);

    const addedTypes = addSpy.mock.calls.map((c) => c[0]).sort();
    expect(addedTypes).toEqual(
      ['mousedown', 'mousemove', 'mouseup', 'mouseleave', 'touchstart', 'touchmove', 'touchend'].sort()
    );

    unmount();

    const removedTypes = removeSpy.mock.calls.map((c) => c[0]).sort();
    expect(removedTypes).toEqual(addedTypes);
    // Every add must have a matching remove of the *same* handler reference.
    for (const [type, handler] of addSpy.mock.calls as [string, EventListener][]) {
      expect(removeSpy.mock.calls).toContainEqual([type, handler]);
    }
  });

  it('disables the confirm button until something is drawn', () => {
    render(<ExerciseWriteNumber />);
    expect(screen.getByText('Controleer').closest('button')).toBeDisabled();

    draw(getCanvas());
    expect(screen.getByText('Controleer').closest('button')).toBeEnabled();
  });

  it('on a correct recognition: celebrates, advances progress, and resets for the next round', async () => {
    invokeMock.mockResolvedValue({ data: { isCorrect: true, recognized: 1 }, error: null });
    render(<ExerciseWriteNumber />);

    draw(getCanvas());
    fireEvent.click(screen.getByText('Controleer'));

    await waitFor(() => expect(triggerConfettiMock).toHaveBeenCalled());
    expect(screen.getByText(/Geweldig!/)).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith('recognize-digit', { body: { imageBase64: 'FAKE', target: 1 } });

    // Progress after 1 of 5 correct answers is 20% — not yet finished, so the
    // round resets rather than persisting/navigating.
    await new Promise((r) => setTimeout(r, 1850));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByText('Controleer').closest('button')).toBeDisabled(); // hasDrawn reset
  }, 10000);

  it('persists the attempt and navigates once progress reaches 100% (5 correct answers)', async () => {
    invokeMock.mockResolvedValue({ data: { isCorrect: true, recognized: 1 }, error: null });
    render(<ExerciseWriteNumber />);

    for (let i = 0; i < 5; i++) {
      draw(getCanvas());
      fireEvent.click(screen.getByText('Controleer'));
      await waitFor(() => expect(screen.getByText(/Geweldig!/)).toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 1850));
    }

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      exerciseId: 'ex-write-number', score: 5, maxScore: 5, stars: 3,
    }));
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos');
  }, 15000);

  it('on a wrong recognition: shows what it saw, costs a life, and lets the child retry', async () => {
    invokeMock.mockResolvedValue({ data: { isCorrect: false, recognized: 7 }, error: null });
    render(<ExerciseWriteNumber />);

    draw(getCanvas());
    fireEvent.click(screen.getByText('Controleer'));

    await waitFor(() =>
      expect(screen.getByText('Hmm, ik zie het getal 7, maar we zoeken 1. Probeer het nog eens!')).toBeInTheDocument()
    );
    expect(triggerConfettiMock).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 2250));
    expect(navigateMock).not.toHaveBeenCalled(); // 2 lives left, not game over
    expect(screen.getByText('Controleer').closest('button')).toBeDisabled(); // canvas cleared for retry
  }, 10000);

  it('ends the exercise once lives run out on a 3rd wrong answer', async () => {
    invokeMock.mockResolvedValue({ data: { isCorrect: false, recognized: 9 }, error: null });
    render(<ExerciseWriteNumber />);

    for (let i = 0; i < 3; i++) {
      draw(getCanvas());
      fireEvent.click(screen.getByText('Controleer'));
      await waitFor(() => expect(screen.getByText(/Hmm, ik zie het getal 9/)).toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 2250));
    }

    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos');
  }, 15000);

  it('recovers from an edge-function failure by unsticking "checking" so the child can retry', async () => {
    // POSSIBLE BUG: the catch block sets status to 'drawn' and feedbackText
    // to a friendly message, but the feedback banner only renders when
    // status is 'incorrect' or 'correct' (see the JSX below handleConfirm).
    // So today, a recognize-digit failure silently re-enables the button
    // without ever showing the child *any* message explaining why — worth a
    // fix (e.g. treat 'drawn' as displayable too, or add a dedicated 'error'
    // status). This test asserts the current, actually-observable behavior:
    // the button un-sticks, but the message is asserted absent, not present.
    invokeMock.mockRejectedValue(new Error('network down'));
    render(<ExerciseWriteNumber />);

    draw(getCanvas());
    fireEvent.click(screen.getByText('Controleer'));

    await waitFor(() => expect(screen.getByText('Controleer').closest('button')).toBeEnabled());
    expect(screen.queryByText('Mijn ogen werken even niet — teken het getal nog eens!')).not.toBeInTheDocument();
    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
