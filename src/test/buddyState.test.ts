import { describe, it, expect } from 'vitest';
import {
  applyCare,
  buddyCue,
  buyItem,
  createBuddy,
  earnMunten,
  isIll,
  isSleeping,
  moodOf,
  revive,
  tick,
  type BuddyState,
} from '@/lib/buddy/state';
import {
  CRITICAL_THRESHOLD,
  DEATH_AFTER_HOURS,
  MS_PER_HOUR,
  MUNTEN_PER_EXERCISE,
  REVIVAL_LEVEL,
  SLEEP_MINUTES,
} from '@/lib/buddy/constants';
import { elapsedWindows } from '@/lib/buddy/schedule';

/**
 * The Buddy care rules (decay, illness, death, care actions, shop) are the
 * child-facing economy of the Buddy Room. The authoritative copy runs
 * server-side in supabase/migrations/20260911120000_add_buddy_care.sql; this
 * module is the client mirror that drives the live countdown between RPC
 * round-trips, so any drift here shows the child numbers the server will
 * later contradict.
 */

/**
 * Donderdag 1 januari 2026, 13:00 in Europe/Amsterdam — midden in het Care
 * Window, met nog zes actieve uren voor de boeg. Tests die binnen die zes uur
 * blijven zien dus verstreken tijd één-op-één terug als actieve uren.
 */
const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const MINUTE = 60_000;

function makeBuddy(overrides: Partial<BuddyState> = {}): BuddyState {
  return {
    ...createBuddy(T0),
    ...overrides,
    needs: { ...createBuddy(T0).needs, ...(overrides.needs ?? {}) },
    inventory: { ...createBuddy(T0).inventory, ...(overrides.inventory ?? {}) },
  };
}

describe('createBuddy', () => {
  it('starts healthy, awake, alive and with the documented starting kit', () => {
    const b = createBuddy(T0);

    expect(b.needs).toEqual({ hunger: 80, fun: 75, energy: 85, hygiene: 80, health: 100 });
    expect(b.munten).toBe(40);
    expect(b.inventory).toEqual({ bes: 2, dennenappel: 1, doekje: 1 });
    expect(b.dead).toBe(false);
    expect(b.sleepUntil).toBeNull();
    expect(b.healthZeroSince).toBeNull();
    expect(b.lastTick).toBe(T0);
  });

  it('gives a fresh buddy at least one usable item for each of the three item-backed needs', () => {
    // A child with no coins yet must still be able to answer the first
    // hunger/fun/hygiene cue, otherwise the Buddy starves before the first
    // exercise pays out.
    const b = createBuddy(T0);
    expect(b.inventory.bes).toBeGreaterThan(0);
    expect(b.inventory.dennenappel).toBeGreaterThan(0);
    expect(b.inventory.doekje).toBeGreaterThan(0);
  });
});

describe('tick — decay', () => {
  it('decays hunger, fun, energy and hygiene at their per-hour rates', () => {
    const next = tick(makeBuddy(), T0 + 2 * MS_PER_HOUR);

    expect(next.needs.hunger).toBe(74); // 80 - 3/h * 2h
    expect(next.needs.fun).toBe(70); // 75 - 2.5/h * 2h
    expect(next.needs.energy).toBe(81); // 85 - 2/h * 2h
    expect(next.needs.hygiene).toBe(77); // 80 - 1.5/h * 2h
  });

  it('decays proportionally for a partial hour', () => {
    const next = tick(makeBuddy(), T0 + 30 * MINUTE);

    expect(next.needs.hunger).toBe(78.5); // 80 - 3 * 0.5
    expect(next.needs.fun).toBe(73.8); // 75 - 2.5 * 0.5
  });

  it('floors needs at 0 instead of going negative', () => {
    const next = tick(makeBuddy({ needs: { ...createBuddy(T0).needs, hunger: 5 } }), T0 + 14 * 24 * MS_PER_HOUR);

    expect(next.needs.hunger).toBe(0);
    expect(next.needs.fun).toBe(0);
  });

  it('is a no-op that returns the same object when no time has passed', () => {
    const b = makeBuddy();
    expect(tick(b, T0)).toBe(b);
  });

  it('does not rewind needs when called with a timestamp before lastTick', () => {
    // Clock skew between the device and the server must never hand the child
    // free need points.
    const b = makeBuddy();
    expect(tick(b, T0 - MS_PER_HOUR)).toBe(b);
  });

  it('advances lastTick but freezes the needs of a dead buddy', () => {
    const dead = makeBuddy({ dead: true, needs: { ...createBuddy(T0).needs, hunger: 40 } });
    const next = tick(dead, T0 + 10 * MS_PER_HOUR);

    expect(next.needs.hunger).toBe(40);
    expect(next.lastTick).toBe(T0 + 10 * MS_PER_HOUR);
    expect(next.dead).toBe(true);
  });

  it('does not mutate the state it was given', () => {
    const b = makeBuddy();
    tick(b, T0 + 5 * MS_PER_HOUR);

    expect(b.needs.hunger).toBe(80);
    expect(b.lastTick).toBe(T0);
  });
});

