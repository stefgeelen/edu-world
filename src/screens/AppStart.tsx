import { Navigate } from 'react-router-dom';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { APP_PATHS } from '@/routes/paths';

/**
 * `/app`: waar inloggen en "kind toevoegen" op uitkomen. Zonder kind naar
 * "kind toevoegen", anders naar de kamer van de Buddy.
 */
export function AppStart() {
  const { data: child, isLoading } = useCurrentChild();

  if (isLoading) return <LoadingSpinner />;
  return <Navigate to={child ? APP_PATHS.home : APP_PATHS.addChild} replace />;
}
