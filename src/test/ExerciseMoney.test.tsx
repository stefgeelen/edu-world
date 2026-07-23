import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseMoney.tsx) ───────────────
 * Uses a locally-copied randomInt (same formula as '@/lib/random') instead
 * of importing the real module, since this file also mocks '@/lib/random'
 * for the component tests below and vi.mock(...) is hoisted above every
 * import in the file — importing the real randomInt here would silently
 * receive the mocked, deterministic version instead. */
function randomIntLocal(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generatePrice(maxCents: number, denominations: number[]): number {
  const smallest = Math.min(...denominations);
  return randomIntLocal(1, Math.floor(maxCents / smallest)) * smallest;
}
function formatCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return `€${euros}`;
  return `€${euros},${rest.toString().padStart(2, '0')}`;
}

describe('ExerciseMoney formatCents', () => {
  it('formats whole euros without a decimal part', () => {
    expect(formatCents(1500)).toBe('€15');
    expect(formatCents(0)).toBe('€0');
  });

  it('formats cents with a zero-padded decimal part', () => {
    expect(formatCents(150)).toBe('€1,50');
    expect(formatCents(5)).toBe('€0,05');
    expect(formatCents(1099)).toBe('€10,99');
  });
});

describe('ExerciseMoney generatePrice', () => {
  it('always produces a multiple of the smallest denomination, within [smallest, maxCents]', () => {
    const denominations = [1000, 500, 200, 100, 50];
    for (let i = 0; i < 200; i++) {
      const price = generatePrice(1500, denominations);
      expect(price % 50).toBe(0);
      expect(price).toBeGreaterThanOrEqual(50);
      expect(price).toBeLessThanOrEqual(1500);
    }
  });
});

/* ── Component: drag-and-drop money counting via ExerciseMoney ──────────── */

// dnd-kit relies on real pointer geometry + activation-distance sensors that
// jsdom cannot reproduce reliably (see ExerciseClock.test.tsx's note on the
// missing PointerEvent constructor — dnd-kit's sensor layer is thinner ice
// still, since it also depends on getBoundingClientRect-based collision
// detection). Instead of simulating real drags, '@dnd-kit/core' itself is
// mocked so the test can invoke the exact same onDragEnd callback the real
// DndContext would call, with a fake { active, over } payload — this
// exercises ExerciseMoney's own handleDragEnd logic (which is what actually
// matters here) without fighting dnd-kit's internals.
const dndHandlers = vi.hoisted(() => ({
  onDragEnd: undefined as
    | ((event: { active: { id: string }; over: { id: string } | null }) => void)
    | undefined,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: (props: {
    children: React.ReactNode;
    onDragEnd?: (event: { active: { id: string }; over: { id: string } | null }) => void;
  }) => {
    dndHandlers.onDragEnd = props.onDragEnd;
    return props.children;
  },
  DragOverlay: (props: { children: React.ReactNode }) => props.children ?? null,
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => {}, isDragging: false }),
  useDroppable: () => ({ isOver: false, setNodeRef: () => {} }),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: () => ({}),
  useSensors: (...sensors: unknown[]) => sensors,
}));

function drop(id: string) {
  act(() => {
    dndHandlers.onDragEnd?.({ active: { id }, over: { id: 'kassa' } });
  });
}

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'money-exercise-id' }));
const completeExerciseMutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeExerciseMutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
// Deterministic product pick (min=0 -> "Appel") and price factor (min=1 -> 3),
// so with the '1-1' config (denominations [1000,500,200,100,50], smallest 50)
// the price is always 3*50 = 150 cents (€1,50).
vi.mock('@/lib/random', () => ({ randomInt: (min: number) => (min === 0 ? 0 : 3) }));

import { ExerciseMoney } from '@/screens/ExerciseMoney';

// With denominations filtered/ordered as €10(1000)=denom-0, €5(500)=denom-1,
// €2(200)=denom-2, €1(100)=denom-3, 50c(50)=denom-4 for the '1-1' config.

describe('ExerciseMoney component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('pays the exact price (€1 + 50c = €1,50) and celebrates with confetti', () => {
    render(<ExerciseMoney />);

    drop('denom-3'); // €1
    drop('denom-4'); // 50c
    fireEvent.click(screen.getByText('Betaal 💰'));

    expect(triggerConfettiMock).toHaveBeenCalled();
    expect(screen.getByText(/Goed gedaan!/)).toBeInTheDocument();
  });

  it('shows a "too little" correction when the dropped total is under the price and resets for a fresh attempt', () => {
    render(<ExerciseMoney />);

    drop('denom-4'); // 50c only — less than the €1,50 price
    fireEvent.click(screen.getByText('Betaal 💰'));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/niet genoeg/)).toBeInTheDocument();

    // A wrong payment now runs through useExerciseState.handleIncorrect, which
    // (with 2 lives left) resets to the next question after 1600ms — the tray
    // is cleared and the child can try again.
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByText(/Sleep geld hierheen/)).toBeInTheDocument();
  });

  it('shows a "too much" correction when the dropped total exceeds the price', () => {
    render(<ExerciseMoney />);

    drop('denom-2'); // €2 — more than the €1,50 price
    fireEvent.click(screen.getByText('Betaal 💰'));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/iets te veel/)).toBeInTheDocument();
  });

  it('costs a life on each wrong payment and ends the exercise once all 3 lives are gone', () => {
    render(<ExerciseMoney />);

    for (let round = 0; round < 3; round++) {
      drop('denom-4'); // 50c — always too little for the €1,50 price
      fireEvent.click(screen.getByText('Betaal 💰'));
      act(() => vi.advanceTimersByTime(1600));
    }

    // On the 3rd wrong payment lives hit 0: the shared state machine persists
    // a 0-star partial result and navigates back to the stage.
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'money-exercise-id',
        score: 0,
        maxScore: 5,
        stars: 0,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1');
    expect(triggerConfettiMock).not.toHaveBeenCalled();
  });

  it('the Reset button clears the dropped coins back to the empty tray', () => {
    render(<ExerciseMoney />);

    drop('denom-3');
    expect(screen.getByText(/Je hebt/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText(/Sleep geld hierheen/)).toBeInTheDocument();
  });

  it('completes the exercise after 5 correct rounds and persists score/stars', () => {
    render(<ExerciseMoney />);

    for (let round = 0; round < 5; round++) {
      drop('denom-3'); // €1
      drop('denom-4'); // 50c
      fireEvent.click(screen.getByText('Betaal 💰'));
      act(() => vi.advanceTimersByTime(1800));
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'money-exercise-id',
        score: 5,
        maxScore: 5,
        stars: 3,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1');
  });
});