describe('tick — health', () => {
  it('regenerates health at 6/hour while no need is critical', () => {
    const next = tick(makeBuddy({ needs: { ...createBuddy(T0).needs, health: 50 } }), T0 + 2 * MS_PER_HOUR);

    expect(next.needs.health).toBe(62); // 50 + 6/h * 2h
  });

  it('caps regenerated health at 100', () => {
    const next = tick(makeBuddy(), T0 + 5 * MS_PER_HOUR);
    expect(next.needs.health).toBe(100);
  });

  it('drops health by 2/hour for each critical need, measured after decay', () => {
    // hunger 10 -> 7 after one hour of decay, so exactly one need is below the
    // critical threshold when health is settled.
    const b = makeBuddy({ needs: { hunger: 10, fun: 80, energy: 80, hygiene: 80, health: 50 } });
    const next = tick(b, T0 + MS_PER_HOUR);

    expect(next.needs.hunger).toBeLessThan(CRITICAL_THRESHOLD);
    expect(next.needs.health).toBe(48); // 50 - 2 * 1 critical
  });

  it('stacks the health drop across multiple critical needs', () => {
    const b = makeBuddy({ needs: { hunger: 10, fun: 10, energy: 80, hygiene: 80, health: 50 } });
    const next = tick(b, T0 + MS_PER_HOUR);

    expect(next.needs.health).toBe(46); // 50 - 2 * 2 critical
  });

  it('ignores health itself when counting critical needs', () => {
    // health is low but every other need is comfortable, so the buddy should
    // recover rather than spiral.
    const b = makeBuddy({ needs: { hunger: 80, fun: 80, energy: 80, hygiene: 80, health: 5 } });
    const next = tick(b, T0 + MS_PER_HOUR);

    expect(next.needs.health).toBe(11);
  });

  it('stamps healthZeroSince the first time health bottoms out', () => {
    const b = makeBuddy({ needs: { hunger: 1, fun: 1, energy: 1, hygiene: 1, health: 2 } });
    const next = tick(b, T0 + MS_PER_HOUR);

    expect(next.needs.health).toBe(0);
    expect(next.healthZeroSince).toBe(T0 + MS_PER_HOUR);
  });

  it('clears healthZeroSince once health recovers above 0', () => {
    const b = makeBuddy({
      needs: { hunger: 80, fun: 80, energy: 80, hygiene: 80, health: 0 },
      healthZeroSince: T0 - 5 * MS_PER_HOUR,
    });
    const next = tick(b, T0 + MS_PER_HOUR);

    expect(next.needs.health).toBe(6);
    expect(next.healthZeroSince).toBeNull();
  });
});

