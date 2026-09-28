import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminEngagement, type EngagementStats } from '@/hooks/useAdminEngagement';
import {
  BarChart3, Users, Baby, BookOpen, Trophy, Loader2, Flame, UserPlus,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Single-series magnitude charts throughout: one sequential indigo hue, slate
 * ink for every label, no legends (there is only ever one series to name).
 */
const BAR = 'bg-indigo-500';

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });
}

/** Headline numbers get a tile, not a chart — there is nothing to compare. */
function StatTile({
  label, value, sub, icon: Icon, tone = 'indigo',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ElementType;
  tone?: 'indigo' | 'emerald' | 'violet' | 'amber' | 'slate';
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    violet: 'bg-violet-50 text-violet-600 border-violet-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  } as const;

  return (
    <div className={cn('rounded-2xl border p-5', tones[tone])}>
      <Icon className="w-7 h-7 mb-3 opacity-80" />
      <p className="text-3xl font-black tabular-nums">{value}</p>
      <p className="text-sm font-bold opacity-70 mt-1">{label}</p>
      {sub && <p className="text-xs font-semibold opacity-60 mt-1.5">{sub}</p>}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="font-black text-slate-900">{title}</h3>
        {hint && <p className="text-xs font-medium text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Week-on-week movement, stated as a direction rather than a bare number. */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="text-slate-400">geen vergelijking</span>;
  const change = Math.round(((current - previous) / previous) * 100);
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const tone = change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-slate-400';
  return (
    <span className={cn('inline-flex items-center gap-1 font-bold', tone)}>
      <Icon className="w-3.5 h-3.5" />
      {change > 0 ? '+' : ''}{change}% t.o.v. vorige week
    </span>
  );
}

function DailyChart({ daily }: { daily: EngagementStats['daily'] }) {
  const max = Math.max(1, ...daily.map(d => d.attempts));
  const peak = daily.reduce((a, b) => (b.attempts > a.attempts ? b : a), daily[0]);

  return (
    <div>
      {/* 2px gaps keep adjacent bars from fusing into one block. */}
      <div className="flex items-end gap-[2px] h-40">
        {daily.map(d => (
          <div
            key={d.day}
            title={`${formatDay(d.day)} — ${d.attempts} oefeningen, ${d.children} ${d.children === 1 ? 'kind' : 'kinderen'}`}
            className="flex-1 flex flex-col justify-end h-full group"
          >
            <div
              className={cn(
                'w-full rounded-t transition-colors group-hover:bg-indigo-600',
                d.attempts === 0 ? 'bg-slate-100' : BAR,
              )}
              style={{ height: `${Math.max(d.attempts === 0 ? 2 : 4, (d.attempts / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2">
        <span>{daily.length ? formatDay(daily[0].day) : ''}</span>
        <span className="text-slate-500">piek: {peak?.attempts ?? 0} op {peak ? formatDay(peak.day) : '—'}</span>
        <span>{daily.length ? formatDay(daily[daily.length - 1].day) : ''}</span>
      </div>
    </div>
  );
}

function HourChart({ byHour }: { byHour: EngagementStats['by_hour'] }) {
  const max = Math.max(1, ...byHour.map(h => h.attempts));
  return (
    <div>
      <div className="flex items-end gap-[2px] h-28">
        {byHour.map(h => (
          <div
            key={h.hour}
            title={`${String(h.hour).padStart(2, '0')}:00 — ${h.attempts} oefeningen`}
            className="flex-1 flex flex-col justify-end h-full"
          >
            <div
              className={cn('w-full rounded-t', h.attempts === 0 ? 'bg-slate-100' : BAR)}
              style={{ height: `${Math.max(h.attempts === 0 ? 2 : 4, (h.attempts / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2">
        <span>00u</span><span>06u</span><span>12u</span><span>18u</span><span>23u</span>
      </div>
    </div>
  );
}

/** Created → opened → practised. The drop between the last two is the story. */
function Funnel({ activation }: { activation: EngagementStats['activation'] }) {
  const total = activation.children_total;
  const steps = [
    { label: 'Profiel aangemaakt', value: total },
    { label: 'App geopend', value: activation.children_opened },
    { label: 'Minstens 1 oefening gemaakt', value: activation.children_started },
  ];

  return (
    <div className="space-y-3">
      {steps.map(s => (
        <div key={s.label}>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span className="font-bold text-slate-700">{s.label}</span>
            <span className="font-black text-slate-900 tabular-nums">
              {s.value}
              <span className="text-slate-400 font-bold ml-1.5">{pct(s.value, total)}%</span>
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', BAR)} style={{ width: `${pct(s.value, total)}%` }} />
          </div>
        </div>
      ))}

      {activation.children_never_started > 0 && (
        <div className="flex items-start gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
          <span>
            {activation.children_never_started}{' '}
            {activation.children_never_started === 1 ? 'kind heeft' : 'kinderen hebben'} nog nooit een oefening
            afgerond. Dat is je grootste lek — daar verlies je ze vóór het product iets heeft kunnen bewijzen.
          </span>
        </div>
      )}
    </div>
  );
}

/** Sequential single hue: darker cell = larger share of the cohort retained. */
function retentionTone(value: number | null) {
  if (value === null) return 'bg-white text-slate-300';
  if (value >= 60) return 'bg-indigo-600 text-white';
  if (value >= 40) return 'bg-indigo-400 text-white';
  if (value >= 20) return 'bg-indigo-200 text-indigo-900';
  if (value > 0) return 'bg-indigo-50 text-indigo-700';
  return 'bg-slate-50 text-slate-400';
}

function RetentionTable({ retention }: { retention: EngagementStats['retention'] }) {
  if (retention.length === 0) {
    return <p className="text-sm font-semibold text-slate-400">Nog geen kinderen om te volgen.</p>;
  }

  const cell = (size: number, value: number | null) => {
    if (value === null) {
      return <td className="p-1"><div className="rounded-lg py-2 text-center text-xs font-bold bg-white text-slate-300">—</div></td>;
    }
    const share = pct(value, size);
    return (
      <td className="p-1">
        <div
          title={`${value} van ${size} kinderen`}
          className={cn('rounded-lg py-2 text-center text-xs font-black tabular-nums', retentionTone(share))}
        >
          {share}%
        </div>
      </td>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            <th className="text-left pb-2 pl-1">Startweek</th>
            <th className="text-left pb-2">Kinderen</th>
            <th className="pb-2">Week 1</th>
            <th className="pb-2">Week 2</th>
            <th className="pb-2">Week 4</th>
            <th className="pb-2">Week 6</th>
          </tr>
        </thead>
        <tbody>
          {retention.map(r => (
            <tr key={r.cohort}>
              <td className="text-sm font-bold text-slate-700 pl-1 whitespace-nowrap">{formatDay(r.cohort_start)}</td>
              <td className="text-sm font-bold text-slate-500 tabular-nums">{r.size}</td>
              {cell(r.size, r.w1)}
              {cell(r.size, r.w2)}
              {cell(r.size, r.w4)}
              {cell(r.size, r.w6)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs font-medium text-slate-400 mt-3">
        Aandeel van elke lichting dat in die week nog een oefening maakte. Een streepje betekent dat de week
        nog niet volledig verstreken is voor iedereen in die lichting.
      </p>
    </div>
  );
}

export function AdminStats() {
  const { data: stats, isLoading, error } = useAdminEngagement();

  // Subscriptions stay a plain table read: the engagement RPC counts them, but
  // the per-plan split is only interesting here.
  const { data: subs = [] } = useQuery({
    queryKey: ['admin-stats-subscriptions'],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('subscriptions').select('id, status, plan');
      if (err) throw err;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-5xl">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          Statistieken
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm font-semibold text-red-700">
          Statistieken konden niet geladen worden.
        </div>
      </div>
    );
  }

  const activeSubs = subs.filter(s => s.status === 'active').length;
  const sessionsPerChild = stats.active_children.d7
    ? (stats.attempts.last_7d / stats.active_children.d7).toFixed(1)
    : '0';

  return (
    <div className="max-w-5xl space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          Statistieken
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Bijgewerkt {new Date(stats.generated_at).toLocaleString('nl-BE', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      {/* Gebruik — the numbers that say whether Leapio is actually being used */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={Flame}
          tone="emerald"
          label="Actieve kinderen (7 dagen)"
          value={stats.active_children.d7}
          sub={`${stats.active_children.d1} vandaag · ${stats.active_children.d30} in 30 dagen`}
        />
        <StatTile
          icon={Users}
          tone="indigo"
          label="Actieve gezinnen (7 dagen)"
          value={stats.active_accounts.d7}
          sub={`van ${stats.totals.accounts} accounts`}
        />
        <StatTile
          icon={BookOpen}
          tone="violet"
          label="Oefeningen deze week"
          value={stats.attempts.last_7d}
          sub={<Delta current={stats.attempts.last_7d} previous={stats.attempts.prev_7d} />}
        />
        <StatTile
          icon={UserPlus}
          tone="amber"
          label="Nieuwe accounts (7 dagen)"
          value={stats.new_signups.accounts_7d}
          sub={`${stats.new_signups.children_7d} nieuwe kinderen`}
        />
      </div>

      <Section
        title="Activatie"
        hint="Hoeveel aangemaakte kinderprofielen het tot een eerste afgeronde oefening brengen."
      >
        <Funnel activation={stats.activation} />
      </Section>

      <Section
        title="Retentie per lichting"
        hint="De vraag die de beta moet beantwoorden: komt het kind terug?"
      >
        <RetentionTable retention={stats.retention} />
      </Section>

      <Section
        title="Activiteit, laatste 30 dagen"
        hint={`Gemiddeld ${sessionsPerChild} oefeningen per actief kind deze week.`}
      >
        <DailyChart daily={stats.daily} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Wanneer wordt er geoefend" hint="Uur van de dag, Belgische tijd, laatste 30 dagen.">
          <HourChart byHour={stats.by_hour} />
        </Section>

        <Section title="Per vak" hint="Laatste 30 dagen. Weinig sterren bij veel pogingen = te moeilijk.">
          {stats.by_subject.length === 0 ? (
            <p className="text-sm font-semibold text-slate-400">Nog geen oefeningen gemaakt.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.by_subject.map(s => {
                const max = Math.max(...stats.by_subject.map(x => x.attempts));
                return (
                  <div key={s.subject}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className="font-bold text-slate-700 capitalize">{s.subject}</span>
                      <span className="font-bold text-slate-500 tabular-nums">
                        {s.attempts} · ⭐ {s.avg_stars}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', BAR)} style={{ width: `${pct(s.attempts, max)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <Section title="Meest gemaakte oefeningen" hint="Laatste 30 dagen.">
        {stats.top_exercises.length === 0 ? (
          <p className="text-sm font-semibold text-slate-400">Nog geen oefeningen gemaakt.</p>
        ) : (
          <div className="space-y-1">
            {stats.top_exercises.map((e, i) => (
              <div key={`${e.title}-${i}`} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-xs font-black text-slate-300 w-5 tabular-nums">{i + 1}</span>
                <span className="flex-1 text-sm font-bold text-slate-700 truncate">{e.title}</span>
                <span className="text-xs font-semibold text-slate-400 capitalize">{e.subject}</span>
                <span className="text-sm font-black text-slate-700 tabular-nums w-12 text-right">{e.attempts}</span>
                <span className="text-xs font-bold text-amber-500 w-12 text-right">⭐ {e.avg_stars}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Totals last: they only ever go up, so they say least about usage. */}
      <Section title="Totalen" hint="Sinds de start.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={Users} tone="slate" label="Totaal gebruikers" value={stats.totals.accounts} />
          <StatTile icon={Baby} tone="slate" label="Kinderen" value={stats.totals.children} />
          <StatTile icon={BookOpen} tone="slate" label="Oefeningen gemaakt" value={stats.totals.attempts} />
          <StatTile icon={Trophy} tone="slate" label="Actieve abonnementen" value={activeSubs} />
        </div>
      </Section>
    </div>
  );
}
