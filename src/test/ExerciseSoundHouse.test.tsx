import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// Fix the whole round set so every question has its target sound at the
// "begin" position — avoids depending on the real (random-draw) word pool
// for deterministic round-by-round assertions. Declared via vi.hoisted()
// since vi.mock(...) factories are hoisted above every import/const in the
// file, same reasoning as AuthContext.test.tsx.
const { FIXED_ROUND } = vi.hoisted(() => ({
  FIXED_ROUND: Array.from({ length: 5 }, (_, i) => ({
    word: `woord${i}`,
    display: `woord${i}`,
    sound: 'm',
    spoken: 'mmm',
    position: 'begin' as const,
    fromStage: 1 as const,
  })),
}));
vi.mock('@/data/soundHousePool', () => ({ generateSoundHouseRound: () => FIXED_ROUND }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'sound-house-exercise-id' }));
const completeExerciseMutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeExerciseMutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
// speak() is chained with .finally() in the auto-play effect and playWord(),
// so the mock must resolve to a real promise, not undefined.
const speakMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: speakMock }) }));

import { ExerciseSoundHouse } from '@/screens/ExerciseSoundHouse';

function positionButton(label: 'Begin' | 'Midden' | 'Einde'): HTMLButtonElement {
  return screen.getByText(label).closest('button')!;
}

function filledHeartCount(): number {
  return document.querySelectorAll('svg.fill-red-500').length;
}

// Advances fake timers by `ms` and also drains the real microtask queue.
// Needed because the auto-play effect does
// `speak(current.word).finally(() => setIsPlaying(false))` — speak()
// resolves via a *real* Promise (unaffected by fake timers), and a plain
// synchronous `act(() => vi.advanceTimersByTime(...))` returns before that
// microtask gets a chance to run, so the resulting setIsPlaying(false)
// lands outside of any act() and logs a false-alarm warning. Same fix as
// ExerciseLanguage.test.tsx's `tick`.
async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('ExerciseSoundHouse component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('picking the correct window ("Begin") celebrates with confetti', async () => {
    render(<ExerciseSoundHouse />);
    expect(screen.getByText(/Waar hoor je de/)).toBeInTheDocument();

    fireEvent.click(positionButton('Begin'));

    expect(triggerConfettiMock).toHaveBeenCalled();
    await tick(1500); // let the round-advance timeout settle before teardown
  });

  it('picking the wrong window loses a life, replays the word, and shows no confetti', async () => {
    render(<ExerciseSoundHouse />);
    expect(filledHeartCount()).toBe(3);

    fireEvent.click(positionButton('Midden')); // wrong: the target is always "begin"

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText(/luister nog eens/)).toBeInTheDocument();

    await tick(700);
    expect(speakMock).toHaveBeenCalledWith('woord0'); // replays the current word

    await tick(1800 - 700);
    expect(filledHeartCount()).toBe(2);
  });

  it('completes the exercise after 5 correct rounds and persists score/stars', async () => {
    render(<ExerciseSoundHouse />);

    for (let round = 0; round < 5; round++) {
      fireEvent.click(positionButton('Begin'));
      await tick(1500);
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'sound-house-exercise-id',
        score: 5,
        maxScore: 5,
        stars: 3,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1');
  });

  it('ends the exercise after losing all 3 lives, persisting a 0-score/1-star result', async () => {
    render(<ExerciseSoundHouse />);

    for (let round = 0; round < 3; round++) {
      fireEvent.click(positionButton('Einde')); // always wrong
      await tick(1800);
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'sound-house-exercise-id',
        score: 0,
        maxScore: 5,
        stars: 1,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1');
  });
});
