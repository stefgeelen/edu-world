import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * The admin engagement dashboard, aggregated server-side.
 *
 * Every number here used to be either absent or only obtainable by downloading
 * the whole attempts table into the browser. `admin_engagement_stats` returns
 * the lot as one JSON payload and enforces the admin check itself.
 */

export interface EngagementStats {
  generated_at: string;
  totals: { accounts: number; children: number; attempts: number; active_subscriptions: number };
  new_signups: { accounts_7d: number; accounts_30d: number; children_7d: number };
  active_children: { d1: number; d7: number; d30: number };
  active_accounts: { d1: number; d7: number; d30: number };
  activation: {
    children_total: number;
    children_opened: number;
    children_started: number;
    children_never_started: number;
  };
  attempts: { last_7d: number; prev_7d: number };
  daily: { day: string; attempts: number; children: number }[];
  by_hour: { hour: number; attempts: number }[];
  retention: {
    cohort: string;
    cohort_start: string;
    size: number;
    /** null while the cohort is too young for the bucket to mean anything. */
    w1: number | null;
    w2: number | null;
    w4: number | null;
    w6: number | null;
  }[];
  top_exercises: { title: string; subject: string; attempts: number; avg_stars: number }[];
  by_subject: { subject: string; attempts: number; avg_stars: number }[];
}

export function useAdminEngagement() {
  return useQuery<EngagementStats>({
    queryKey: ['admin-engagement'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_engagement_stats');
      if (error) throw error;
      return data as unknown as EngagementStats;
    },
    // The underlying numbers move slowly and the query scans the attempts
    // table; no reason to refetch it on every tab switch.
    staleTime: 5 * 60 * 1000,
  });
}