describe('tick — death', () => {
  it('counts the grace period in active hours, not in wall-clock hours', () => {
    // Het respijt is twee volle schooldagen. Dat is 47 wandklokuren terug: de
    // nachten ertussen tellen niet mee.
    const zeroSince = T0 - 47 * MS_PER_HOUR;

    expect(elapsedWindows(zeroSince, T0 + MS_PER_HOUR).activeH).toBe(DEATH_AFTER_HOURS);
  });

  it('marks the buddy dead once health has been at 0 for the full grace period', () => {
    const b = makeBuddy({
      needs: { hunger: 0, fun: 0, energy: 0, hygiene: 0, health: 0 },
      healthZeroSince: T0 - 47 * MS_PER_HOUR,
      sleepUntil: T0 + MS_PER_HOUR,
    });
    const next = tick(b, T0 + MS_PER_HOUR);

    expect(next.dead).toBe(true);
    expect(next.sleepUntil).toBeNull();
  });

  it('keeps the buddy alive while still inside the grace period', () => {
    const b = makeBuddy({
      needs: { hunger: 0, fun: 0, energy: 0, hygiene: 0, health: 0 },
      healthZeroSince: T0 - 24 * MS_PER_HOUR,
    });
    const next = tick(b, T0 + MS_PER_HOUR);

    expect(next.dead).toBe(false);
  });

  it('does not let a weekend push a starving buddy over the edge', () => {
    // Vrijdag 2 januari 2026, 18:00 lokaal: gezondheid staat al op 0 en het kind
    // komt pas maandagochtend terug. Het weekend mag die 24 actieve uren niet
    // vol maken.
    const fridayEvening = Date.UTC(2026, 0, 2, 17, 0, 0);
    const mondayMorning = Date.UTC(2026, 0, 5, 7, 0, 0);
    const b = makeBuddy({
      needs: { hunger: 0, fun: 0, energy: 0, hygiene: 0, health: 0 },
      lastTick: fridayEvening,
      healthZeroSince: fridayEvening,
    });

    expect(tick(b, mondayMorning).dead).toBe(false);
  });

  it('gives a returning child a grace period instead of dying on the first tick after a long absence', () => {
    // Documents deliberate leniency: healthZeroSince is stamped with `now`, not
    // with the moment health actually hit 0 mid-gap. A child who is away for a
    // week therefore comes back to an ill buddy, not a dead one, and still has
    // the full grace period to give medicine.
    const b = makeBuddy({ needs: { hunger: 5, fun: 5, energy: 5, hygiene: 5, health: 10 } });
    const next = tick(b, T0 + 7 * 24 * MS_PER_HOUR);

    expect(next.needs.health).toBe(0);
    expect(next.dead).toBe(false);
    expect(next.healthZeroSince).toBe(T0 + 7 * 24 * MS_PER_HOUR);
  });
});

describe('tick — sleeping', () => {
  it('restores energy to full and wakes the buddy when the sleep window closes', () => {
    const b = makeBuddy({ needs: { ...createBuddy(T0).needs, energy: 10 }, sleepUntil: T0 + SLEEP_MINUTES * MINUTE });
    const next = tick(b, T0 + SLEEP_MINUTES * MINUTE);

    expect(next.needs.energy).toBe(100);
    expect(next.sleepUntil).toBeNull();
  });

  it('restores energy proportionally part-way through the sleep window', () => {
    const b = makeBuddy({ needs: { ...createBuddy(T0).needs, energy: 20 }, sleepUntil: T0 + SLEEP_MINUTES * MINUTE });
    const next = tick(b, T0 + (SLEEP_MINUTES / 2) * MINUTE);

    expect(next.needs.energy).toBe(70); // 20 + half of a full 100-point restore
    expect(next.sleepUntil).toBe(T0 + SLEEP_MINUTES * MINUTE);
  });

  it('keeps hunger, fun and hygiene decaying while the buddy sleeps', () => {
    const b = makeBuddy({ sleepUntil: T0 + SLEEP_MINUTES * MINUTE });
    const next = tick(b, T0 + SLEEP_MINUTES * MINUTE);

    expect(next.needs.hunger).toBe(78.5); // 80 - 3 * 0.5h
    expect(next.needs.hygiene).toBe(79.3); // 80 - 1.5 * 0.5h
  });

  it('resumes normal energy decay after the buddy has woken up', () => {
    const b = makeBuddy({ needs: { ...createBuddy(T0).needs, energy: 60 }, sleepUntil: T0 - MS_PER_HOUR });
    const next = tick(b, T0 + 2 * MS_PER_HOUR);

    expect(next.needs.energy).toBe(56); // 60 - 2/h * 2h
  });
});

