import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Player {
  id: string;
  name: string;
  /** De gekozen Buddy; null zolang het kind nog niet zelf koos. */
  species: string | null;
  /** Meer kinderen dan het pakket toelaat: zichtbaar, maar kan niet spelen. */
  paused: boolean;
}

/** The parent's children for "Wie speelt er?", oldest first (`my_players`). */
export function usePlayers() {
  const { user } = useAuth();

  return useQuery<Player[]>({
    queryKey: ['players', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_players');
      if (error) throw error;
      return (data as unknown as Player[]) ?? [];
    },
    enabled: !!user,
  });
}

/**
 * Whether this device still has to ask who is playing: more than one child can
 * play and the remembered choice is missing, removed or paused.
 */
export function needsPlayerPick(players: Player[], playingChildId: string | null) {
  const playable = players.filter(p => !p.paused);
  if (playable.length <= 1) return false;
  return !playable.some(p => p.id === playingChildId);
}
