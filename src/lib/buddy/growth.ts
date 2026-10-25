/**
 * Hoe de Buddy groeit.
 *
 * Groei hangt niet af van inzet of verzorging, alleen van de tijd: een nieuwe
 * vorm per leerjaar, een kleine verandering per trimester. Zo hebben kinderen
 * uit dezelfde klas een Buddy in dezelfde fase.
 *
 * De server beslist de groeistap (`buddy_states.growth_stage`, -2..18 =
 * (leerjaar - 1) * 3 + trimester, leerjaar 0 = 3de kleuterklas) in
 * supabase/migrations/20261001120000_buddy_centred_practice.sql en
 * 20261025180000_kindergarten_grade.sql. Binnen een leerjaar gaat hij nooit
 * achteruit. Deze module beschrijft wat een stap betekent en hoe lang het nog
 * duurt tot de volgende.
 */

import { careCalendarDay } from './schedule';
import { buddySpecies } from './species';

export type GrowthPhase = 1 | 2 | 3;

export const GRADES = 6;
export const MAX_GROWTH_STAGE = GRADES * 3;
/** Eerste trimester van de 3de kleuterklas (leerjaar 0). */
export const MIN_GROWTH_STAGE = -2;

/** Trimesters volgens de kalender: sep-dec = 1, jan-mrt = 2, apr-aug = 3 (zoals buddy_growth_target). */
export function phaseOfMonth(month: number): GrowthPhase {
  if (month >= 9) return 1;
  if (month <= 3) return 2;
  return 3;
}

export interface GrowthForm {
  stage: number;
  grade: number;
  phase: GrowthPhase;
  /** Hoe de Buddy in deze fase heet, bv. "Kleine Nootje" of "Kleine Vosje". */
  title: string;
  /** Grootte van de Buddy-tekening, 1 = volwassen. */
  scale: number;
  /** Wat de Buddy draagt of bij zich heeft. Leeg in het eerste trimester van de Baby-vorm. */
  accessories: string[];
}

/**
 * De vormen, van klein naar groot. Er is nog maar één Buddy-tekening (per
 * stemming), dus een vorm is voorlopig grootte + accessoire. Komen er echte
 * tekeningen per vorm, dan horen ze hier.
 *
 * Staat de 3de kleuterklas live, dan is vorm N die van leerjaar N: de kleuter
 * begint bij Baby, het 6de leerjaar is Meester. In Test begint het 1ste
 * leerjaar nog bij Baby (en een testkleuter ook), en komt Meester niet voor.
 */
const FORMS: { prefix?: string; scale: number; accessory?: string }[] = [
  { prefix: 'Baby', scale: 0.72 },
  { prefix: 'Kleine', scale: 0.78, accessory: '🎀' },
  { scale: 0.84, accessory: '🧢' },
  { prefix: 'Flinke', scale: 0.9, accessory: '🧣' },
  { prefix: 'Grote', scale: 0.95, accessory: '🎒' },
  { prefix: 'Wijze', scale: 1, accessory: '👑' },
  { prefix: 'Meester', scale: 1, accessory: '🎓' },
];

/** Wat er per trimester bij komt. */
const PHASE_EXTRA: Record<GrowthPhase, string | undefined> = {
  1: undefined,
  2: '🍃',
  3: '🌼',
};

export function growthForm(stage: number, name = buddySpecies().name, kindergartenLive = false): GrowthForm {
  const rounded = Math.round(stage);
  const s = Math.min(MAX_GROWTH_STAGE, Math.max(MIN_GROWTH_STAGE, Number.isNaN(rounded) ? 1 : rounded));
  const grade = Math.floor((s - 1) / 3) + 1;
  const phase = ((((s - 1) % 3) + 3) % 3 + 1) as GrowthPhase;
  const form = FORMS[kindergartenLive ? grade : Math.max(0, grade - 1)];
  return {
    stage: s,
    grade,
    phase,
    title: form.prefix ? `${form.prefix} ${name}` : name,
    scale: Math.min(1, form.scale + (phase - 1) * 0.02),
    accessories: [form.accessory, PHASE_EXTRA[phase]].filter((a): a is string => !!a),
  };
}

const dayNumber = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m - 1, d) / 86_400_000);

/**
 * Dagen tot de volgende trimestergroei (1 januari of 1 april). `null` in het
 * derde trimester: de volgende groei is het nieuwe leerjaar, en dat zet een
 * ouder in het ouderportaal — geen vaste datum om af te tellen.
 */
export function daysUntilNextGrowth(ts = Date.now()): number | null {
  const { year, month, day } = careCalendarDay(ts);
  const phase = phaseOfMonth(month);
  if (phase === 3) return null;
  const today = dayNumber(year, month, day);
  const next = phase === 1 ? dayNumber(year + 1, 1, 1) : dayNumber(year, 4, 1);
  return next - today;
}
