import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLE_STICKER_RUNS } from '@/data/difficultyConfig';

export interface TableProgress {
  table: number;
  runs: number;
  flawlessRuns: number;
  /** Known: finished TABLE_STICKER_RUNS times without a mistake. */
  sticker: boolean;
}

/** Per table the child practised: runs, runs without a mistake, and the sticker. */
export function useTimesTables(childId: string | undefined) {
  return useQuery({
    queryKey: ['times-tables', childId],
    queryFn: async (): Promise<Record<number, TableProgress>> => {
      const { data, error } = await supabase.rpc('child_times_tables', { p_child_id: childId! });
      if (error) throw error;
      const byTable: Record<number, TableProgress> = {};
      for (const row of data ?? []) {
        byTable[row.table_number] = {
          table: row.table_number,
          runs: row.runs,
          flawlessRuns: row.flawless_runs,
          sticker: row.flawless_runs >= TABLE_STICKER_RUNS,
        };
      }
      return byTable;
    },
    enabled: !!childId,
  });
}

/**
 * Saves a finished run of one table (never a game-over). Pays nothing:
 * Munten and rewards go through complete_exercise as for every exercise.
 */
export function useRecordTimesTableRun(childId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ table, mistakes }: { table: number; mistakes: number }) => {
      const { error } = await supabase.rpc('record_times_table_run', {
        p_child_id: childId!,
        p_table_number: table,
        p_mistakes: mistakes,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['times-tables', childId] }),
    onError: (err) => console.error('Could not save times table run', err),
  });
}

export interface TimesTableAccess {
  /** Maaltafels the child can practise now. */
  multiply: number[];
  /** Deeltafels the child can practise now. */
  divide: number[];
  /** What the parent opened earlier than the calendar. */
  extraMultiply: number[];
  extraDivide: number[];
  /** When each table opens in the school year (times_table_schedule). */
  schedule: { table: number; kind: 'multiply' | 'divide'; month: number; day: number }[];
}

/** Which tables are open for a child: the calendar plus what the parent opened. */
export function useTimesTableAccess(childId: string | undefined) {
  return useQuery({
    queryKey: ['times-table-access', childId],
    queryFn: async (): Promise<TimesTableAccess> => {
      const { data, error } = await supabase.rpc('child_times_table_access', { p_child_id: childId! });
      if (error) throw error;
      const row = data as {
        multiply: number[]; divide: number[]; extra_multiply: number[]; extra_divide: number[];
        schedule: TimesTableAccess['schedule'] | null;
      };
      return {
        multiply: row.multiply ?? [],
        divide: row.divide ?? [],
        extraMultiply: row.extra_multiply ?? [],
        extraDivide: row.extra_divide ?? [],
        schedule: row.schedule ?? [],
      };
    },
    enabled: !!childId,
    // Offline the exercise falls back to its trimester's tables instead of waiting.
    retry: 1,
  });
}
