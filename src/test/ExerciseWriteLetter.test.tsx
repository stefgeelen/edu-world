import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

// ExerciseWriteLetter is ExerciseWriteDigit's sibling screen: same canvas
// engine, same lack of a Supabase edge function. Recognition is entirely
// client-side (rasterize the target letter's SVG path onto an offscreen
// canvas, compare pixel overlap against the child's drawing in
// checkDrawing()) — there is no network/edge-function failure path to test,
// unlike ExerciseWriteNumber/ExerciseNumberLine. We force the correct/
// incorrect branch deterministically by queuing the two getImageData() calls
// checkDrawing makes (see queueRecognition below), sidestepping the need for
// real canvas rasterization, which jsdom doesn't support anyway.
//
// Drawing is wired through React's onPointerDown/onPointerMove/onPointerUp
// props (like ExerciseNumberLine), not addEventListener, so this hits
// jsdom's missing PointerEvent constructor too — same MouseEvent-dispatch
// workaround as ExerciseNumberLine.test.tsx. jsdom also lacks Path2D and
// ResizeObserver, both used by this component, so both are polyfilled below
// as inert no-ops.
//
// The component also reads an optional `:id` route param via useParams() to
// force a specific letter. react-router-dom's useParams reads from a React
// Context that has a safe default ({ matches: [] }) even with no <Router>
// ancestor at all, so it resolves to `id: undefined` without needing a
// MemoryRouter wrapper here — confirmed by the tests passing unwrapped.
//
// Real timers are used throughout (per project convention for these
// screens) with `await new Promise(r => setTimeout(r, N))` to wait out the
// component's own setTimeout delays (2000ms on correct, 1800ms on wrong).

function firePointer(el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', clientX = 0, clientY = 0) {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true }));
  });
}

// jsdom doesn't implement the Canvas Path2D API or ResizeObserver at all.
// Both are only used for visual rendering/sizing in this component and never
// read back, so inert stand-ins are sufficient.
class FakePath2D {
  constructor(_d?: string) {
    void _d;
  }
}
(globalThis as unknown as { Path2D: typeof Path2D }).Path2D = FakePath2D as unknown as typeof Path2D;

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  FakeResizeObserver as unknown as typeof ResizeObserver;

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'ex-write-letter' }));
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

import { ExerciseWriteLetter } from '@/screens/ExerciseWriteLetter';

interface FakeCtx {
  save: () => void;
  restore: () => void;
  translate: (x: number, y: number) => void;
  rotate: (angle: number) => void;
  beginPath: () => void;
  closePath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  arc: (x: number, y: number, r: number, s: number, e: number) => void;
  fill: (...args: unknown[]) => void;
  stroke: (...args: unknown[]) => void;
  clearRect: (x: number, y: number, w: number, h: number) => void;
  setTransform: (...args: unknown[]) => void;
  setLineDash: (segments: number[]) => void;
  fillText: (text: string, x: number, y: number) => void;
  getImageData: (...args: unknown[]) => { data: Uint8ClampedArray };
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  shadowColor: string;
  shadowBlur: number;
}

function createFakeCtx(): FakeCtx {
  return {
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), clearRect: vi.fn(),
    setTransform: vi.fn(), setLineDash: vi.fn(), fillText: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
    fillStyle: '', strokeStyle: '', lineWidth: 0, lineCap: '', lineJoin: '',
    font: '', textAlign: '', textBaseline: '', shadowColor: '', shadowBlur: 0,
  };
}

let fakeCtx: FakeCtx;

// Default cSize state ({ w: 300, h: 380 }) never changes in tests because our
// FakeResizeObserver.observe() is a no-op — it never fires the resize
// callback, so the component keeps its initial canvas size.
const TOTAL_PX = 300 * 380;

function makeImageData(alpha: number) {
  const data = new Uint8ClampedArray(TOTAL_PX * 4);
  if (alpha > 0) {
    for (let i = 3; i < data.length; i += 4) data[i] = alpha;
  }
  return { data } as unknown as ImageData;
}

