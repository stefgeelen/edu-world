/**
 * Wanneer de Buddy-klok loopt.
 *
 * Needs vervallen alleen binnen het Care Window: schooldagen, overdag. 's Nachts
 * slaapt de Buddy — dan vervalt niets en laadt Energie op — en in het weekend
 * staat de klok stil. Zo houdt één bezoek per schooldag de Buddy gezond, en kost
 * een vrije zaterdag of een vergeten woensdag geen Buddy-leven.
 *
 * De server rekent met dezelfde vensters in
 * supabase/migrations/20260914120000_buddy_care_window.sql (`_buddy_window_hours`).
 */

import { MS_PER_HOUR } from "./constants";

/** De Buddy leeft in de tijdzone van het kind, niet in UTC. */
export const CARE_TIMEZONE = "Europe/Amsterdam";
/** De Buddy wordt wakker om 07:00 en gaat om 19:00 slapen (lokale tijd). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 19;

const MS_PER_DAY = 86_400_000;
/** Vangnet tegen een kapotte klok of een herstelde back-up. */
const MAX_SPAN_DAYS = 400;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: CARE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = zondag, 1 = maandag, … 6 = zaterdag. */
  weekday: number;
}

function zonedParts(ts: number): ZonedParts {
  const parts = FORMATTER.formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** Verschil tussen de lokale wandklok en UTC op dat moment, in ms. */
function zoneOffset(ts: number): number {
  const p = zonedParts(ts);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - (ts - (ts % 1000));
}

/** Zet een lokale wandkloktijd om naar een UTC-timestamp. */
function zonedToUtc(year: number, month: number, day: number, hour: number): number {
  const guess = Date.UTC(year, month - 1, day, hour);
  // Rond een zomertijdsprong zit de eerste gok er een uur naast, dus corrigeren
  // we een tweede keer met de offset die op het gecorrigeerde moment geldt.
  return guess - zoneOffset(guess - zoneOffset(guess));
}

function startOfZonedDay(ts: number): number {
  const p = zonedParts(ts);
  return zonedToUtc(p.year, p.month, p.day, 0);
}

export interface ElapsedWindows {
  /** Uren in het Care Window (ma-vr, 07:00-19:00): hier vervallen de Needs. */
  activeH: number;
  /** Uren in de nacht (19:00-07:00, elke dag): hier slaapt de Buddy en laadt Energie op. */
  nightH: number;
}

/**
 * Splitst het tijdsverloop tussen twee momenten op in actieve uren en nachturen.
 * Wat overblijft — weekenddagen overdag — telt voor geen van beide en is dus gratis.
 */
export function elapsedWindows(from: number, to: number): ElapsedWindows {
  if (!(to > from)) return { activeH: 0, nightH: 0 };

  const start = Math.max(from, to - MAX_SPAN_DAYS * MS_PER_DAY);
  let activeMs = 0;
  let daylightMs = 0;

  let cursor = startOfZonedDay(start);
  while (cursor < to) {
    // Middag als peilmoment: dat valt nooit in een zomertijdsprong.
    const p = zonedParts(cursor + 12 * MS_PER_HOUR);
    const dayStart = zonedToUtc(p.year, p.month, p.day, DAY_START_HOUR);
    const dayEnd = zonedToUtc(p.year, p.month, p.day, DAY_END_HOUR);
    const overlap = Math.min(to, dayEnd) - Math.max(start, dayStart);
    if (overlap > 0) {
      daylightMs += overlap;
      if (p.weekday >= 1 && p.weekday <= 5) activeMs += overlap;
    }
    cursor = startOfZonedDay(cursor + 36 * MS_PER_HOUR);
  }

  return {
    activeH: activeMs / MS_PER_HOUR,
    nightH: Math.max(0, to - start - daylightMs) / MS_PER_HOUR,
  };
}

/** Slaapt de Buddy op dit moment zijn vaste nacht? */
export function isNightTime(now = Date.now()): boolean {
  const hour = zonedParts(now).hour;
  return hour < DAY_START_HOUR || hour >= DAY_END_HOUR;
}

/** Loopt de Buddy-klok op dit moment (schooldag, overdag)? */
export function isCareWindowOpen(now = Date.now()): boolean {
  const p = zonedParts(now);
  return p.weekday >= 1 && p.weekday <= 5 && p.hour >= DAY_START_HOUR && p.hour < DAY_END_HOUR;
}
