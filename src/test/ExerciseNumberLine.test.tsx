import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

// ExerciseNumberLine mixes two risk patterns at once: canvas handwriting
// recognition (like ExerciseWriteNumber) wired through React's onPointerDown/
// onPointerMove props (like ExerciseClock) — so it hits jsdom's missing
// PointerEvent constructor too. Reuses the same MouseEvent-dispatch
// workaround as ExerciseClock.test.tsx.

function firePointer(el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', clientX = 0, clientY = 0) {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true }));
  });
}

/* ── Copied pure logic (not exported by ExerciseNumberLine.tsx) ──────────── */
interface Slot { value: number; isBlank: boolean; filled: boolean }
function makeSlots(maxNumber = 10): Slot[] {
  const indices: number[] = [];
  for (let i = 1; i < maxNumber; i++) indices.push(i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
  }
  const blankCount = Math.min(3, indices.length);
  const blanks = new Set(indices.slice(0, blankCount));
  const result: Slot[] = [];
  for (let n = 0; n <= maxNumber; n++) result.push({ value: n, isBlank: blanks.has(n), filled: false });
  return result;
}

describe('ExerciseNumberLine slot generation', () => {
  it('always includes both endpoints (0 and maxNumber) as given, non-blank values', () => {
    for (let i = 0; i < 20; i++) {
      const slots = makeSlots(6);
      expect(slots[0]).toMatchObject({ value: 0, isBlank: false });
      expect(slots[slots.length - 1]).toMatchObject({ value: 6, isBlank: false });
    }
  });

  it('blanks out exactly min(3, maxNumber-1) interior values', () => {
    expect(makeSlots(6).filter((s) => s.isBlank)).toHaveLength(3);
    expect(makeSlots(2).filter((s) => s.isBlank)).toHaveLength(1); // only 1 interior value (1)
  });

  it('never blanks the same value twice and never blanks an endpoint', () => {
    for (let i = 0; i < 20; i++) {
      const slots = makeSlots(10);
      const blankValues = slots.filter((s) => s.isBlank).map((s) => s.value);
      expect(new Set(blankValues).size).toBe(blankValues.length);
      expect(blankValues).not.toContain(0);
      expect(blankValues).not.toContain(10);
    }
  });

  it('starts every slot unfilled', () => {
    expect(makeSlots(6).every((s) => !s.filled)).toBe(true);
  });
});

/* ── Component ─────────────────────────────────────────────────────────── */

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({
  useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }), // DEFAULT_NUMBER_LINE: maxNumber=6, 3 blanks
}));
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => undefined }));
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: vi.fn() }),
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

import { ExerciseNumberLine } from '@/screens/ExerciseNumberLine';

const fakeCtx = {
  beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), clearRect: vi.fn(), set fillStyle(_v: string) {}, set strokeStyle(_v: string) {},
  set lineWidth(_v: number) {}, set lineCap(_v: string) {}, set lineJoin(_v: string) {},
};

function drawOnCanvas() {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  firePointer(canvas, 'pointerdown', 10, 10);
  firePointer(canvas, 'pointermove', 20, 20);
  firePointer(canvas, 'pointerup');
}

// The tip card ("Tik op een vakje met een ? en schrijf...", shown only while
// filled.length === 0) also contains a "?" span with no button ancestor, so
// a naive getAllByText('?').map(closest('button')) blows up on that entry.
function getOpenBlankButtons(): HTMLButtonElement[] {
  return screen.getAllByText('?')
    .map((el) => el.closest('button'))
    .filter((b): b is HTMLButtonElement => b !== null && !b.disabled);
}

describe('ExerciseNumberLine component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,FAKE');
    // jsdom doesn't implement the Pointer Capture API at all (unlike
    // setPointerCapture, which real browsers provide on any element).
    (HTMLCanvasElement.prototype as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps "Controleer mijn antwoorden!" disabled until every blank slot is filled', async () => {
    invokeMock.mockResolvedValue({ data: { isCorrect: true, recognized: 1 }, error: null });
    render(<ExerciseNumberLine />);

    const checkAllButton = () => screen.getByText(/vakjes? nog in te vullen|Controleer mijn antwoorden!/).closest('button')!;
    expect(checkAllButton()).toBeDisabled();

    // Open the drawing sheet for the first blank ("?") slot.
    const blankButtons = getOpenBlankButtons();
    expect(blankButtons.length).toBeGreaterThan(0);
    fireEvent.click(blankButtons[0]);

    drawOnCanvas();
    fireEvent.click(screen.getByText('Controleer'));

    await waitFor(() => expect(screen.getByText(/Goed zo!/)).toBeInTheDocument());
    // Slot fills in after the 1400ms success delay and the sheet closes.
    await new Promise((r) => setTimeout(r, 1500));

    expect(checkAllButton()).toBeDisabled(); // 2 of 3 blanks still remain
    expect(screen.getByText(/2 vakjes nog in te vullen/)).toBeInTheDocument();
  }, 10000);

  it('enables and confirms the round once all blanks are filled correctly', async () => {
    invokeMock.mockResolvedValue({ data: { isCorrect: true, recognized: 1 }, error: null });
    render(<ExerciseNumberLine />);

    // Fill all 3 blanks one at a time.
    for (let i = 0; i < 3; i++) {
      const blankButtons = getOpenBlankButtons();
      fireEvent.click(blankButtons[0]);
      drawOnCanvas();
      fireEvent.click(screen.getByText('Controleer'));
      await waitFor(() => expect(screen.getByText(/Goed zo!/)).toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 1500));
    }

    const checkAllButton = screen.getByText('Controleer mijn antwoorden!').closest('button')!;
    expect(checkAllButton).toBeEnabled();

    fireEvent.click(checkAllButton);
    expect(triggerConfettiMock).toHaveBeenCalled();
    expect(screen.getByText(/Geweldig gedaan!/)).toBeInTheDocument();
  }, 15000);

  it('recovers from a recognition error by re-enabling retry (same display gap as ExerciseWriteNumber)', async () => {
    // Same possible bug as ExerciseWriteNumber.test.tsx: the catch block sets
    // checkStatus back to 'idle' and feedbackText to a friendly message, but
    // the feedback banner only renders for checkStatus 'correct'/'incorrect'
    // — so the message is set yet never actually shown to the child.
    invokeMock.mockRejectedValue(new Error('down'));
    render(<ExerciseNumberLine />);

    const blankButtons = getOpenBlankButtons();
    fireEvent.click(blankButtons[0]);
    drawOnCanvas();
    fireEvent.click(screen.getByText('Controleer'));

    await waitFor(() => expect(screen.getByText('Controleer').closest('button')).toBeEnabled());
    expect(screen.queryByText(/Mijn ogen werken even niet/)).not.toBeInTheDocument();
    expect(triggerConfettiMock).not.toHaveBeenCalled();
  });
});
