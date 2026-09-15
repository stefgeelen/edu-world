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

/**
 * Verval per actief uur, in Need-punten (0-100). Gezondheid heeft geen eigen timer.
 *
 * Alleen uren binnen het Care Window tellen (zie schedule.ts), dus zo'n 12 per
 * schooldag. Per schooldag zakt Honger daarmee 36 punten, en vanaf vol duurt het
 * ~27 actieve uren voordat Honger kritiek wordt. Eén bezoek per schooldag
 * volstaat dus ruim, en één overgeslagen weekdag overleeft de Buddy zonder
 * kritiek te worden — twee op rij niet.
 */
export const DECAY_PER_HOUR: Record<Exclude<NeedId, "health">, number> = {
  hunger: 3,
  fun: 2.5,
  energy: 2,
  hygiene: 1.5,
};

/** Energieherstel per nachtelijk uur — een nacht geeft een flinke oplader, geen volle reset. */
export const ENERGY_PER_NIGHT_HOUR = 4;

/** Onder deze waarde is een Need kritiek. */
export const CRITICAL_THRESHOLD = 20;
/** Gezondheidsverlies per actief uur per kritieke Need. */
export const HEALTH_DROP_PER_HOUR = 2;
/** Gezondheidsherstel per actief uur zolang geen Need kritiek is. */
export const HEALTH_REGEN_PER_HOUR = 6;
/** Actieve uren dat Gezondheid op 0 mag staan voordat Overlijden intreedt (= 2 schooldagen). */
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
