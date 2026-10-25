import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { mapDbError } from '@/lib/errorMessages';
import { READING_THEMES } from '@/data/readingThemes';
import { useChildReadingTheme } from '@/hooks/useReadingTheme';

const FOLLOW_CALENDAR = 'kalender';

/**
 * Leesthema in the parent portal (1ste leerjaar only). The reading exercises
 * use only the letters of this theme and the ones before. It follows the
 * calendar unless the parent picks a theme, e.g. when the class is ahead.
 */
export function ReadingThemeCard({ childId, childName, grade }: { childId: string; childName: string; grade: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useChildReadingTheme(grade === 1 ? childId : undefined);

  const setTheme = useMutation({
    mutationFn: async (theme: number | null) => {
      const { error } = await supabase
        .from('children')
        .update({ reading_theme: theme })
        .eq('id', childId)
        .eq('parent_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, theme) => {
      queryClient.invalidateQueries({ queryKey: ['reading-theme', childId] });
      // Which reading exercises the child can pick depends on the theme.
      queryClient.invalidateQueries({ queryKey: ['practice-menu', childId] });
      toast.success(theme === null ? 'Het leesthema volgt weer de kalender.' : `${childName} leest nu met thema ${theme}.`);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  if (grade !== 1 || !data) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900">Leesthema</h3>
        <span className="text-xs font-bold text-slate-400">Thema {data.theme} van 10</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-600">
          De leesoefeningen gebruiken alleen letters die je kind in de klas al leerde. Het thema volgt de
          kalender. Loopt de klas voor of achter? Kies dan zelf het thema.
        </p>

        <label className="block">
          <span className="text-xs font-bold text-slate-500">Thema</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60"
            value={data.chosenTheme === null ? FOLLOW_CALENDAR : String(data.chosenTheme)}
            disabled={setTheme.isPending}
            onChange={(e) => setTheme.mutate(e.target.value === FOLLOW_CALENDAR ? null : Number(e.target.value))}
          >
            <option value={FOLLOW_CALENDAR}>Volgt de kalender (nu: thema {data.calendarTheme})</option>
            {READING_THEMES.map((t) => (
              <option key={t.theme} value={t.theme}>
                Thema {t.theme}
              </option>
            ))}
          </select>
        </label>

        <ol className="space-y-1.5">
          {READING_THEMES.map((t) => (
            <li
              key={t.theme}
              className={cn(
                'flex gap-3 rounded-lg px-3 py-1.5 text-xs',
                t.theme === data.theme ? 'bg-violet-50 text-violet-900' : t.theme < data.theme ? 'text-slate-500' : 'text-slate-400',
              )}
            >
              <span className="w-14 shrink-0 font-bold">Thema {t.theme}</span>
              <span>{t.newInClass}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
