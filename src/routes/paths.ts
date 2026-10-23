/**
 * Child-facing routes, in one place. Two tabs: the Buddy (home, where the app
 * opens) and the dashboard, from which every exercise is one or two taps away.
 */
export const APP_PATHS = {
  /** Where login lands: on to add-child, the Buddy choice, or home. */
  start: '/app',
  addChild: '/app/add-child',
  /** "Wie speelt er?": which child plays on this device, when there are several. */
  whoIsPlaying: '/app/wie-speelt-er',
  /** Pick a Buddy: the first time, then once per school year (stay or swap). */
  chooseBuddy: '/app/kies-je-buddy',
  /** Tab 1: the Buddy's room — the screen the app opens on. */
  home: '/app/home',
  /** Tab 2: the dashboard — quick starts, wishes, trophies, rewards. */
  dashboard: '/app/dashboard',
  /** Pick an exercise. */
  practice: '/app/oefenen',
  shop: '/app/shop',
  badges: '/app/badges',
  parent: '/app/parent',
} as const;

/**
 * The login screen. Not linked from the public site (beta): only people who
 * know it find it. Old `/auth` links go to the landing page.
 */
export const LOGIN_PATH = '/toegang-7k2q';

/** The screens an exercise can be started from, and so returns to. */
export type ExerciseOrigin = typeof APP_PATHS.dashboard | typeof APP_PATHS.practice;

/**
 * Remembered per browser session (sessionStorage), so a reload in the middle
 * of an exercise still goes back to the right screen. Storage can be blocked
 * (private mode); then it lasts until the page reloads.
 */
const ORIGIN_KEY = 'leapio.exercise-origin';
let origin: ExerciseOrigin | null = null;

/** Call just before opening an exercise: it returns here when done or closed. */
export function startExerciseFrom(from: ExerciseOrigin) {
  origin = from;
  try {
    sessionStorage.setItem(ORIGIN_KEY, from);
  } catch {
    // Only in memory then.
  }
}

/**
 * Where an exercise screen goes when the child finishes it, runs out of lives
 * or closes it: back to the screen it was started from (the dashboard or
 * "Alle oefeningen"), ready to pick the next one. The dashboard when unknown,
 * e.g. an exercise opened straight from a link.
 */
export function exerciseExitPath(): ExerciseOrigin {
  if (origin) return origin;
  try {
    const stored = sessionStorage.getItem(ORIGIN_KEY);
    if (stored === APP_PATHS.practice || stored === APP_PATHS.dashboard) return stored;
  } catch {
    // Fall through.
  }
  return APP_PATHS.dashboard;
}

/** For tests: forget where the last exercise came from. */
export function resetExerciseOrigin() {
  origin = null;
  try {
    sessionStorage.removeItem(ORIGIN_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * App URL of an exercise from the practice menu. A Herhalen exercise from a
 * lower grade carries that grade, so the screen loads that grade's version.
 */
export function exerciseUrl(option: { route: string; grade?: number }): string {
  return option.grade ? `/app${option.route}?leerjaar=${option.grade}` : `/app${option.route}`;
}
