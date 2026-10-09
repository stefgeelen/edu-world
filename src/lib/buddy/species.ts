import type { BuddyMood } from '@/lib/buddy/state';
import nootjeHappy from '@/assets/buddy/buddy-happy.png';
import nootjeNeutral from '@/assets/buddy/buddy-neutral.png';
import nootjeSad from '@/assets/buddy/buddy-sad.png';
import nootjeIll from '@/assets/buddy/buddy-ill.png';
import nootjeSleeping from '@/assets/buddy/buddy-sleeping.png';
import nootjeGone from '@/assets/buddy/buddy-gone.png';

/**
 * De Buddy's waaruit een kind kan kiezen. Elke Buddy heeft een vaste naam en
 * één tekening per stemming. Zelfde zorg, winkel en groei voor allemaal.
 */
export type BuddySpeciesId = 'nootje';

export interface BuddySpecies {
  id: BuddySpeciesId;
  name: string;
  /** Welk dier, bv. "eekhoorn". */
  animal: string;
  art: Record<BuddyMood, string>;
}

export const BUDDY_SPECIES: Record<BuddySpeciesId, BuddySpecies> = {
  nootje: {
    id: 'nootje',
    name: 'Nootje',
    animal: 'eekhoorn',
    art: {
      happy: nootjeHappy,
      neutral: nootjeNeutral,
      sad: nootjeSad,
      ill: nootjeIll,
      sleeping: nootjeSleeping,
      gone: nootjeGone,
    },
  },
};

/** Elk kind dat nog niet koos, en elke onbekende waarde, is Nootje. */
export const DEFAULT_SPECIES_ID: BuddySpeciesId = 'nootje';

export function buddySpecies(id?: string | null): BuddySpecies {
  return BUDDY_SPECIES[id as BuddySpeciesId] ?? BUDDY_SPECIES[DEFAULT_SPECIES_ID];
}
