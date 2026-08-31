import type { LucideIcon } from 'lucide-react';
import { Leaf, Cloud } from 'lucide-react';
import { clampToSupportedGrade } from '@/data/difficultyConfig';

/**
 * Per-grade visual identity for the quest map and stage screens.
 *
 * GRADE-2 PILOT: the grade-2 theme below is a first-draft concept (name,
 * checkpoint names, palette) — not signed off as final branding. It's gated
 * by the same clampToSupportedGrade() used for content/difficulty, so it
 * only reaches real users once MAX_SUPPORTED_GRADE is raised in
 * difficultyConfig.ts.
 *
 * Note: the underlying route is still `/app/stage/fluisterbos/:stage` for
 * every grade — "fluisterbos" is a legacy technical slug now, not a design
 * decision. Re-parameterizing the URL itself would mean touching every
 * exercise screen's navigate() call for a purely cosmetic win, so the theme
 * changes what's rendered, not the route.
 */

export interface DecorativeElement {
  icon: string;
  top: string;
  left: string;
  size: string;
  rotate: string;
  opacity: string;
}

export interface WorldTheme {
  title: string;
  stageNames: Record<number, string>;
  stageIcons: Record<number, string>;
  decorativeElements: DecorativeElement[];
  pathGradientStops: { offset: string; color: string }[];
  classes: {
    /** Root page background gradient. */
    pageBackground: string;
    /** Primary surface color (cards, buttons, avatar fallback bg). */
    surfaceBg: string;
    /** Darker surface shade (button bottoms, track bg). */
    surfaceDarkBg: string;
    surfaceDarkBorder: string;
    /** Translucent nav bar background. */
    navBg: string;
    /** Shared border accent color used across nav/track/buttons. */
    borderAccent: string;
    /** "Leerjaar N" label text color. */
    accentText: string;
    /** Muted accent, e.g. the back-chevron icon. */
    accentMutedText: string;
    /** World title gradient (from/via/to classes only). */
    titleGradient: string;
    avatarRing: string;
    /** Border on the active/unlocked checkpoint label. */
    checkpointActiveBorder: string;
    /** Background on the active/unlocked checkpoint label (own literal class
     * so the opacity suffix stays a static string Tailwind's scanner can see —
     * it can't be composed at runtime from surfaceBg + "/90"). */
    checkpointActiveBg: string;
  };
  stageScreen: {
    title: string;
    icon: LucideIcon;
    iconColor: string;
  };
}

const GRADE_1_THEME: WorldTheme = {
  title: 'Het Magische Letterbos',
  stageNames: {
    1: 'Fluisterbomen',
    2: 'Borrelende Beek',
    3: 'Woordenwoud',
  },
  stageIcons: {
    1: '🌳',
    2: '🌊',
    3: '🦊',
  },
  decorativeElements: [
    { icon: '🌲', top: '15%', left: '10%', size: 'text-6xl', rotate: '-rotate-6', opacity: 'opacity-40' },
    { icon: '🍄', top: '28%', left: '80%', size: 'text-5xl', rotate: 'rotate-12', opacity: 'opacity-50' },
    { icon: '🌲', top: '48%', left: '88%', size: 'text-7xl', rotate: 'rotate-6', opacity: 'opacity-30' },
    { icon: '✨', top: '35%', left: '15%', size: 'text-3xl', rotate: 'rotate-0', opacity: 'opacity-60 animate-pulse' },
    { icon: '🦉', top: '5%', left: '78%', size: 'text-4xl', rotate: '-rotate-12', opacity: 'opacity-40' },
    { icon: '🌲', top: '78%', left: '12%', size: 'text-6xl', rotate: 'rotate-3', opacity: 'opacity-40' },
    { icon: '🌺', top: '88%', left: '85%', size: 'text-4xl', rotate: 'rotate-45', opacity: 'opacity-50' },
    { icon: '🦋', top: '68%', left: '20%', size: 'text-3xl', rotate: '-rotate-12', opacity: 'opacity-50' },
    { icon: '🌲', top: '10%', left: '30%', size: 'text-5xl', rotate: '-rotate-3', opacity: 'opacity-30' },
    { icon: '✨', top: '65%', left: '85%', size: 'text-2xl', rotate: 'rotate-0', opacity: 'opacity-60 animate-pulse' },
    { icon: '🍄', top: '92%', left: '25%', size: 'text-3xl', rotate: '-rotate-12', opacity: 'opacity-40' },
  ],
  pathGradientStops: [
    { offset: '0%', color: '#10b981' },
    { offset: '30%', color: '#06b6d4' },
    { offset: '65%', color: '#6366f1' },
    { offset: '100%', color: '#a855f7' },
  ],
  classes: {
    pageBackground: 'bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618]',
    surfaceBg: 'bg-[#2d1b54]',
    surfaceDarkBg: 'bg-[#1c1134]',
    surfaceDarkBorder: 'border-[#1c1134]',
    navBg: 'bg-[#1a103c]/80',
    borderAccent: 'border-[#3b2d71]',
    accentText: 'text-[#a78bfa]',
    accentMutedText: 'text-[#9d8bce]',
    titleGradient: 'from-amber-200 via-yellow-400 to-amber-200',
    avatarRing: 'border-amber-400',
    checkpointActiveBorder: 'border-[#a78bfa]/50',
    checkpointActiveBg: 'bg-[#2d1b54]/90',
  },
  stageScreen: {
    title: 'Het Fluisterbos',
    icon: Leaf,
    iconColor: 'text-teal-500',
  },
};

