import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// useExerciseState is the shared engine behind every one of the 14+ exercise
// screens: lives, progress, confetti, persistence via useCompleteExercise, and
// navigation on finish/game-over. CLAUDE.md flags its hard-coded setTimeout
// delays (1500-1800ms) as a risk if the component unmounts mid-timeout — these
// tests use fake timers to exercise the full correct/incorrect/finish paths
// without waiting on wall-clock time.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({
  triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args),
}));

const mutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: mutateMock }),
}));

import { useExerciseState } from '@/hooks/useExerciseState';

describe('useExerciseState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with 3 lives, 0 progress, and idle status', () => {
    const { result } = renderHook(() => useExerciseState());
    expect(result.current.lives).toBe(3);
    expect(result.current.progress).toBe(0);
    expect(result.current.status).toBe('idle');
  });

  it('handleCorrect sets status, fires confetti, and advances progress by 100/totalQuestions', () => {
    const { result } = renderHook(() => useExerciseState({ totalQuestions: 4 }));

    act(() => result.current.handleCorrect());

    expect(result.current.status).toBe('correct');
    expect(result.current.progress).toBe(25);
    expect(triggerConfettiMock).toHaveBeenCalled();
  });

  it('calls onCorrect synchronously and onNextQuestion after the correct-answer delay', () => {
    const onCorrect = vi.fn();
    const onNextQuestion = vi.fn();
    const { result } = renderHook(() => useExerciseState({ totalQuestions: 5, onCorrect, onNextQuestion }));

    act(() => result.current.handleCorrect());
    expect(onCorrect).toHaveBeenCalledTimes(1);
    expect(onNextQuestion).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1800));

    expect(onNextQuestion).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('finishes the exercise, persists the result, and navigates once progress reaches 100%', () => {
    const { result } = renderHook(() =>
      useExerciseState({ totalQuestions: 2, exerciseId: 'ex-1', returnPath: '/app/map' })
    );

    act(() => result.current.handleCorrect()); // 50%
    act(() => vi.advanceTimersByTime(1800));
    expect(navigateMock).not.toHaveBeenCalled();

    act(() => result.current.handleCorrect()); // 100% -> finish
    act(() => vi.advanceTimersByTime(1800));

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      exerciseId: 'ex-1',
      score: 2,
      maxScore: 2,
      stars: 3, // still at 3 lives -> 3 stars
    }));
    expect(navigateMock).toHaveBeenCalledWith('/app/map');
  });

  it('awards fewer stars when lives were lost before finishing', () => {
    const { result } = renderHook(() => useExerciseState({ totalQuestions: 2, exerciseId: 'ex-1' }));

    act(() => result.current.handleIncorrect()); // lives -> 2
    act(() => vi.advanceTimersByTime(1600));
    act(() => result.current.handleCorrect()); // 50%
    act(() => vi.advanceTimersByTime(1800));
    act(() => result.current.handleCorrect()); // 100% -> finish with 2 lives left
    act(() => vi.advanceTimersByTime(1800));

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ stars: 2 }));
  });

  it('does not call the persistence mutation when no exerciseId is provided', () => {
    const { result } = renderHook(() => useExerciseState({ totalQuestions: 1 }));

    act(() => result.current.handleCorrect());
    act(() => vi.advanceTimersByTime(1800));

    expect(mutateMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalled();
  });

  it('handleIncorrect decrements lives and calls onIncorrect immediately', () => {
    const onIncorrect = vi.fn();
    const { result } = renderHook(() => useExerciseState({ onIncorrect }));

    act(() => result.current.handleIncorrect());

    expect(result.current.status).toBe('incorrect');
    expect(result.current.lives).toBe(2);
    expect(onIncorrect).toHaveBeenCalledTimes(1);
  });

  it('resets to idle and calls onNextQuestion after a wrong answer, if lives remain', () => {
    const onNextQuestion = vi.fn();
    const { result } = renderHook(() => useExerciseState({ onNextQuestion }));

    act(() => result.current.handleIncorrect());
    act(() => vi.advanceTimersByTime(1600));

    expect(result.current.status).toBe('idle');
    expect(result.current.lives).toBe(2);
    expect(onNextQuestion).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('ends the exercise (game over) once lives hit 0, persisting a 0-star result', () => {
    const { result } = renderHook(() =>
      useExerciseState({ exerciseId: 'ex-1', returnPath: '/app/map', totalQuestions: 10 })
    );

    act(() => result.current.handleIncorrect()); // 2
    act(() => vi.advanceTimersByTime(1600));
    act(() => result.current.handleIncorrect()); // 1
    act(() => vi.advanceTimersByTime(1600));
    act(() => result.current.handleIncorrect()); // 0 -> game over
    act(() => vi.advanceTimersByTime(1600));

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ stars: 0, score: 0 }));
    expect(navigateMock).toHaveBeenCalledWith('/app/map');
  });

  it('resetExercise() restores lives/progress/status to their initial values', () => {
    const { result } = renderHook(() => useExerciseState({ totalQuestions: 2 }));

    act(() => result.current.handleCorrect());
    act(() => vi.advanceTimersByTime(1800));
    act(() => result.current.handleIncorrect());

    act(() => result.current.resetExercise());

    expect(result.current.lives).toBe(3);
    expect(result.current.progress).toBe(0);
    expect(result.current.status).toBe('idle');
  });
});
