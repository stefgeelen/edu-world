import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useExerciseGrade } from '@/hooks/useExerciseGrade';
import { READING_THEME_COUNT, calendarReadingTheme } from '@/data/readingThemes';

export interface ChildReadingTheme {
  /** The theme the exercises use. */
  theme: number;
  /** What the calendar says today. */
  calendarTheme: number;
  /** What the parent picked, or null when it follows the calendar. */
  chosenTheme: number | null;
}

/** A child's reading theme as the server decides it (child_reading_theme). */
export function useChildReadingTheme(childId: string | undefined) {
  return useQuery({
    queryKey: ['reading-theme', childId],
    queryFn: async (): Promise<ChildReadingTheme> => {
      const { data, error } = await supabase.rpc('child_reading_theme', { p_child_id: childId! });
      if (error) throw error;
      const row = data as { theme: number; calendar_theme: number; chosen_theme: number | null };
      return { theme: row.theme, calendarTheme: row.calendar_theme, chosenTheme: row.chosen_theme };
    },
    enabled: !!childId,
    // Offline the exercise falls back to the calendar instead of waiting.
    retry: 1,
  });
}

/**
 * In a reading exercise: the theme whose words to use. Null when the
 * exercise does not follow themes (not the 1ste leerjaar), the last theme in
 * Herhalen (an older child gets everything), undefined while loading.
 */
export function useReadingTheme(): number | null | undefined {
  const grade = useExerciseGrade();
  const { data: child } = useCurrentChild();
  const ownGrade = grade === 1 && child?.grade === 1;
  const { data, isError } = useChildReadingTheme(ownGrade ? child?.id : undefined);

  if (grade !== 1) return null;
  if (child && child.grade > 1) return READING_THEME_COUNT;
  if (data) return data.theme;
  if (isError || child === null) return calendarReadingTheme(new Date());
  return undefined;
}
