import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { mapDbError } from '@/lib/errorMessages';
import { useTimesTableAccess, type TimesTableAccess } from '@/hooks/useTimesTables';

const TABLES = Array.from({ length: 10 }, (_, i) => i + 1);
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

type Kind = 'multiply' | 'divide';

function openDate(access: TimesTableAccess, table: number, kind: Kind): string | null {
  const s = access.schedule.find((e) => e.table === table && e.kind === kind);
  return s ? `${s.day} ${MONTHS[s.month - 1]}` : null;
}

/**
 * Tafels in the parent portal, tab Leerstof (2de leerjaar). Each maal- and
 * deeltafel opens on its own date (times_table_schedule); the parent can open
 * one earlier and close it again, but never close what the calendar opened.
 */
export function TimesTablesAccessCard({ childId, childName, grade }: { childId: string; childName: string; grade: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: access } = useTimesTableAccess(grade === 2 ? childId : undefined);

  const save = useMutation({
    mutationFn: async (next: { extra_times_tables: number[]; extra_division_tables: number[] }) => {
      const { error } = await supabase.from('children').update(next).eq('id', childId).eq('parent_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['times-table-access', childId] });
      // Tafels appears once a table is open.
      queryClient.invalidateQueries({ queryKey: ['practice-menu', childId] });
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  if (grade !== 2 || !access) return null;

  const toggle = (table: number, kind: Kind) => {
    const multiply = new Set(access.extraMultiply);
    const divide = new Set(access.extraDivide);
    const set = kind === 'multiply' ? multiply : divide;
    if (set.has(table)) set.delete(table);
    else set.add(table);
    save.mutate({
      extra_times_tables: [...multiply].sort((a, b) => a - b),
      extra_division_tables: [...divide].sort((a, b) => a - b),
    });
  };

  const chip = (table: number, kind: Kind) => {
    const isOpen = (kind === 'multiply' ? access.multiply : access.divide).includes(table);
    const byParent = (kind === 'multiply' ? access.extraMultiply : access.extraDivide).includes(table);
    const byCalendar = isOpen && !byParent;
    const date = openDate(access, table, kind);
    const what = kind === 'multiply' ? 'Maaltafel' : 'Deeltafel';
    const label = byCalendar
      ? `${what} van ${table}: open sinds ${date}`
      : byParent
      ? `${what} van ${table}: door jou opengezet`
      : `${what} van ${table}: open vanaf ${date}`;
    return (
      <button
        type="button"
        onClick={() => toggle(table, kind)}
        disabled={byCalendar || save.isPending}
        aria-pressed={isOpen}
        aria-label={label}
        title={label}
        className={cn(
          'flex-1 rounded-lg border px-2 py-1.5 text-left transition-colors disabled:cursor-default',
          byCalendar && 'bg-teal-50 border-teal-200 text-teal-800',
          byParent && 'bg-violet-50 border-violet-300 text-violet-800',
          !isOpen && 'bg-white border-slate-200 text-slate-400 hover:border-slate-300',
        )}
      >
        <span className="block text-sm font-black">{kind === 'multiply' ? '×' : ':'}</span>
        <span className="block text-[10px] font-bold leading-tight">
          {byCalendar ? `sinds ${date}` : byParent ? 'door jou' : `vanaf ${date}`}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-900">Tafels</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Elke maaltafel (×) en deeltafel (:) gaat vanzelf open op de datum die erbij staat. Is {childName} er
          vroeger aan toe? Tik erop om ze nu al open te zetten.
        </p>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TABLES.map((table) => (
          <div key={table} className="rounded-xl border border-slate-100 p-2">
            <p className="text-xs font-bold text-slate-500 mb-1.5">Tafel van {table}</p>
            <div className="flex gap-1.5">
              {chip(table, 'multiply')}
              {chip(table, 'divide')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
