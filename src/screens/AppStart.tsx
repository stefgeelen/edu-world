import { Navigate } from 'react-router-dom';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useBuddyRow } from '@/hooks/useBuddy';
import { needsPlayerPick, usePlayers } from '@/hooks/usePlayers';
import { useAuth } from '@/context/AuthContext';
import { usePlayingChildId } from '@/lib/playingChild';
import { buddyChoiceMode } from '@/lib/buddy/species';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { APP_PATHS } from '@/routes/paths';

/**
 * `/app`: waar inloggen, "kind toevoegen" en de geïnstalleerde app op uitkomen.
 * Zonder kind naar "kind toevoegen"; kunnen er meerdere kinderen spelen en weet
 * dit toestel niet wie, naar "Wie speelt er?"; heeft het kind nog geen Buddy
 * gekozen, of is er een nieuw schooljaar, naar de Buddy-keuze; anders naar de
 * Buddy.
 */
export function AppStart() {
  const { user } = useAuth();
  const playingChildId = usePlayingChildId(user?.id);
  const { data: players, isLoading: playersLoading } = usePlayers();
  const { data: child, isLoading } = useCurrentChild();
  const { data: buddyRow, isError: buddyError } = useBuddyRow();

  if (isLoading || playersLoading) return <LoadingSpinner />;
  if (players && needsPlayerPick(players, playingChildId)) {
    return <Navigate to={APP_PATHS.whoIsPlaying} replace />;
  }
  if (!child) return <Navigate to={APP_PATHS.addChild} replace />;
  // Lukt het laden van de Buddy niet, dan toont de kamer zelf de fout.
  if (buddyError) return <Navigate to={APP_PATHS.home} replace />;
  if (!buddyRow) return <LoadingSpinner />;

  const choice = buddyChoiceMode(buddyRow.species_school_year, new Date());
  return <Navigate to={choice ? APP_PATHS.chooseBuddy : APP_PATHS.home} replace />;
}
