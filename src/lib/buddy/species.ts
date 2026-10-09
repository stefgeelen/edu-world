import type { BuddyMood } from '@/lib/buddy/state';
import nootjeHappy from '@/assets/buddy/buddy-happy.png';
import nootjeNeutral from '@/assets/buddy/buddy-neutral.png';
import nootjeSad from '@/assets/buddy/buddy-sad.png';
import nootjeIll from '@/assets/buddy/buddy-ill.png';
import nootjeSleeping from '@/assets/buddy/buddy-sleeping.png';
import nootjeGone from '@/assets/buddy/buddy-gone.png';
import vosjeHappy from '@/assets/buddy/vosje-happy.png';
import vosjeNeutral from '@/assets/buddy/vosje-neutral.png';
import vosjeSad from '@/assets/buddy/vosje-sad.png';
import vosjeIll from '@/assets/buddy/vosje-ill.png';
import vosjeSleeping from '@/assets/buddy/vosje-sleeping.png';
import vosjeGone from '@/assets/buddy/vosje-gone.png';
import prikkelHappy from '@/assets/buddy/prikkel-happy.png';
import prikkelNeutral from '@/assets/buddy/prikkel-neutral.png';
import prikkelSad from '@/assets/buddy/prikkel-sad.png';
import prikkelIll from '@/assets/buddy/prikkel-ill.png';
import prikkelSleeping from '@/assets/buddy/prikkel-sleeping.png';
import prikkelGone from '@/assets/buddy/prikkel-gone.png';
import loekaHappy from '@/assets/buddy/loeka-happy.png';
import loekaNeutral from '@/assets/buddy/loeka-neutral.png';
import loekaSad from '@/assets/buddy/loeka-sad.png';
import loekaIll from '@/assets/buddy/loeka-ill.png';
import loekaSleeping from '@/assets/buddy/loeka-sleeping.png';
import loekaGone from '@/assets/buddy/loeka-gone.png';

/**
 * De Buddy's waaruit een kind kan kiezen. Elke Buddy heeft een vaste naam en
 * één tekening per stemming. Zelfde zorg, winkel en groei voor allemaal.
 */
export type BuddySpeciesId = 'nootje' | 'vosje' | 'prikkel' | 'loeka';

export interface BuddySpecies {
  id: BuddySpeciesId;
  name: string;
  /** Welk dier, bv. "eekhoorn". */
  animal: string;
  /** Hoe de Buddy zich voorstelt in de kiezer. Wordt voorgelezen. */
  intro: string;
  art: Record<BuddyMood, string>;
}

export const BUDDY_SPECIES: Record<BuddySpeciesId, BuddySpecies> = {
  nootje: {
    id: 'nootje',
    name: 'Nootje',
    animal: 'eekhoorn',
    intro: 'Hoi! Ik ben Nootje, een vrolijke eekhoorn. Ik hou van nootjes en van springen!',
    art: {
      happy: nootjeHappy,
      neutral: nootjeNeutral,
      sad: nootjeSad,
      ill: nootjeIll,
      sleeping: nootjeSleeping,
      gone: nootjeGone,
    },
  },
  vosje: {
    id: 'vosje',
    name: 'Vosje',
    animal: 'vos',
    intro: 'Hallo! Ik ben Vosje, een slimme vos. Samen lossen we alles op!',
    art: {
      happy: vosjeHappy,
      neutral: vosjeNeutral,
      sad: vosjeSad,
      ill: vosjeIll,
      sleeping: vosjeSleeping,
      gone: vosjeGone,
    },
  },
  prikkel: {
    id: 'prikkel',
    name: 'Prikkel',
    animal: 'egel',
    intro: 'Hoi! Ik ben Prikkel, een lieve egel. Stap voor stap komen we er wel!',
    art: {
      happy: prikkelHappy,
      neutral: prikkelNeutral,
      sad: prikkelSad,
      ill: prikkelIll,
      sleeping: prikkelSleeping,
      gone: prikkelGone,
    },
  },
  loeka: {
    id: 'loeka',
    name: 'Loeka',
    animal: 'uil',
    intro: 'Oehoe! Ik ben Loeka, een wijze uil. Ik kijk met mijn grote ogen mee!',
    art: {
      happy: loekaHappy,
      neutral: loekaNeutral,
      sad: loekaSad,
      ill: loekaIll,
      sleeping: loekaSleeping,
      gone: loekaGone,
    },
  },
};

/** In deze volgorde in de kiezer. */
export const BUDDY_SPECIES_LIST: BuddySpecies[] = Object.values(BUDDY_SPECIES);

/** Elk kind dat nog niet koos, en elke onbekende waarde, is Nootje. */
export const DEFAULT_SPECIES_ID: BuddySpeciesId = 'nootje';

export function buddySpecies(id?: string | null): BuddySpecies {
  return BUDDY_SPECIES[id as BuddySpeciesId] ?? BUDDY_SPECIES[DEFAULT_SPECIES_ID];
}

/**
 * Het schooljaar, genoemd naar het jaar waarin het begint: september 2026 tot
 * en met augustus 2027 is 2026. Zelfde regel als `buddy_school_year` in
 * supabase/migrations/20261009150000_buddy_species_choice.sql.
 */
export function schoolYear(date: Date): number {
  return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
}

/**
 * `first`: het kind koos nog nooit. `yearly`: nieuw schooljaar, blijven of
 * wisselen. `null`: niets te kiezen.
 */
export type BuddyChoiceMode = 'first' | 'yearly';

export function buddyChoiceMode(chosenSchoolYear: number | null, now: Date): BuddyChoiceMode | null {
  if (chosenSchoolYear === null) return 'first';
  return chosenSchoolYear < schoolYear(now) ? 'yearly' : null;
}
