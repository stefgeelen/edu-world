export const NEED_IDS = ["hunger", "fun", "energy", "hygiene", "health"] as const;
export type NeedId = (typeof NEED_IDS)[number];

export const NEED_LABEL: Record<NeedId, string> = {
  hunger: "Honger",
  fun: "Plezier",
  energy: "Energie",
  hygiene: "Hygiëne",
  health: "Gezondheid",
};

export const NEED_EMOJI: Record<NeedId, string> = {
  hunger: "🍽️",
  fun: "🎈",
  energy: "⚡",
  hygiene: "🫧",
  health: "💚",
};

/** Verval per uur, in Need-punten (0-100). Gezondheid heeft geen eigen timer. */
export const DECAY_PER_HOUR: Record<Exclude<NeedId, "health">, number> = {
  hunger: 8,
  fun: 6,
  energy: 5,
  hygiene: 4,
};

/** Onder deze waarde is een Need kritiek. */
export const CRITICAL_THRESHOLD = 20;
/** Gezondheidsverlies per uur per kritieke Need. */
export const HEALTH_DROP_PER_HOUR = 6;
/** Uren dat Gezondheid op 0 mag staan voordat Overlijden intreedt. */
export const DEATH_AFTER_HOURS = 24;
/** Normale slaapduur in minuten (zonder slaapcomfort-item). */
export const SLEEP_MINUTES = 30;
/** Startsaldo Munten. */
export const STARTING_MUNTEN = 40;
/** Munten per voltooide oefening. */
export const MUNTEN_PER_EXERCISE = 8;
/** Needs-niveau na herstel door een ouder. */
export const REVIVAL_LEVEL = 55;

export const MS_PER_HOUR = 3_600_000;
