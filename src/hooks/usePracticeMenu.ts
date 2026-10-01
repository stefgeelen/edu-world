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
