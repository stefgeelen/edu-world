import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapDbError } from '@/lib/errorMessages';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { createBuddy, tick, type BuddyState } from '@/lib/buddy/state';
import { CARE_ITEMS, type CareActionId } from '@/lib/buddy/catalog';
import type { NeedId } from '@/lib/buddy/constants';
import type { Tables } from '@/integrations/supabase/types';

/** Duur van de viering-animatie na een Care Action. */
export const CARE_FX_MS = 1600;

export interface CareFx {
  action: CareActionId;
  emoji?: string | undefined;
  at: number;
}

type BuddyStateRow = Tables<'buddy_states'>;

// `needs`/`inventory` are jsonb columns (typed as `Json` by codegen); narrow them
// to their known app-level shape here rather than at every call site.
interface CareRpcResult {
  ok: boolean;
  message: string;
  state: BuddyStateRow;
}

function rowToState(row: BuddyStateRow): BuddyState {
  return {
    name: 'Nootje',
    needs: row.needs as unknown as Record<NeedId, number>,
    munten: row.munten,
    inventory: (row.inventory as unknown as Record<string, number>) ?? {},
    lastTick: new Date(row.last_tick).getTime(),
    sleepUntil: row.sleep_until ? new Date(row.sleep_until).getTime() : null,
    healthZeroSince: row.health_zero_since ? new Date(row.health_zero_since).getTime() : null,
    dead: row.dead,
  };
}

/** How often the shared clock advances, driving countdowns and live decay. */
const TICK_MS = 5_000;

interface BuddyFxValue {
  careFx: CareFx | null;
  playCareFx: (action: CareActionId, emoji?: string) => void;
  /** Shared clock — see BuddyFxProvider. */
  now: number;
}

const BuddyFxContext = createContext<BuddyFxValue | null>(null);

/**
 * Shares two things across everything Buddy-related on a screen:
 *
 * - the Care Action celebration, between BuddyStage and CareActionBar (siblings
 *   that each call `useBuddy()` independently — without this, the trigger set by
 *   CareActionBar's `care()` would live in its own hook instance and never reach
 *   the BuddyStage meant to render it);
 * - one ticking clock, so N Buddy consumers on a screen cost one timer rather
 *   than one each.
 */
export function BuddyFxProvider({ children }: { children: ReactNode }) {
  const [careFx, setCareFx] = useState<CareFx | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playCareFx = useCallback((action: CareActionId, emoji?: string) => {
    if (fxTimer.current) clearTimeout(fxTimer.current);
    setCareFx({ action, emoji, at: Date.now() });
    fxTimer.current = setTimeout(() => setCareFx(null), CARE_FX_MS);
  }, []);

  useEffect(() => () => {
    if (fxTimer.current) clearTimeout(fxTimer.current);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const value = useMemo(() => ({ careFx, playCareFx, now }), [careFx, playCareFx, now]);
  return <BuddyFxContext.Provider value={value}>{children}</BuddyFxContext.Provider>;
}

// Screens that don't render BuddyStage (e.g. BuddyShop) call useBuddy() without
// a BuddyFxProvider ancestor — fall back to an inert no-op rather than forcing
// every route to wrap itself in a provider it has no use for. Their `now` is
// fixed at first render, which is fine: nothing they show decays.
const NOOP_FX: BuddyFxValue = { careFx: null, playCareFx: () => {}, now: 0 };

/**
 * Buddy Room state and Care Actions, backed by the `buddy_states` table and its
 * RPCs (decay/pricing are computed server-side so a child can't manipulate them
 * from the client). See supabase/migrations/20260911120000_add_buddy_care.sql.
 */
export function useBuddy() {
  const { data: child } = useCurrentChild();
  const childId = child?.id;
  const queryClient = useQueryClient();
  const queryKey = ['buddy-state', childId];

  const { data: row, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('buddy_get_or_create', { p_child_id: childId! });
      if (error) throw error;
      return data;
    },
    enabled: !!childId,
  });

  const { careFx, playCareFx, now: sharedNow } = useContext(BuddyFxContext) ?? NOOP_FX;

  // Drives the live countdown between server round-trips; the actual decay is
  // only ever committed server-side by the RPCs above.
  const now = sharedNow || Date.now();

  const buddy = useMemo<BuddyState>(() => {
    const base = row ? rowToState(row) : createBuddy(now);
    return tick(base, now);
  }, [row, now]);

  const careMutation = useMutation({
    mutationFn: async ({ action, itemId }: { action: CareActionId; itemId?: string }) => {
      if (!childId) throw new Error('No child found');
      const { data, error } = await supabase.rpc('buddy_care', {
        p_child_id: childId,
        p_action: action,
        p_item_id: itemId ?? null,
      });
      if (error) throw error;
      return data as unknown as CareRpcResult;
    },
    onSuccess: (res, { action, itemId }) => {
      queryClient.setQueryData(queryKey, res.state);
      queryClient.invalidateQueries({ queryKey });
      if (res.ok) {
        toast.success(res.message);
        const emoji = itemId ? CARE_ITEMS.find((i) => i.id === itemId)?.emoji : undefined;
        playCareFx(action, emoji);
      } else {
        toast.error(res.message);
      }
    },
    onError: (error) => toast.error(mapDbError(error)),
  });

  const buyMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!childId) throw new Error('No child found');
      const { data, error } = await supabase.rpc('buddy_buy', { p_child_id: childId, p_item_id: itemId });
      if (error) throw error;
      return data as unknown as CareRpcResult;
    },
    onSuccess: (res) => {
      queryClient.setQueryData(queryKey, res.state);
      queryClient.invalidateQueries({ queryKey });
      if (res.ok) toast.success(res.message); else toast.error(res.message);
    },
    onError: (error) => toast.error(mapDbError(error)),
  });

  const reviveMutation = useMutation({
    mutationFn: async () => {
      if (!childId) throw new Error('No child found');
      const { data, error } = await supabase.rpc('buddy_revive', { p_child_id: childId });
      if (error) throw error;
      return data as unknown as CareRpcResult;
    },
    onSuccess: (res) => {
      queryClient.setQueryData(queryKey, res.state);
      queryClient.invalidateQueries({ queryKey });
      if (res.ok) toast.success(res.message);
    },
    onError: (error) => toast.error(mapDbError(error)),
  });

  return {
    buddy,
    loaded: !isLoading && !!row,
    care: (action: CareActionId, itemId?: string) => careMutation.mutate({ action, itemId }),
    buy: (itemId: string) => buyMutation.mutate(itemId),
    reviveBuddy: () => reviveMutation.mutate(),
    careFx,
    playCareFx,
    now,
  };
}