/**
 * De afspraak met het kind: één bezoek per schooldag is genoeg, en een
 * vergeten woensdag of een heel weekend mag geen Buddy kosten. Deze tests
 * bewaken die belofte in plaats van de losse tarieven.
 */
describe('tick — het ritme van een schoolweek', () => {
  const FULL = { hunger: 100, fun: 100, energy: 100, hygiene: 100, health: 100 };
  const MONDAY_MORNING = Date.UTC(2026, 0, 5, 7, 0, 0); // maandag 08:00 lokaal

  it('houdt een Buddy comfortabel tot het bezoek van de volgende schooldag', () => {
    const b = makeBuddy({ needs: FULL, lastTick: MONDAY_MORNING });
    const next = tick(b, MONDAY_MORNING + 24 * MS_PER_HOUR);

    expect(next.needs.hunger).toBe(64); // 100 - 3/h * 12 actieve uren
    expect(moodOf(next, MONDAY_MORNING + 24 * MS_PER_HOUR)).toBe('happy');
  });

  it('laat een overgeslagen weekdag geen enkele Need kritiek maken', () => {
    const b = makeBuddy({ needs: FULL, lastTick: MONDAY_MORNING });
    const next = tick(b, MONDAY_MORNING + 48 * MS_PER_HOUR);

    for (const need of ['hunger', 'fun', 'energy', 'hygiene'] as const) {
      expect(next.needs[need]).toBeGreaterThan(CRITICAL_THRESHOLD);
    }
    expect(next.needs.health).toBe(100);
  });

  it('kost een heel weekend vrijwel niets', () => {
    const fridayEvening = Date.UTC(2026, 0, 2, 17, 0, 0); // vrijdag 18:00 lokaal
    const b = makeBuddy({ needs: FULL, lastTick: fridayEvening });
    const next = tick(b, MONDAY_MORNING);

    expect(next.needs.hunger).toBe(94); // alleen het laatste schooluur van vrijdag en het eerste van maandag
    expect(next.needs.health).toBe(100);
  });

  it('laadt Energie op tijdens de nacht in plaats van hem te laten doorzakken', () => {
    const b = makeBuddy({ needs: { ...FULL, energy: 30 }, lastTick: MONDAY_MORNING });
    const next = tick(b, MONDAY_MORNING + 24 * MS_PER_HOUR);

    // 12 actieve uren kosten 24 punten, de nacht van 12 uur levert er 48 op.
    expect(next.needs.energy).toBe(54);
  });
});

describe('isIll / isSleeping', () => {
  it('reports illness only when health is exhausted and the buddy is alive', () => {
    expect(isIll(makeBuddy({ needs: { ...createBuddy(T0).needs, health: 0 } }))).toBe(true);
    expect(isIll(makeBuddy({ needs: { ...createBuddy(T0).needs, health: 1 } }))).toBe(false);
    expect(isIll(makeBuddy({ needs: { ...createBuddy(T0).needs, health: 0 }, dead: true }))).toBe(false);
  });

  it('reports sleeping only inside an unexpired sleep window of a living buddy', () => {
    const sleeping = makeBuddy({ sleepUntil: T0 + 10 * MINUTE });

    expect(isSleeping(sleeping, T0)).toBe(true);
    expect(isSleeping(sleeping, T0 + 10 * MINUTE)).toBe(false);
    expect(isSleeping(makeBuddy({ sleepUntil: null }), T0)).toBe(false);
    expect(isSleeping({ ...sleeping, dead: true }, T0)).toBe(false);
  });
});

