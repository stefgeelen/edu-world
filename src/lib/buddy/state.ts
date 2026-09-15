import {
  CRITICAL_THRESHOLD,
  DEATH_AFTER_HOURS,
  DECAY_PER_HOUR,
  ENERGY_PER_NIGHT_HOUR,
  MUNTEN_PER_EXERCISE,
  HEALTH_DROP_PER_HOUR,
  HEALTH_REGEN_PER_HOUR,
  MS_PER_HOUR,
  NEED_IDS,
  REVIVAL_LEVEL,
  SLEEP_MINUTES,
  STARTING_MUNTEN,
  type NeedId,
} from "./constants";
import { CARE_ACTIONS, getItem, type CareActionId } from "./catalog";
import { elapsedWindows, isNightTime } from "./schedule";

export interface BuddyState {
  name: string;
  needs: Record<NeedId, number>;
  munten: number;
  /** itemId -> aantal in voorraad */
  inventory: Record<string, number>;
  lastTick: number;
  sleepUntil: number | null;
  healthZeroSince: number | null;
  dead: boolean;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

export function createBuddy(now = Date.now()): BuddyState {
  return {
    name: "Nootje",
    needs: { hunger: 80, fun: 75, energy: 85, hygiene: 80, health: 100 },
    munten: STARTING_MUNTEN,
    inventory: { bes: 2, dennenappel: 1, doekje: 1 },
    lastTick: now,
    sleepUntil: null,
    healthZeroSince: null,
    dead: false,
  };
}

export const isIll = (s: BuddyState) => !s.dead && s.needs.health <= 0;
export const isSleeping = (s: BuddyState, now = Date.now()) =>
  !s.dead && s.sleepUntil !== null && now < s.sleepUntil;

export type BuddyMood = "happy" | "neutral" | "sad" | "ill" | "sleeping" | "gone";

export function moodOf(s: BuddyState, now = Date.now()): BuddyMood {
  if (s.dead) return "gone";
  if (isIll(s)) return "ill";
  if (isSleeping(s, now) || isNightTime(now)) return "sleeping";
  const avg = (s.needs.hunger + s.needs.fun + s.needs.energy + s.needs.hygiene) / 4;
  if (avg >= 65) return "happy";
  if (avg >= 35) return "neutral";
  return "sad";
}

/**
 * Past het tijdsverloop toe sinds lastTick: verval, slaapherstel, gezondheid en
 * overlijden.
 *
 * Niet elk verstreken uur telt mee. Needs vervallen alleen tijdens actieve uren
 * (schooldag, overdag), Energie laadt op tijdens nachturen, en weekenddagen
 * overdag tellen voor geen van beide — zie schedule.ts.
 */
export function tick(state: BuddyState, now = Date.now()): BuddyState {
  if (now <= state.lastTick) return state;
  const { activeH, nightH } = elapsedWindows(state.lastTick, now);

  const next: BuddyState = {
    ...state,
    needs: { ...state.needs },
    inventory: { ...state.inventory },
    lastTick: now,
  };

  if (next.dead) return next;

  const sleeping = state.sleepUntil !== null && state.lastTick < state.sleepUntil;

  next.needs.hunger = clamp(next.needs.hunger - DECAY_PER_HOUR.hunger * activeH);
  next.needs.fun = clamp(next.needs.fun - DECAY_PER_HOUR.fun * activeH);
  next.needs.hygiene = clamp(next.needs.hygiene - DECAY_PER_HOUR.hygiene * activeH);

  if (sleeping) {
    const sleptH = (Math.min(now, state.sleepUntil!) - state.lastTick) / MS_PER_HOUR;
    const totalH = SLEEP_MINUTES / 60;
    next.needs.energy = clamp(next.needs.energy + (100 * sleptH) / totalH);
    if (now >= state.sleepUntil!) {
      next.needs.energy = 100;
      next.sleepUntil = null;
    }
  } else {
    next.needs.energy = clamp(
      next.needs.energy - DECAY_PER_HOUR.energy * activeH + ENERGY_PER_NIGHT_HOUR * nightH
    );
  }

  const criticalCount = (["hunger", "fun", "energy", "hygiene"] as const).filter(
    (n) => next.needs[n] < CRITICAL_THRESHOLD
  ).length;

  next.needs.health = clamp(
    criticalCount > 0
      ? next.needs.health - HEALTH_DROP_PER_HOUR * criticalCount * activeH
      : next.needs.health + HEALTH_REGEN_PER_HOUR * activeH
  );

  if (next.needs.health <= 0) {
    next.healthZeroSince = next.healthZeroSince ?? now;
    if (elapsedWindows(next.healthZeroSince, now).activeH >= DEATH_AFTER_HOURS) {
      next.dead = true;
      next.sleepUntil = null;
    }
  } else {
    next.healthZeroSince = null;
  }

  return next;
}

export type BuddyCue =
  | "gone"
  | "sleeping"
  | "ill"
  | "hunger"
  | "fun"
  | "energy"
  | "hygiene"
  | "ok";

/**
 * Bepaalt het ene signaal dat de Buddy toont: prioriteit dood > dutje > ziek >
 * nacht > laagste kritieke Need.
 *
 * De vaste nacht staat onder Ziekte: 's nachts vervalt er niets meer, maar een
 * zieke Buddy mag het kind wel om een Medicijn blijven vragen.
 */
export function buddyCue(s: BuddyState, now = Date.now()): BuddyCue {
  if (s.dead) return "gone";
  if (isSleeping(s, now)) return "sleeping";
  if (isIll(s)) return "ill";
  if (isNightTime(now)) return "sleeping";
  const candidates = (["hunger", "energy", "hygiene", "fun"] as const)
    .filter((n) => s.needs[n] < CRITICAL_THRESHOLD)
    .sort((a, b) => s.needs[a] - s.needs[b]);
  return candidates[0] ?? "ok";
}

export interface CareResult {
  state: BuddyState;
  ok: boolean;
  message: string;
}

/** Voert een Care Action uit. Alleen Slapen mag zonder Care Item. */
export function applyCare(
  state: BuddyState,
  action: CareActionId,
  itemId?: string,
  now = Date.now()
): CareResult {
  const s = tick(state, now);

  if (s.dead) {
    return { state: s, ok: false, message: "Je Buddy heeft eerst hulp van een ouder nodig." };
  }
  if (isSleeping(s, now) && action !== "sleep") {
    return { state: s, ok: false, message: "Je Buddy slaapt nu — wacht even." };
  }

  const item = itemId ? getItem(itemId) : undefined;
  if (item && (s.inventory[item.id] ?? 0) < 1) {
    return { state: s, ok: false, message: "Dat Care Item heb je niet meer." };
  }
  if (item && item.category !== CARE_ACTIONS[action].category) {
    return { state: s, ok: false, message: "Dat Care Item hoort niet bij deze Care Action." };
  }

  if (action === "sleep") {
    const speedUp = item ? item.strength / 100 : 0;
    const minutes = SLEEP_MINUTES * (1 - speedUp);
    const next: BuddyState = {
      ...s,
      inventory: { ...s.inventory },
      sleepUntil: now + minutes * 60_000,
    };
    if (item) next.inventory[item.id] = (next.inventory[item.id] ?? 0) - 1;
    return {
      state: next,
      ok: true,
      message: item
        ? `Welterusten! Met ${item.name} is de rust na ${Math.round(minutes)} min klaar.`
        : `Welterusten! Over ${Math.round(minutes)} minuten is je Buddy uitgerust.`,
    };
  }

  if (!item) {
    return { state: s, ok: false, message: "Voor deze Care Action heb je een Care Item nodig." };
  }

  const next: BuddyState = { ...s, needs: { ...s.needs }, inventory: { ...s.inventory } };
  next.inventory[item.id] = (next.inventory[item.id] ?? 0) - 1;

  if (action === "medicine") {
    next.needs.health = clamp(Math.max(next.needs.health, 0) + item.strength);
    if (next.needs.health > 0) next.healthZeroSince = null;
    return { state: next, ok: true, message: `${item.name} gegeven — de Ziekte is weg!` };
  }

  const need = CARE_ACTIONS[action].need as NeedId;
  next.needs[need] = clamp(next.needs[need] + item.strength);
  return { state: next, ok: true, message: `${item.name} gebruikt. ${CARE_ACTIONS[action].label} gelukt!` };
}

export function buyItem(state: BuddyState, itemId: string, now = Date.now()): CareResult {
  const s = tick(state, now);
  const item = getItem(itemId);
  if (!item) return { state: s, ok: false, message: "Onbekend Care Item." };
  if (s.munten < item.price) return { state: s, ok: false, message: "Niet genoeg Munten." };
  return {
    state: {
      ...s,
      munten: s.munten - item.price,
      inventory: { ...s.inventory, [item.id]: (s.inventory[item.id] ?? 0) + 1 },
    },
    ok: true,
    message: `${item.name} gekocht voor ${item.price} Munten.`,
  };
}

export function earnMunten(state: BuddyState, amount = MUNTEN_PER_EXERCISE, now = Date.now()): BuddyState {
  const s = tick(state, now);
  return { ...s, munten: s.munten + amount };
}

/** Herstel door een ouder: Needs komen gedeeltelijk terug. */
export function revive(state: BuddyState, now = Date.now()): BuddyState {
  const needs = { ...state.needs };
  for (const id of NEED_IDS) needs[id] = REVIVAL_LEVEL;
  return { ...state, needs, dead: false, healthZeroSince: null, sleepUntil: null, lastTick: now };
}
