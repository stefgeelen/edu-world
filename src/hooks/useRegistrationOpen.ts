import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const REGISTRATION_SETTINGS_KEY = ['registration-settings'] as const;

/**
 * Open beta switch (Admin → Beta). Open: anyone can create an account, and the
 * website shows "Gratis starten" instead of the waiting-list form. Closed: only
 * an address on the waiting list can register (the database decides, see
 * 20261118120000_open_registration_switch.sql).
 *
 * Readable without an account. Before that migration runs the table is
 * missing: the query fails and registration reads as closed, which is what the
 * database does then too. A failed read is not retried, so the site falls back
 * to the waiting-list form at once.
 */
export function useRegistrationOpen() {
  const { data, isLoading } = useQuery({
    queryKey: REGISTRATION_SETTINGS_KEY,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('registration_settings')
        .select('open')
        .maybeSingle();
      if (error) throw error;
      return data?.open === true;
    },
    // On an error, show the closed state (the waiting-list form) at once
    // rather than an empty block through three retries.
    retry: false,
  });
  return { open: data === true, isLoading };
}
