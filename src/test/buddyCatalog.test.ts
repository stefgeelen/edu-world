import { describe, it, expect } from 'vitest';
import {
  CARE_ACTIONS,
  CARE_ITEMS,
  CATEGORY_LABEL,
  getItem,
  itemsByCategory,
  type CareActionId,
  type CareItemCategory,
} from '@/lib/buddy/catalog';
import { buddyMessage, careActionMessage } from '@/lib/buddy/messages';
import { NEED_EMOJI, NEED_IDS, NEED_LABEL, SLEEP_MINUTES } from '@/lib/buddy/constants';
import { applyCare, createBuddy, type BuddyMood, type BuddyCue } from '@/lib/buddy/state';

/**
 * The catalog is hand-maintained data that the shop, the care actions and the
 * server-side RPC all key off. A typo here is invisible in TypeScript (ids are
 * plain strings) but breaks a Care Action at runtime, so these are consistency
 * guards rather than behaviour tests.
 */

const ACTION_IDS = Object.keys(CARE_ACTIONS) as CareActionId[];
const CATEGORIES = Object.keys(CATEGORY_LABEL) as CareItemCategory[];

describe('CARE_ITEMS integrity', () => {
  it('has unique item ids', () => {
    const ids = CARE_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique item names, so the shop never shows two identical rows', () => {
    const names = CARE_ITEMS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every item a positive price and strength', () => {
    for (const item of CARE_ITEMS) {
      expect(item.price, `${item.id} price`).toBeGreaterThan(0);
      expect(item.strength, `${item.id} strength`).toBeGreaterThan(0);
    }
  });

  it('gives every item a label, emoji and description to render', () => {
    for (const item of CARE_ITEMS) {
      expect(item.name.length, `${item.id} name`).toBeGreaterThan(0);
      expect(item.emoji.length, `${item.id} emoji`).toBeGreaterThan(0);
      expect(item.description.length, `${item.id} description`).toBeGreaterThan(0);
    }
  });

  it('only uses categories that have a shop heading', () => {
    for (const item of CARE_ITEMS) {
      expect(CATEGORIES, `${item.id} category`).toContain(item.category);
    }
  });

  it('stocks every category the shop can display', () => {
    for (const category of CATEGORIES) {
      expect(itemsByCategory(category).length, `${category} is empty`).toBeGreaterThan(0);
    }
  });

  it('prices items consistently with their strength inside a category', () => {
    // A child saving up for the expensive item must actually get more for it,
    // otherwise the shop teaches the wrong lesson about saving.
    for (const category of CATEGORIES) {
      const byPrice = [...itemsByCategory(category)].sort((a, b) => a.price - b.price);
      const strengths = byPrice.map((i) => i.strength);
      const ascending = [...strengths].sort((a, b) => a - b);
      expect(strengths, `${category} strength does not rise with price`).toEqual(ascending);
    }
  });

  it('keeps every sleep-comfort item below an instant-sleep speed-up', () => {
    // applyCare computes the sleep window as SLEEP_MINUTES * (1 - strength/100),
    // so a strength of 100 or more would make sleep finish instantly (or in
    // negative time) and hand out free full energy.
    for (const item of itemsByCategory('sleep-comfort')) {
      expect(item.strength, `${item.id} would zero out the sleep window`).toBeLessThan(100);
    }

    const fastest = itemsByCategory('sleep-comfort').reduce((a, b) => (a.strength > b.strength ? a : b));
    const buddy = { ...createBuddy(0), inventory: { [fastest.id]: 1 } };
    const res = applyCare(buddy, 'sleep', fastest.id, 0);

    expect(res.ok).toBe(true);
    expect(res.state.sleepUntil!).toBeGreaterThan(0);
    expect(res.state.sleepUntil!).toBeLessThan(SLEEP_MINUTES * 60_000);
  });
});

