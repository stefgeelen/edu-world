/**
 * Child-facing routes, in one place. Two tabs: the Buddy (home, where the app
 * opens) and the dashboard, from which every exercise is one or two taps away.
 */
export const APP_PATHS = {
  /** Where login lands: on to add-child, the Buddy choice, or home. */
  start: '/app',
  addChild: '/app/add-child',
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
 * Where an exercise screen goes when the child finishes it, runs out of lives
 * or closes it: back to the dashboard, ready to pick the next one.
 */
export const EXERCISE_DONE_PATH = APP_PATHS.dashboard;
export const EXERCISE_CLOSE_PATH = APP_PATHS.dashboard;
