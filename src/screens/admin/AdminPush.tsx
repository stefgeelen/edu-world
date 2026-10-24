import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Send, Smartphone, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapDbError } from '@/lib/errorMessages';
import { cn } from '@/lib/utils';

type PushMode = 'off' | 'admins' | 'all';

interface KindStats {
  sent: number;
  measured: number;
  played_24h: number;
}

export interface PushStats {
  mode: PushMode;
  parents_total: number;
  parents_with_push: number;
  devices: number;
  sent_7d: number;
  sent_30d: number;
  failed_30d: number;
  measured_30d: number;
  played_24h_30d: number;
  by_kind: Partial<Record<string, KindStats>>;
}

const MODES: { value: PushMode; label: string; hint: string }[] = [
  { value: 'off', label: 'Uit', hint: 'Er vertrekt niets.' },
  { value: 'admins', label: 'Alleen admins', hint: 'Enkel jij krijgt meldingen: om te testen.' },
  { value: 'all', label: 'Iedereen', hint: 'Alle ouders met meldingen aan.' },
];

const KIND_LABELS: Record<string, string> = {
  buddy_needs: 'Buddy mist je kind',
  buddy_ill: 'Buddy is ziek',
  buddy_gone: 'Buddy is vertrokken',
  insight: 'Aandachtspunt',
};

function pct(part: number, whole: number) {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

function Tile({ label, value, sub, icon: Icon }: { label: string; value: React.ReactNode; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-600 p-5">
      <Icon className="w-7 h-7 mb-3 opacity-80" />
      <p className="text-3xl font-black tabular-nums">{value}</p>
      <p className="text-sm font-bold opacity-70 mt-1">{label}</p>
      {sub && <p className="text-xs font-semibold opacity-60 mt-1.5">{sub}</p>}
    </div>
  );
}

/**
 * Admin → Meldingen: the switch for parent push notifications and how well
 * they work. Rules live in push_claim_due (20261024120000_parent_push_notifications.sql).
 */
export function AdminPush() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-push-stats'],
    queryFn: async (): Promise<PushStats> => {
      const { data, error } = await supabase.rpc('admin_push_stats');
      if (error) throw error;
      return data as unknown as PushStats;
    },
  });

  const setMode = useMutation({
    mutationFn: async (mode: PushMode) => {
      const { error } = await supabase.rpc('admin_set_push_mode', { p_mode: mode });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Opgeslagen');
      queryClient.invalidateQueries({ queryKey: ['admin-push-stats'] });
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-red-600">Kon de meldingen niet laden.</p>;
  }

  const kinds = Object.keys(KIND_LABELS).filter((k) => data.by_kind[k]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Meldingen</h2>
        <p className="text-sm text-slate-500">
          Pushmeldingen voor ouders: hooguit 1 per dag en 3 per week, na schooltijd.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-black text-slate-900 mb-3">Wie krijgt meldingen?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode.mutate(m.value)}
              disabled={setMode.isPending}
              aria-pressed={data.mode === m.value}
              className={cn(
                'text-left rounded-xl border-2 p-3 transition-colors',
                data.mode === m.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <p className="font-black text-slate-900 text-sm">{m.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.hint}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Testen op je eigen telefoon: zet meldingen aan in je ouderportaal (Account → Meldingen) en
          stuur daar een testmelding.
        </p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          icon={Smartphone}
          label="Ouders met meldingen aan"
          value={data.parents_with_push}
          sub={`van ${data.parents_total} ouders · ${data.devices} toestellen`}
        />
        <Tile icon={Send} label="Verstuurd (7 dagen)" value={data.sent_7d} sub={`${data.sent_30d} in 30 dagen`} />
        <Tile
          icon={Sparkles}
          label="Kind speelde binnen 24 u"
          value={pct(data.played_24h_30d, data.measured_30d)}
          sub={`${data.played_24h_30d} van ${data.measured_30d} meldingen (30 dagen)`}
        />
        <Tile icon={AlertTriangle} label="Niet aangekomen (30 dagen)" value={data.failed_30d} />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Per soort (30 dagen)
        </h3>
        {kinds.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen meldingen verstuurd.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 font-bold">Soort</th>
                <th className="py-2 font-bold text-right">Verstuurd</th>
                <th className="py-2 font-bold text-right">Kind speelde binnen 24 u</th>
              </tr>
            </thead>
            <tbody>
              {kinds.map((k) => {
                const s = data.by_kind[k]!;
                return (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="py-2 font-semibold text-slate-800">{KIND_LABELS[k]}</td>
                    <td className="py-2 text-right tabular-nums">{s.sent}</td>
                    <td className="py-2 text-right tabular-nums">{pct(s.played_24h, s.measured)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
