import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (loading || handled.current) return;

    if (!user) {
      toast.error('Inloggen mislukt. Probeer het opnieuw.');
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
  }, [loading, user, navigate]);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50">
      <LoadingSpinner />
    </div>
  );
}