describe('moodOf', () => {
  const withNeeds = (v: number, health = 100) =>
    makeBuddy({ needs: { hunger: v, fun: v, energy: v, hygiene: v, health } });

  it('is happy, neutral or sad based on the average of the four timed needs', () => {
    expect(moodOf(withNeeds(80), T0)).toBe('happy');
    expect(moodOf(withNeeds(50), T0)).toBe('neutral');
    expect(moodOf(withNeeds(10), T0)).toBe('sad');
  });

  it('treats the band boundaries as inclusive lower bounds', () => {
    expect(moodOf(withNeeds(65), T0)).toBe('happy');
    expect(moodOf(withNeeds(64.9), T0)).toBe('neutral');
    expect(moodOf(withNeeds(35), T0)).toBe('neutral');
    expect(moodOf(withNeeds(34.9), T0)).toBe('sad');
  });

  it('ignores health when averaging — illness is its own mood', () => {
    expect(moodOf(withNeeds(80, 0), T0)).toBe('ill');
  });

  it('ranks gone above every other mood', () => {
    expect(moodOf(makeBuddy({ dead: true, needs: { ...createBuddy(T0).needs, health: 0 } }), T0)).toBe('gone');
  });

  it('shows sleeping for a healthy buddy inside its sleep window', () => {
    expect(moodOf(makeBuddy({ sleepUntil: T0 + 10 * MINUTE }), T0)).toBe('sleeping');
  });
});

describe('buddyCue', () => {
  it('says ok when no need is critical', () => {
    expect(buddyCue(makeBuddy(), T0)).toBe('ok');
  });

  it('surfaces the single lowest critical need', () => {
    const b = makeBuddy({ needs: { hunger: 15, fun: 80, energy: 5, hygiene: 80, health: 100 } });
    expect(buddyCue(b, T0)).toBe('energy');
  });

  it('treats the critical threshold as exclusive', () => {
    const atThreshold = makeBuddy({
      needs: { hunger: CRITICAL_THRESHOLD, fun: 80, energy: 80, hygiene: 80, health: 100 },
    });
    const below = makeBuddy({
      needs: { hunger: CRITICAL_THRESHOLD - 0.1, fun: 80, energy: 80, hygiene: 80, health: 100 },
    });

    expect(buddyCue(atThreshold, T0)).toBe('ok');
    expect(buddyCue(below, T0)).toBe('hunger');
  });

  it('prioritises gone over sleeping, and sleeping over illness and critical needs', () => {
    const base = { hunger: 1, fun: 1, energy: 1, hygiene: 1, health: 0 };

    expect(buddyCue(makeBuddy({ dead: true, needs: base }), T0)).toBe('gone');
    expect(buddyCue(makeBuddy({ sleepUntil: T0 + MINUTE, needs: base }), T0)).toBe('sleeping');
    expect(buddyCue(makeBuddy({ needs: base }), T0)).toBe('ill');
  });
});

describe('applyCare — guards', () => {
  it('refuses every action while the buddy is dead and points at a parent', () => {
    const res = applyCare(makeBuddy({ dead: true }), 'feed', 'bes', T0);

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/ouder/i);
    expect(res.state.inventory.bes).toBe(2);
  });

  it('refuses non-sleep actions while the buddy is sleeping, without spending the item', () => {
    const res = applyCare(makeBuddy({ sleepUntil: T0 + 10 * MINUTE }), 'feed', 'bes', T0);

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/slaapt/i);
    expect(res.state.inventory.bes).toBe(2);
  });

  it('refuses an item the child does not own', () => {
    const res = applyCare(makeBuddy(), 'feed', 'taart', T0);

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/heb je niet meer/i);
  });

  it('refuses an item whose category does not match the action', () => {
    // A hygiene wipe must not be usable as food.
    const res = applyCare(makeBuddy(), 'feed', 'doekje', T0);

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/hoort niet bij/i);
    expect(res.state.inventory.doekje).toBe(1);
  });

  it('refuses an item-backed action with no item at all', () => {
    const res = applyCare(makeBuddy(), 'feed', undefined, T0);

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/Care Item nodig/i);
  });

  it('applies elapsed decay before running the action', () => {
    const res = applyCare(makeBuddy(), 'feed', 'bes', T0 + 2 * MS_PER_HOUR);

    // 80 decays to 74 over two active hours, then the berry adds 15.
    expect(res.state.needs.hunger).toBe(89);
  });
});

