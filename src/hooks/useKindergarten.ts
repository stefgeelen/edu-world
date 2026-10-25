import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';

export type KindergartenMode = 'admins' | 'all';

/**
 * The 3de kleuterklas switch (Admin → Oefeningen): in Test ('admins') only an
 * admin can pick it, in Live ('all') every parent. Live also decides the
 * Buddy's form names (src/lib/buddy/growth.ts). The database refuses grade 0
 * for anyone else, see 20261025180000_kindergarten_grade.sql.
 *
 * Before that migration runs the table is missing: the query fails and the
 * switch reads as Test.
 */
export function useKindergartenMode() {
  const { user } = useAuth();
  const { data: mode = 'admins', isLoading } = useQuery({
    queryKey: ['kindergarten-settings'],
    queryFn: async (): Promise<KindergartenMode> => {
      const { data, error } = await supabase
        .from('kindergarten_settings')
        .select('mode')
        .maybeSingle();
      if (error) throw error;
      return data?.mode === 'all' ? 'all' : 'admins';
    },
    enabled: !!user,
  });
  return { mode, live: mode === 'all', isLoading };
}

/** Can this user put a child in the 3de kleuterklas? */
export function useKindergarten() {
  const { mode, live, isLoading } = useKindergartenMode();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  return { mode, live, open: live || isAdmin, isLoading: isLoading || roleLoading };
}
