import { describe, it, expect, beforeEach } from 'vitest';
import { APP_PATHS, exerciseExitPath, resetExerciseOrigin, startExerciseFrom } from '@/routes/paths';

// An exercise returns to the screen it was started from: the dashboard or
// "Alle oefeningen".

beforeEach(() => resetExerciseOrigin());

describe('exerciseExitPath', () => {
  it('returns to the dashboard when nothing is known, e.g. an exercise opened from a link', () => {
    expect(exerciseExitPath()).toBe(APP_PATHS.dashboard);
  });

  it('returns to the screen the exercise was started from', () => {
    startExerciseFrom(APP_PATHS.practice);
    expect(exerciseExitPath()).toBe(APP_PATHS.practice);
    startExerciseFrom(APP_PATHS.dashboard);
    expect(exerciseExitPath()).toBe(APP_PATHS.dashboard);
  });

  it('still knows after a reload in the middle of an exercise', () => {
    startExerciseFrom(APP_PATHS.practice);
    expect(sessionStorage.getItem('leapio.exercise-origin')).toBe(APP_PATHS.practice);
  });

  it('ignores anything else found in storage', () => {
    sessionStorage.setItem('leapio.exercise-origin', '/somewhere-else');
    expect(exerciseExitPath()).toBe(APP_PATHS.dashboard);
  });
});
