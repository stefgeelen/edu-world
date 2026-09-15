import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type ParentChild = Pick<
  Tables<'children'>,
  'id' | 'name' | 'age' | 'grade' | 'xp' | 'level' | 'streak' | 'avatar_url' | 'avatar_id' | 'pending_promotion'
>;

/**
 * The logged-in parent's children, ordered oldest first.
 *
 * Single source for the `['parent-children', userId]` cache entry. React Query
 * caches by key alone, so two screens reading this key with different `select()`
 * column lists would overwrite each other's cached rows — whichever fetched last
 * winning, leaving the other rendering against missing fields.
 */
export function useParentChildren() {
  const { user } = useAuth();

  return useQuery<ParentChild[]>({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, age, grade, xp, level, streak, avatar_url, avatar_id, pending_promotion')
        .eq('parent_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