describe('CARE_ACTIONS integrity', () => {
  it('points every action at a category that has items', () => {
    for (const action of ACTION_IDS) {
      const { category } = CARE_ACTIONS[action];
      expect(itemsByCategory(category).length, `no items for action ${action}`).toBeGreaterThan(0);
    }
  });

  it('points every action at a real need', () => {
    for (const action of ACTION_IDS) {
      expect(NEED_IDS as readonly string[], `action ${action}`).toContain(CARE_ACTIONS[action].need);
    }
  });

  it('maps each action to a distinct category, so an item can never satisfy two actions', () => {
    const categories = ACTION_IDS.map((a) => CARE_ACTIONS[a].category);
    expect(new Set(categories).size).toBe(categories.length);
  });

  it('covers every item category with exactly one action', () => {
    const covered = new Set(ACTION_IDS.map((a) => CARE_ACTIONS[a].category));
    for (const category of CATEGORIES) {
      expect(covered, `no action consumes ${category} items`).toContain(category);
    }
  });

  it('gives every action a label, emoji and colour for the care bar', () => {
    for (const action of ACTION_IDS) {
      const { label, emoji, color } = CARE_ACTIONS[action];
      expect(label.length, `${action} label`).toBeGreaterThan(0);
      expect(emoji.length, `${action} emoji`).toBeGreaterThan(0);
      expect(color.length, `${action} color`).toBeGreaterThan(0);
    }
  });
});

describe('needs metadata', () => {
  it('labels and illustrates every need', () => {
    for (const need of NEED_IDS) {
      expect(NEED_LABEL[need]?.length, `${need} label`).toBeGreaterThan(0);
      expect(NEED_EMOJI[need]?.length, `${need} emoji`).toBeGreaterThan(0);
    }
  });
});

describe('getItem / itemsByCategory', () => {
  it('finds a known item by id', () => {
    expect(getItem('taart')).toMatchObject({ id: 'taart', category: 'food' });
  });

  it('returns undefined for an unknown id rather than throwing', () => {
    expect(getItem('gouden-appel')).toBeUndefined();
  });

  it('returns only items of the requested category', () => {
    const food = itemsByCategory('food');

    expect(food.length).toBeGreaterThan(0);
    expect(food.every((i) => i.category === 'food')).toBe(true);
  });
});

describe('buddyMessage', () => {
  const MOODS: BuddyMood[] = ['happy', 'neutral', 'sad', 'ill', 'sleeping', 'gone'];

  it('returns a non-empty line for every mood', () => {
    for (const mood of MOODS) {
      expect(buddyMessage(mood, 0)?.length, `no message for ${mood}`).toBeGreaterThan(0);
    }
  });

  it('wraps the seed around the available lines instead of running off the end', () => {
    for (const mood of MOODS) {
      for (const seed of [0, 1, 2, 7, 99]) {
        expect(buddyMessage(mood, seed), `${mood} @ seed ${seed}`).toBeTruthy();
      }
    }
  });

  it('is deterministic for a given mood and seed', () => {
    expect(buddyMessage('happy', 3)).toBe(buddyMessage('happy', 3));
  });

  it('varies the line as the seed advances', () => {
    const lines = new Set([0, 1, 2].map((seed) => buddyMessage('happy', seed)));
    expect(lines.size).toBeGreaterThan(1);
  });

  it('lets a critical-need cue override the generic mood line', () => {
    const cues: BuddyCue[] = ['hunger', 'fun', 'energy', 'hygiene'];

    for (const cue of cues) {
      const withCue = buddyMessage('sad', 0, cue);
      expect(withCue, `cue ${cue}`).not.toBe(buddyMessage('sad', 0));
      expect(withCue.length).toBeGreaterThan(0);
    }
  });

  it('asks for the right kind of help in each cue line', () => {
    expect(buddyMessage('sad', 0, 'hunger')).toMatch(/eten|buik/i);
    expect(buddyMessage('sad', 0, 'energy')).toMatch(/moe|slap/i);
  });

  it('falls back to the mood line for cues that have no dedicated copy', () => {
    for (const cue of ['ok', 'ill', 'sleeping', 'gone'] as BuddyCue[]) {
      expect(buddyMessage('ill', 0, cue), `cue ${cue}`).toBe(buddyMessage('ill', 0));
    }
  });
});

describe('careActionMessage', () => {
  it('has a line for every care action', () => {
    for (const action of ACTION_IDS) {
      expect(careActionMessage(action)?.length, `no line for ${action}`).toBeGreaterThan(0);
    }
  });
});
