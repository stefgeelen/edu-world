import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useCelebration } from '@/context/CelebrationContext';
import { useBuddyMessage } from '@/hooks/useBuddyMessage';
import { buddyToast } from '@/components/feedback/BuddyToast';
import type { Tables } from '@/integrations/supabase/types';

const STREAK_MILESTONES = new Set([3, 5, 7, 10, 14, 30]);

/** The columns of `children` the gameplay side reads. */
export type CurrentChild = Pick<
  Tables<'children'>,
  'id' | 'name' | 'grade' | 'xp' | 'level' | 'pending_promotion' | 'avatar_id' | 'streak' | 'max_unlocked_stage'
>;

/**
 * Returns the current child for the logged-in parent.
 * Reused across exercise hooks.
 *
 * Ordered by created_at so that a parent with several children always resolves
 * to the same one; without it "the" child was whichever row Postgres happened to
 * return first and could change between sessions.
 */
export function useCurrentChild() {
  const { user } = useAuth();

  return useQuery<CurrentChild | null>({
    queryKey: ['my-child', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, grade, xp, level, pending_promotion, avatar_id, streak, max_unlocked_stage')
        .eq('parent_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

interface CompleteExerciseParams {
  exerciseId: string;
  score: number;
  maxScore: number;
  stars: number;
  timeSpent: number;
  answers?: unknown[];
}

interface CompleteExerciseResult {
  attempt_id: string;
  xp_earned: number;
  all_trimesters_completed: boolean;
  completed_rewards: { id: string; title: string }[];
  leveled_up?: boolean;
  new_level?: number;
  streak?: number;
  munten_earned?: number;
  munten_total?: number;
}

/**
 * Mutation that calls the complete_exercise database function.
 * Automatically invalidates all progress-related queries and triggers celebrations.
 */
export function useCompleteExercise() {
  const queryClient = useQueryClient();
  const { data: child } = useCurrentChild();
  const { user } = useAuth();
  const { celebrateRewards, celebratePromotion } = useCelebration();
  const { getMessage } = useBuddyMessage();

  return useMutation({
    mutationFn: async (params: CompleteExerciseParams) => {
      if (!child?.id) throw new Error('No child found');

      const { data, error } = await supabase.rpc('complete_exercise', {
        p_child_id: child.id,
        p_exercise_id: params.exerciseId,
        p_score: params.score,
        p_max_score: params.maxScore,
        p_stars: params.stars,
        p_time_spent: params.timeSpent,
        p_answers: JSON.stringify(params.answers ?? []),
      });

      if (error) throw error;
      return data as unknown as CompleteExerciseResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stage-exercises-progress'] });
      queryClient.invalidateQueries({ queryKey: ['child-progress'] });
      queryClient.invalidateQueries({ queryKey: ['trimester-progress'] });
      queryClient.invalidateQueries({ queryKey: ['my-child'] });
      queryClient.invalidateQueries({ queryKey: ['my-children'] });
      queryClient.invalidateQueries({ queryKey: ['recent-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['child-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['parent-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['parent-rewards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      queryClient.invalidateQueries({ queryKey: ['parent-children', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['game-badges'] });
      queryClient.invalidateQueries({ queryKey: ['child-insights'] });
      queryClient.invalidateQueries({ queryKey: ['buddy-state'] });

      // Trigger celebrations
      if (data?.completed_rewards && data.completed_rewards.length > 0) {
        celebrateRewards(data.completed_rewards);
      }
      if (data?.all_trimesters_completed) {
        celebratePromotion();
      }

      if (data?.munten_earned) {
        buddyToast.cheer(`🪙 +${data.munten_earned} Munten voor je Buddy!`, { duration: 3500 });
      }

      // Buddy reactions to milestones
      if (data?.leveled_up) {
        const msg = getMessage('level_up');
        if (msg) buddyToast.cheer(msg.message, { duration: 5000 });
      }
      if (data?.streak && STREAK_MILESTONES.has(data.streak)) {
        const msg = getMessage('streak_milestone');
        if (msg) {
          buddyToast.cheer(`🔥 ${data.streak} dagen op rij! ${msg.message}`, { duration: 5500 });
        }
      }
    },
  });
}