// checkDrawing() calls getImageData() exactly twice, in order: once for the
// freshly-rasterized reference glyph, once for the child's drawn canvas.
// Queuing full-canvas alpha (or none) sidesteps needing real path
// rasterization (unsupported in jsdom) while still deterministically forcing
// the correct/incorrect branch.
function queueRecognition(correct: boolean) {
  fakeCtx.getImageData
    .mockReturnValueOnce(makeImageData(correct ? 200 : 0)) // reference pixels
    .mockReturnValueOnce(makeImageData(200)); // drawn pixels (always "inked")
}

function getDrawCanvas() {
  // Canvas render order in the JSX is guide, anim, draw — only the third one
  // (drawRef) has pointer handlers wired up.
  return document.querySelectorAll('canvas')[2] as HTMLCanvasElement;
}

function draw() {
  const canvas = getDrawCanvas();
  firePointer(canvas, 'pointerdown', 10, 10);
  firePointer(canvas, 'pointermove', 20, 20);
  firePointer(canvas, 'pointerup');
}

describe('ExerciseWriteLetter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0); // deterministic target letter: ALPHABET[0] = 'a'
    fakeCtx = createFakeCtx();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,FAKE');
    (HTMLCanvasElement.prototype as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('picks the target letter randomly (no :id route param) and disables confirm until drawn', () => {
    render(<ExerciseWriteLetter />);
    expect(screen.getByText('a')).toBeInTheDocument(); // ALPHABET[floor(0*26)] = 'a'
    expect(screen.getByText('Controleer').closest('button')).toBeDisabled();

    draw();
    expect(screen.getByText('Controleer').closest('button')).toBeEnabled();
  });

  it('cancels the pending demo-animation frame on unmount', () => {
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<ExerciseWriteLetter />);

    fireEvent.click(screen.getByText('Bekijk hoe het moet'));
    // The rAF id is assigned synchronously inside startDemo, before any frame
    // has actually run (jsdom schedules rAF callbacks asynchronously), so
    // unmounting immediately after the click still has a live ref to cancel.
    unmount();

    expect(cafSpy).toHaveBeenCalled();
  });

  it('on a correct recognition: celebrates, advances the iteration, and resets for the next round', async () => {
    render(<ExerciseWriteLetter />);
    queueRecognition(true);
    draw();
    fireEvent.click(screen.getByText('Controleer'));

    await waitFor(() => expect(triggerConfettiMock).toHaveBeenCalled());
    expect(screen.getByText('Super! Volgende letter!')).toBeInTheDocument();

    // Correct branch schedules the next round after a 2000ms setTimeout.
    await new Promise((r) => setTimeout(r, 2150));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByText('Controleer').closest('button')).toBeDisabled(); // hasDrawn reset
  }, 10000);

  it('persists the attempt and navigates once all 5 rounds are answered correctly', async () => {
    render(<ExerciseWriteLetter />);

    for (let i = 0; i < 5; i++) {
      queueRecognition(true);
      draw();
      fireEvent.click(screen.getByText('Controleer'));
      await waitFor(() => expect(triggerConfettiMock).toHaveBeenCalledTimes(i + 1));
      await new Promise((r) => setTimeout(r, 2150));
    }

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      exerciseId: 'ex-write-letter', score: 5, maxScore: 5, stars: 3,
    }));
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos');
  }, 15000);

  it('on a wrong recognition: shows retry feedback, costs a life, and lets the child draw again', async () => {
    render(<ExerciseWriteLetter />);
    queueRecognition(false);
    draw();
    fireEvent.click(screen.getByText('Controleer'));

    await waitFor(() => expect(screen.getByText('Probeer nog eens!')).toBeInTheDocument());
    expect(triggerConfettiMock).not.toHaveBeenCalled();

    // Wrong branch schedules a retry/game-over check after 1800ms.
    await new Promise((r) => setTimeout(r, 2000));
    expect(navigateMock).not.toHaveBeenCalled(); // 2 lives left, not game over
    expect(screen.getByText('Controleer').closest('button')).toBeDisabled(); // canvas cleared for retry
  }, 10000);

  it('ends the exercise once lives run out after 3 wrong answers', async () => {
    render(<ExerciseWriteLetter />);

    for (let i = 0; i < 3; i++) {
      queueRecognition(false);
      draw();
      fireEvent.click(screen.getByText('Controleer'));
      await waitFor(() => expect(screen.getByText('Probeer nog eens!')).toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 2000));
    }

    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos');
  }, 15000);
});