describe('applyCare — effects', () => {
  it('feeds the buddy and consumes one item', () => {
    const res = applyCare(makeBuddy(), 'feed', 'bes', T0);

    expect(res.ok).toBe(true);
    expect(res.state.needs.hunger).toBe(95); // 80 + 15
    expect(res.state.inventory.bes).toBe(1);
  });

  it('caps a restored need at 100 rather than banking the overflow', () => {
    const b = makeBuddy({ needs: { ...createBuddy(T0).needs, hunger: 95 }, inventory: { taart: 1 } });
    const res = applyCare(b, 'feed', 'taart', T0);

    expect(res.state.needs.hunger).toBe(100);
  });

  it('plays with the buddy and raises fun', () => {
    const res = applyCare(makeBuddy(), 'play', 'dennenappel', T0);

    expect(res.ok).toBe(true);
    expect(res.state.needs.fun).toBe(90); // 75 + 15
    expect(res.state.inventory.dennenappel).toBe(0);
  });

  it('washes the buddy and raises hygiene', () => {
    const res = applyCare(makeBuddy(), 'wash', 'doekje', T0);

    expect(res.ok).toBe(true);
    expect(res.state.needs.hygiene).toBe(95); // 80 + 15
  });

  it('cures illness with medicine and clears the death countdown', () => {
    const ill = makeBuddy({
      needs: { hunger: 50, fun: 50, energy: 50, hygiene: 50, health: 0 },
      healthZeroSince: T0 - 5 * MS_PER_HOUR,
      inventory: { kruid: 1 },
    });
    const res = applyCare(ill, 'medicine', 'kruid', T0);

    expect(res.ok).toBe(true);
    expect(res.state.needs.health).toBe(20); // 0 + 20
    expect(res.state.healthZeroSince).toBeNull();
    expect(isIll(res.state)).toBe(false);
  });

  it('does not leave a dying buddy ill when the medicine is too weak to help', () => {
    // Every medicine in the catalog must lift health above 0, otherwise the
    // child spends coins and the death countdown keeps running.
    const ill = makeBuddy({
      needs: { hunger: 50, fun: 50, energy: 50, hygiene: 50, health: 0 },
      healthZeroSince: T0 - 5 * MS_PER_HOUR,
      inventory: { kruid: 1, siroop: 1, toverdrank: 1 },
    });

    for (const itemId of ['kruid', 'siroop', 'toverdrank']) {
      const res = applyCare(ill, 'medicine', itemId, T0);
      expect(res.state.needs.health).toBeGreaterThan(0);
      expect(res.state.healthZeroSince).toBeNull();
    }
  });

  it('sleeps for the standard window without an item and consumes nothing', () => {
    const res = applyCare(makeBuddy(), 'sleep', undefined, T0);

    expect(res.ok).toBe(true);
    expect(res.state.sleepUntil).toBe(T0 + SLEEP_MINUTES * MINUTE);
    expect(res.message).toContain(String(SLEEP_MINUTES));
    expect(res.state.inventory).toEqual(createBuddy(T0).inventory);
  });

  it('shortens the sleep window by the comfort item strength and consumes it', () => {
    const b = makeBuddy({ inventory: { hangmat: 1 } });
    const res = applyCare(b, 'sleep', 'hangmat', T0);

    expect(res.ok).toBe(true);
    expect(res.state.sleepUntil).toBe(T0 + 6 * MINUTE); // 30 min, 80% faster
    expect(res.state.inventory.hangmat).toBe(0);
  });

  it('does not mutate the state it was given', () => {
    const b = makeBuddy();
    applyCare(b, 'feed', 'bes', T0);

    expect(b.needs.hunger).toBe(80);
    expect(b.inventory.bes).toBe(2);
  });
});

