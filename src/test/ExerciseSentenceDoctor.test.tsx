import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

/* ── Copied pure logic (not exported by ExerciseSentenceDoctor.tsx) ──────
 * Uses real Math.random (this file only spies on Math.random inside the
 * component describe block below, scoped per-test with mockRestore, so
 * these run first with genuine randomness — unlike vi.mock(), vi.spyOn()
 * is not hoisted). */
function shuffleLocal<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
interface WordItemLocal { id: string; word: string }
function buildShuffledOrder(words: string[]): { correctOrder: WordItemLocal[]; shuffled: WordItemLocal[] } {
  const correctOrder: WordItemLocal[] = words.map((w, i) => ({ id: `${i}-${w}`, word: w }));
  const shuffled = shuffleLocal(correctOrder);
  if (shuffled.every((item, i) => item.id === correctOrder[i].id)) {
    shuffled.reverse();
  }
  return { correctOrder, shuffled };
}

describe('ExerciseSentenceDoctor build-mode shuffle', () => {
  it('never presents the words already in their correct order (the "ensure not already correct" guard)', () => {
    for (let i = 0; i < 200; i++) {
      const { correctOrder, shuffled } = buildShuffledOrder(['de', 'poes', 'slaapt', 'op', 'de', 'mat']);
      const alreadyCorrect = shuffled.every((item, i2) => item.id === correctOrder[i2].id);
      expect(alreadyCorrect).toBe(false);
    }
  });

  it('shuffling preserves the same set of word ids (no word lost or duplicated)', () => {
    for (let i = 0; i < 50; i++) {
      const { correctOrder, shuffled } = buildShuffledOrder(['ik', 'ga', 'naar', 'school']);
      expect(new Set(shuffled.map((s) => s.id))).toEqual(new Set(correctOrder.map((c) => c.id)));
    }
  });
});

/* ── Component ────────────────────────────────────────────────────────── */

// Reorder.Group/Reorder.Item (framer-motion) implement drag-reordering via
// their own internal PanSession pointer listeners rather than React props,
// which jsdom cannot reproduce reliably. Only Reorder is mocked (via
// importOriginal + spread) so the test can call the exact onReorder callback
// the real Reorder.Group would call once a drag finished — everything else
// from framer-motion (motion.*, AnimatePresence) stays real.
const reorderHandlers = vi.hoisted(() => ({
  onReorder: undefined as ((values: unknown[]) => void) | undefined,
}));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    Reorder: {
      Group: (props: { children: React.ReactNode; onReorder: (values: unknown[]) => void }) => {
        reorderHandlers.onReorder = props.onReorder;
        return <div>{props.children}</div>;
      },
      Item: (props: { children: React.ReactNode }) => <div>{props.children}</div>,
    },
  };
});

// The real Popover (Radix) needs layout/portal machinery jsdom doesn't
// provide well; it's not what's under test here (the fix-mode word-pick
// logic is), so it's stubbed to always render trigger + content, same
// spirit as Dashboard.test.tsx stubbing out unrelated child components.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'sentence-doctor-exercise-id' }));
const completeExerciseMutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeExerciseMutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
const speakMock = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: speakMock }) }));

import { ExerciseSentenceDoctor } from '@/screens/ExerciseSentenceDoctor';

// With Math.random() pinned to 0.1: mode = 0.1 < 0.5 -> 'build';
// pickRandom(BUILD_SENTENCES) = index floor(0.1*10)=1 -> ['ik','ga','naar','school'].
const BUILD_CORRECT_ORDER = [
  { id: '0-ik', word: 'ik' },
  { id: '1-ga', word: 'ga' },
  { id: '2-naar', word: 'naar' },
  { id: '3-school', word: 'school' },
];

function submitBuildAnswer(correct: boolean) {
  if (correct) {
    act(() => reorderHandlers.onReorder?.(BUILD_CORRECT_ORDER));
  }
  fireEvent.pointerDown(screen.getByText('Controleer ✓'));
}

describe('ExerciseSentenceDoctor component — build mode (Math.random pinned to 0.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('celebrates with confetti once the words are reordered correctly and checked', () => {
    render(<ExerciseSentenceDoctor />);
    expect(screen.getByText('Maak de zin!')).toBeInTheDocument();

    submitBuildAnswer(true);

    expect(triggerConfettiMock).toHaveBeenCalled();
    expect(screen.getByText('Goed gedaan!')).toBeInTheDocument();
  });

  it('shows the "try again" banner when checked without fixing the shuffled order', () => {
    render(<ExerciseSentenceDoctor />);

    submitBuildAnswer(false);

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Probeer opnieuw!')).toBeInTheDocument();
  });

  it('completes the exercise after 5 correct rounds and persists score/stars', () => {
    render(<ExerciseSentenceDoctor />);

    for (let round = 0; round < 5; round++) {
      submitBuildAnswer(true);
      act(() => vi.advanceTimersByTime(1800));
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'sentence-doctor-exercise-id',
        score: 5,
        maxScore: 5,
        stars: 3,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app/map');
  });
});

describe('ExerciseSentenceDoctor component — fix mode (Math.random pinned to 0.9)', () => {
  // mode = 0.9 < 0.5 -> false -> 'fix'; pickRandom(FIX_SENTENCES) index
  // floor(0.9*8)=7 -> {sentence:['de','baby','kookt','in','de','wieg'],
  // wrongIndex:2, wrongWord:'kookt', correctWord:'slaapt', distractors:
  // ['rijdt','leest']}. shuffle(['slaapt','rijdt','leest']) with a constant
  // 0.9 draw resolves to two self-swaps, so alternatives stay in that order.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('picking the correct replacement word celebrates with confetti', () => {
    render(<ExerciseSentenceDoctor />);
    expect(screen.getByText('Genees de zin!')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText(/kookt/));
    fireEvent.pointerDown(screen.getByText('slaapt'));

    expect(triggerConfettiMock).toHaveBeenCalled();
    expect(screen.getByText('Goed gedaan!')).toBeInTheDocument();
  });

  it('picking a wrong distractor shows it in place and the "try again" banner, without confetti', () => {
    render(<ExerciseSentenceDoctor />);

    fireEvent.pointerDown(screen.getByText(/kookt/));
    fireEvent.pointerDown(screen.getByText('rijdt'));

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Probeer opnieuw!')).toBeInTheDocument();
    // The wrong pick still replaces the broken slot's displayed word.
    expect(screen.queryByText(/kookt/)).not.toBeInTheDocument();
  });
});
