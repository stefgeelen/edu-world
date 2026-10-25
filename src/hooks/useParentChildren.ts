import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type ParentChild = Pick<
  Tables<'children'>,
  'id' | 'name' | 'age' | 'grade' | 'streak' | 'paused'
> & {
  /**
   * Welke Buddy het kind gekozen heeft; null zolang het kind nog niet zelf
   * gekozen heeft. Een buddy_states-rij krijgt standaard 'nootje', dus pas
   * species_school_year zegt of er echt gekozen is (zie buddy_choose).
   */
  buddy_species: string | null;
};

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
        .select('id, name, age, grade, streak, paused, buddy_states(species, species_school_year)')
        .eq('parent_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(({ buddy_states, ...child }) => ({
        ...child,
        buddy_species: buddy_states?.species_school_year != null ? buddy_states.species : null,
      }));
    },
    enabled: !!user,
  });
}
