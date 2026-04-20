import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const SESSION_KEY = 'parent_pin_ok';

/**
 * Check if the current authenticated parent already has a PIN configured.
 */
export function useHasParentPin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['has-parent-pin', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_parent_pin');
      if (error) throw error;
      return Boolean(data);
    },
  });
}

/**
 * Mutation to set/update the parent's 4-digit PIN.
 * Server-side validates 4-digit numeric format and bcrypt-hashes the value.
 */
export function useSetParentPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => {
      const { error } = await supabase.rpc('set_parent_pin', { p_pin: pin });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['has-parent-pin'] });
      sessionStorage.setItem(SESSION_KEY, '1');
    },
  });
}

/**
 * Mutation to verify a PIN attempt. On success, marks the session unlocked.
 */
export function useVerifyParentPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      const { data, error } = await supabase.rpc('verify_parent_pin', { p_pin: pin });
      if (error) throw error;
      return Boolean(data);
    },
    onSuccess: (ok) => {
      if (ok) sessionStorage.setItem(SESSION_KEY, '1');
    },
  });
}

export const parentPinSession = {
  isUnlocked: () => sessionStorage.getItem(SESSION_KEY) === '1',
  unlock: () => sessionStorage.setItem(SESSION_KEY, '1'),
  lock: () => sessionStorage.removeItem(SESSION_KEY),
};
