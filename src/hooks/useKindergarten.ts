import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useSpeech } from '@/hooks/useSpeech';
import { firstTimeSpoken } from '@/lib/spokenOnce';

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

/**
 * Is het kind dat nu speelt een kleuter (3de kleuterklas)? Een kleuter kan
 * niet lezen: dan zegt de Buddy ook buiten de oefeningen wat er staat.
 */
export function useIsKleuter(): boolean {
  const { data: child } = useCurrentChild();
  return child?.grade === 0;
}

/**
 * Bij een kleuter zegt de Buddy `text` vanzelf, één keer per sessie (zoals het
 * welkom in Oefenen): terugkomen naar dezelfde zin blijft stil, een nieuwe zin
 * zegt hij wel. Voor andere kinderen doet dit niets.
 */
export function useKleuterSays(scope: string, text: string | null | undefined) {
  const { data: child } = useCurrentChild();
  const { speak } = useSpeech();
  const kleuter = child?.grade === 0;
  useEffect(() => {
    if (!kleuter || !child || !text) return;
    if (firstTimeSpoken(`${scope}.${child.id}`, text)) speak(text);
  }, [kleuter, child, scope, text, speak]);
}