// GRADE-2 PILOT — first-draft "sky kingdom" concept, distinct from grade 1's
// night forest. Not curriculum/brand-reviewed.
const GRADE_2_THEME: WorldTheme = {
  title: 'Het Wolkenrijk',
  stageNames: {
    1: 'Zonnewei',
    2: 'Wolkenbrug',
    3: 'Sterrenpiek',
  },
  stageIcons: {
    1: '☀️',
    2: '🌈',
    3: '⭐',
  },
  decorativeElements: [
    { icon: '☁️', top: '15%', left: '10%', size: 'text-6xl', rotate: '-rotate-6', opacity: 'opacity-40' },
    { icon: '🌤️', top: '28%', left: '80%', size: 'text-5xl', rotate: 'rotate-12', opacity: 'opacity-50' },
    { icon: '☁️', top: '48%', left: '88%', size: 'text-7xl', rotate: 'rotate-6', opacity: 'opacity-30' },
    { icon: '✨', top: '35%', left: '15%', size: 'text-3xl', rotate: 'rotate-0', opacity: 'opacity-60 animate-pulse' },
    { icon: '🕊️', top: '5%', left: '78%', size: 'text-4xl', rotate: '-rotate-12', opacity: 'opacity-40' },
    { icon: '☁️', top: '78%', left: '12%', size: 'text-6xl', rotate: 'rotate-3', opacity: 'opacity-40' },
    { icon: '🪁', top: '88%', left: '85%', size: 'text-4xl', rotate: 'rotate-45', opacity: 'opacity-50' },
    { icon: '🦋', top: '68%', left: '20%', size: 'text-3xl', rotate: '-rotate-12', opacity: 'opacity-50' },
    { icon: '☁️', top: '10%', left: '30%', size: 'text-5xl', rotate: '-rotate-3', opacity: 'opacity-30' },
    { icon: '✨', top: '65%', left: '85%', size: 'text-2xl', rotate: 'rotate-0', opacity: 'opacity-60 animate-pulse' },
    { icon: '🌤️', top: '92%', left: '25%', size: 'text-3xl', rotate: '-rotate-12', opacity: 'opacity-40' },
  ],
  pathGradientStops: [
    { offset: '0%', color: '#f59e0b' },
    { offset: '30%', color: '#38bdf8' },
    { offset: '65%', color: '#0ea5e9' },
    { offset: '100%', color: '#6366f1' },
  ],
  classes: {
    pageBackground: 'bg-gradient-to-b from-[#1e3a8a] via-[#0c4a6e] to-[#082f49]',
    surfaceBg: 'bg-[#0c4a6e]',
    surfaceDarkBg: 'bg-[#082f49]',
    surfaceDarkBorder: 'border-[#082f49]',
    navBg: 'bg-[#0c4a6e]/80',
    borderAccent: 'border-[#38bdf8]/60',
    accentText: 'text-[#7dd3fc]',
    accentMutedText: 'text-[#7dd3fc]/70',
    titleGradient: 'from-cyan-200 via-sky-300 to-cyan-200',
    avatarRing: 'border-sky-400',
    checkpointActiveBorder: 'border-[#7dd3fc]/50',
    checkpointActiveBg: 'bg-[#0c4a6e]/90',
  },
  stageScreen: {
    title: 'Het Wolkenrijk',
    icon: Cloud,
    iconColor: 'text-sky-500',
  },
};

const WORLD_THEMES: Record<number, WorldTheme> = {
  1: GRADE_1_THEME,
  2: GRADE_2_THEME,
};

/**
 * Resolves the visual theme for a child's grade. Clamped the same way as
 * content/difficulty so theme and content always ship together — raising
 * MAX_SUPPORTED_GRADE is the single switch that turns both on.
 */
export function getWorldTheme(grade: number | null | undefined): WorldTheme {
  return WORLD_THEMES[clampToSupportedGrade(grade)] ?? GRADE_1_THEME;
}
