import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import type { Enums } from '@/integrations/supabase/types';

export type Subject = Enums<'subject_type'>;

/** One pickable type of exercise (clock, money, ...) at the child's current level. */
export interface PracticeOption {
  type_key: string;
  exercise_id: string;
  title: string;
  subject: Subject;
  /** DB route, e.g. "/exercises/clock/2" — the app route is "/app" + this. */
  route: string;
  /** How many of this type the child finished today. */
  done_today: number;
  /** Munten the next one of this type earns, before any Wish bonus. */
  next_munten: number;
  /** One of the Buddy's Wishes today. */
  wished: boolean;
  /** Only on Herhalen options: the lower grade this version belongs to. */
  grade?: number;
  /** Still in test: only admins get it. Never a Wish, never a quick start. */
  admin_only?: boolean;
}

export interface BuddyWish {
  type_key: string;
  title: string;
  subject: Subject;
  route: string;
  fulfilled: boolean;
}

export interface PracticeMenu {
  day: string;
  wish_bonus: number;
  /** What a first try of a type earns; below this, the child is repeating itself. */
  full_munten: number;
  exercises: PracticeOption[];
  wishes: BuddyWish[];
  /**
   * Herhalen: exercises from lower grades, one per type. Pay like any type,
   * never a Wish, and stay out of the quick starts. Missing before the
   * 20261013210000 migration.
   */
  review?: PracticeOption[];
}

/**
 * The exercises the child can pick from, how many Munten each pays out right
 * now, and the Buddy's Wishes for today — all decided server-side by the
 * `practice_menu` RPC, so the payout shown is exactly the payout earned.
 *
 * Invalidated by useCompleteExercise: every finished exercise changes what the
 * next one of its type is worth.
 */
export function usePracticeMenu() {
  const { data: child } = useCurrentChild();
  const childId = child?.id;

  return useQuery({
    queryKey: ['practice-menu', childId],
    queryFn: async (): Promise<PracticeMenu> => {
      const { data, error } = await supabase.rpc('practice_menu', { p_child_id: childId! });
      if (error) throw error;
      return data as unknown as PracticeMenu;
    },
    enabled: !!childId,
  });
}

/** Whether another one of this type pays less than a fresh one. */
export const isRepeated = (option: PracticeOption, menu: Pick<PracticeMenu, 'full_munten'>) =>
  option.next_munten < menu.full_munten;

/** The wish bonus is still up for grabs on this option. */
export const wishOpen = (option: PracticeOption) => option.wished && option.done_today === 0;

/**
 * A handful of exercises to start with one tap: the Buddy's open wishes first,
 * then types the child hasn't done today, then the rest — least done first, so
 * the shortcut itself nudges towards variety. Exercises still in test only
 * show up in the full list.
 */
export function quickStarts(menu: PracticeMenu, count = 4): PracticeOption[] {
  const rank = (o: PracticeOption) => (wishOpen(o) ? 0 : o.done_today === 0 ? 1 : 2);
  return menu.exercises
    .filter((o) => !o.admin_only)
    .map((o, i) => ({ o, i }))
    .sort((a, b) => rank(a.o) - rank(b.o) || a.o.done_today - b.o.done_today || a.i - b.i)
    .slice(0, count)
    .map(({ o }) => o);
}
