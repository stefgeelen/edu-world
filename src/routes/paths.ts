/**
 * Child-facing routes, in one place. The app has no tab bar: the Buddy's room
 * is home, and everything else (practising, the shop, the trophy cabinet) is
 * reached from there and leads back to it.
 */
export const APP_PATHS = {
  /** Avatar pick; redirects to home once the child has one. */
  start: '/app',
  addChild: '/app/add-child',
  /** The Buddy's room — the screen the app opens on. */
  home: '/app/home',
  /** Pick an exercise. */
  practice: '/app/oefenen',
  shop: '/app/shop',
  badges: '/app/badges',
  parent: '/app/parent',
} as const;

/** Where an exercise screen goes when the child finishes it (or runs out of lives). */
export const EXERCISE_DONE_PATH = APP_PATHS.home;

/** Where an exercise screen goes when the child closes it halfway. */
export const EXERCISE_CLOSE_PATH = APP_PATHS.practice;
