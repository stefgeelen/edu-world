import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { NOT_ON_BETA_LIST_MESSAGE, isNotOnBetaListError } from '@/lib/errorMessages';

/** Supabase sends a failed sign-in back with ?error_description= (or in the hash). */
function errorFromUrl(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return query.get('error_description') ?? hash.get('error_description');
}

export function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const handled = useRef(false);
  // Read once, before the Supabase client can tidy up the URL.
  const [urlError] = useState(errorFromUrl);

  useEffect(() => {
    if (loading || handled.current) return;

    if (!user) {
      toast.error(
        isNotOnBetaListError(urlError) ? NOT_ON_BETA_LIST_MESSAGE : 'Inloggen mislukt. Probeer het opnieuw.',
        { duration: 10000 }
      );
      navigate('/auth', { replace: true });
      return;
    }

    handled.current = true;

    supabase.rpc('has_parent_pin').then(({ data, error }) => {
      if (error) {
        toast.error('Er ging iets mis. Probeer het opnieuw.');
        navigate('/auth', { replace: true });
        return;
      }
      if (data) {
        navigate('/app', { replace: true });
      } else {
        navigate('/auth/setup-pin?redirect=/app/add-child', { replace: true });
      }
    });
  }, [loading, user, navigate, urlError]);

  return <LoadingSpinner tone="dark" />;
}