describe('buyItem', () => {
  it('adds the item to the inventory and debits the price', () => {
    const res = buyItem(makeBuddy(), 'taart', T0);

    expect(res.ok).toBe(true);
    expect(res.state.munten).toBe(15); // 40 - 25
    expect(res.state.inventory.taart).toBe(1);
  });

  it('stacks a repeat purchase of an item already owned', () => {
    const res = buyItem(makeBuddy(), 'bes', T0);

    expect(res.state.inventory.bes).toBe(3);
    expect(res.state.munten).toBe(35);
  });

  it('refuses the purchase when the child cannot afford it', () => {
    const res = buyItem(makeBuddy({ munten: 10 }), 'taart', T0);

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/niet genoeg/i);
    expect(res.state.munten).toBe(10);
    expect(res.state.inventory.taart).toBeUndefined();
  });

  it('allows a purchase priced exactly at the current balance', () => {
    const res = buyItem(makeBuddy({ munten: 25 }), 'taart', T0);

    expect(res.ok).toBe(true);
    expect(res.state.munten).toBe(0);
  });

  it('refuses an unknown item id', () => {
    const res = buyItem(makeBuddy(), 'gouden-appel', T0);

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/onbekend/i);
    expect(res.state.munten).toBe(40);
  });

  it('never lets a balance go negative across a sequence of purchases', () => {
    let state = makeBuddy();
    for (let i = 0; i < 12; i++) {
      state = buyItem(state, 'taart', T0).state;
    }

    expect(state.munten).toBeGreaterThanOrEqual(0);
    expect(state.inventory.taart).toBe(1); // only the first purchase was affordable
  });
});

describe('earnMunten', () => {
  it('adds the per-exercise reward by default', () => {
    expect(earnMunten(makeBuddy(), undefined, T0).munten).toBe(40 + MUNTEN_PER_EXERCISE);
  });

  it('adds an explicit amount and settles elapsed decay at the same time', () => {
    const next = earnMunten(makeBuddy(), 20, T0 + MS_PER_HOUR);

    expect(next.munten).toBe(60);
    expect(next.needs.hunger).toBe(77); // 80 - 3
  });
});

describe('revive', () => {
  it('brings a dead buddy back at the revival level with a clean slate', () => {
    const dead = makeBuddy({
      dead: true,
      needs: { hunger: 0, fun: 0, energy: 0, hygiene: 0, health: 0 },
      healthZeroSince: T0 - 30 * MS_PER_HOUR,
      sleepUntil: T0 + MINUTE,
    });
    const next = revive(dead, T0 + MS_PER_HOUR);

    expect(next.dead).toBe(false);
    expect(next.needs).toEqual({
      hunger: REVIVAL_LEVEL,
      fun: REVIVAL_LEVEL,
      energy: REVIVAL_LEVEL,
      hygiene: REVIVAL_LEVEL,
      health: REVIVAL_LEVEL,
    });
    expect(next.healthZeroSince).toBeNull();
    expect(next.sleepUntil).toBeNull();
    expect(next.lastTick).toBe(T0 + MS_PER_HOUR);
  });

  it('leaves a revived buddy out of the death spiral it came from', () => {
    // Reviving must reset lastTick too, otherwise the next tick immediately
    // re-applies every hour the buddy spent dead.
    const dead = makeBuddy({
      dead: true,
      needs: { hunger: 0, fun: 0, energy: 0, hygiene: 0, health: 0 },
      healthZeroSince: T0 - 30 * MS_PER_HOUR,
      lastTick: T0 - 200 * MS_PER_HOUR,
    });
    const next = tick(revive(dead, T0), T0 + MS_PER_HOUR);

    expect(next.dead).toBe(false);
    expect(buddyCue(next, T0 + MS_PER_HOUR)).toBe('ok');
  });

  it('preserves coins and inventory through a revival', () => {
    const dead = makeBuddy({ dead: true, munten: 120, inventory: { taart: 3 } });
    const next = revive(dead, T0);

    expect(next.munten).toBe(120);
    expect(next.inventory.taart).toBe(3);
  });
});
