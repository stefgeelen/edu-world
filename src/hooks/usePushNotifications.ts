import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { invokeFunction } from '@/lib/invokeFunction';
import { mapDbError } from '@/lib/errorMessages';
import { currentPushEndpoint, deviceLabel, disablePush, enablePush, readPushStatus, type PushStatus } from '@/lib/push';

export interface PushPreferences {
  buddy: boolean;
  insights: boolean;
}

/** No row yet means everything is on. */
const DEFAULT_PREFERENCES: PushPreferences = { buddy: true, insights: true };

/** Whether this device gets notifications, and switching that. */
export function usePushStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['push-status', user?.id];

  const status = useQuery({
    queryKey,
    queryFn: readPushStatus,
    enabled: !!user,
  });

  const onSettled = (next: PushStatus | undefined) => {
    if (next) queryClient.setQueryData(queryKey, next);
    queryClient.invalidateQueries({ queryKey: ['push-status'] });
    queryClient.invalidateQueries({ queryKey: ['push-devices'] });
  };

  const enable = useMutation({
    mutationFn: enablePush,
    onSuccess: (next) => {
      onSettled(next);
      if (next === 'on') toast.success('Meldingen staan aan');
      else if (next === 'denied') toast.error('Je browser blokkeert meldingen voor Leapio. Zet ze aan in de instellingen van je toestel.');
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const disable = useMutation({
    mutationFn: disablePush,
    onSuccess: (next) => {
      onSettled(next);
      toast.success('Meldingen staan uit op dit toestel');
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const sendTest = useMutation({
    mutationFn: () => invokeFunction<{ devices: number }>('send-push-notifications', { test: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['push-status'] });
      if (data.devices > 0) toast.success('Testmelding verstuurd');
      else toast.error('De testmelding kwam niet aan. Zet meldingen uit en weer aan.');
    },
    onError: (e) =>
      toast.error(
        e instanceof Error && e.message.includes('Too many')
          ? 'Je stuurde net al een paar testmeldingen. Probeer het over een uur opnieuw.'
          : 'De testmelding kon niet verstuurd worden.'
      ),
  });

  return { status: status.data, isLoading: status.isLoading, enable, disable, sendTest };
}

/** Which kinds of notifications the parent wants (on every device). */
export function usePushPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferences = useQuery({
    queryKey: ['push-preferences', user?.id],
    queryFn: async (): Promise<PushPreferences> => {
      const { data, error } = await supabase
        .from('push_preferences')
        .select('buddy, insights')
        .eq('parent_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_PREFERENCES;
    },
    enabled: !!user,
  });

  const update = useMutation({
    mutationFn: async (next: PushPreferences) => {
      const { error } = await supabase
        .from('push_preferences')
        .upsert({ parent_id: user!.id, ...next, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['push-preferences'] }),
    onError: (e) => toast.error(mapDbError(e)),
  });

  return { preferences: preferences.data ?? DEFAULT_PREFERENCES, isLoading: preferences.isLoading, update };
}

/**
 * The parent's other devices with notifications on (not this one), as labels
 * like "je iPhone". Notifications are per device, so without this a laptop
 * reads "off" while the parent's phone gets them fine.
 */
export function useOtherPushDevices() {
  const { user } = useAuth();

  const devices = useQuery({
    queryKey: ['push-devices', user?.id],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, user_agent')
        .eq('parent_id', user!.id);
      if (error) throw error;
      const own = await currentPushEndpoint();
      return (data ?? []).filter((d) => d.endpoint !== own).map((d) => deviceLabel(d.user_agent));
    },
    enabled: !!user,
  });

  return devices.data ?? [];
}
