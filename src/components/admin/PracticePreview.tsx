import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { mapDbError } from '@/lib/errorMessages';
import { GRADE_NAMES, compactNumbers, exerciseTypeName, subjectLabel, summarizeConfig } from '@/data/exerciseCatalog';

/*
 * "Wat ziet een kind?" in Admin → Oefeningen: the tiles a child would get
 * for a grade, the highest open trimester, a day and (1ste leerjaar) a
 * leesthema. The server works it out with the same rules as the app
 * (admin_preview_practice, 20261122120000_admin_preview_practice.sql).
 */

interface PreviewTile {
  type_key: string;
  title: string;
  subject: string;
  route: string;
  stage_num?: number;
  grade?: number;
  admin_only: boolean;
  config: unknown;
}

interface PreviewHidden {
  type_key: string;
  title: string;
  subject: string;
  reason: 'stage' | 'reading_theme' | 'times_tables';
  from_reading_theme: number | null;
  first_stage: number | null;
}

export interface PracticePreviewResult {
  day: string;
  grade: number;
  open_stage: number;
  reading_theme: number | null;
  times_tables: { multiply: number[]; divide: number[] };
  practice: PreviewTile[];
  hidden: PreviewHidden[];
  review: PreviewTile[];
}

function todayInBrussels(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date());
}

function formatDay(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function hiddenReason(h: PreviewHidden): string {
  if (h.reason === 'times_tables') return 'nog geen tafel open op deze dag';
  if (h.reason === 'reading_theme') return `pas vanaf leesthema ${h.from_reading_theme}`;
  return `pas vanaf trimester ${h.first_stage}`;
}

function Tile({ tile, showStage }: { tile: PreviewTile; showStage: boolean }) {
  const name = exerciseTypeName(tile.type_key, tile.title);
  const summary = summarizeConfig(tile.type_key, tile.config);
  const where = showStage
    ? tile.stage_num ? `trimester ${tile.stage_num}` : ''
    : tile.grade !== undefined ? GRADE_NAMES[tile.grade] ?? `graad ${tile.grade}` : '';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5" data-testid="preview-tile">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-slate-900">{tile.title}</span>
        {tile.admin_only && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">Test</span>}
      </div>
      <div className="mt-0.5 text-xs text-slate-500">
        {[name !== tile.title ? name : '', where, summary].filter(Boolean).join(' · ')}
      </div>
    </div>
  );
}

function bySubject<T extends { subject: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!map.has(item.subject)) map.set(item.subject, []);
    map.get(item.subject)!.push(item);
  }
  return [...map.entries()];
}

export function PracticePreview({ grades }: { grades: number[] }) {
  const [grade, setGrade] = useState(() => (grades.includes(2) ? 2 : grades[0] ?? 1));
  const [openStage, setOpenStage] = useState(1);
  const [day, setDay] = useState(todayInBrussels);
  const [theme, setTheme] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-preview-practice', grade, openStage, day, grade === 1 ? theme : null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_preview_practice', {
        p_grade: grade,
        p_open_stage: openStage,
        p_day: day || undefined,
        p_reading_theme: grade === 1 && theme !== null ? theme : undefined,
      });
      if (error) throw error;
      return data as unknown as PracticePreviewResult;
    },
  });

  const label = 'text-xs font-bold uppercase tracking-wider text-slate-500';
  const tables = data?.times_tables;
  const hasTables = !!data && (data.practice.some((t) => t.type_key === '/exercises/times-tables') || data.hidden.some((h) => h.type_key === '/exercises/times-tables'));

  return (
    <div>
      <div className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Leerjaar</span>
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {grades.map((g) => <option key={g} value={g}>{GRADE_NAMES[g] ?? `Graad ${g}`}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={label}>Open tot</span>
          <div className="flex gap-1.5" role="group" aria-label="Open tot trimester">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOpenStage(n)}
                aria-pressed={openStage === n}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-bold',
                  openStage === n ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                Trimester {n}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Dag</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <span className="text-xs text-slate-400">Bepaalt welke tafels open zijn en, in het 1ste leerjaar, het leesthema.</span>
        </label>
        {grade === 1 && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>Leesthema</span>
            <select
              value={theme ?? ''}
              onChange={(e) => setTheme(e.target.value === '' ? null : Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Volgens de kalender</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => <option key={t} value={t}>Thema {t}</option>)}
            </select>
            <span className="text-xs text-slate-400">De ouder kan een ander thema kiezen in het ouderportaal.</span>
          </label>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{mapDbError(error)}</div>
      )}

      {data && (
        <div data-testid="practice-preview">
          <p className="mb-4 text-sm text-slate-600">
            {data.grade === 0
              ? <>Een kind van de <strong>3de kleuterklas</strong> met</>
              : <>Een kind van het <strong>{GRADE_NAMES[data.grade] ?? `graad ${data.grade}`}</strong> met</>}{' '}
            trimester <strong>1{data.open_stage > 1 ? `–${data.open_stage}` : ''}</strong> open, op <strong>{formatDay(data.day)}</strong>
            {data.reading_theme !== null && <> (leesthema <strong>{data.reading_theme}</strong>)</>}, ziet onder Oefenen {data.practice.length} {data.practice.length === 1 ? 'oefening' : 'oefeningen'}:
          </p>

          {hasTables && tables && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              Open tafels op deze dag: maaltafels {tables.multiply.length ? compactNumbers(tables.multiply) : 'geen'}
              {' · '}deeltafels {tables.divide.length ? compactNumbers(tables.divide) : 'geen'}.
              <span className="text-amber-700"> Extra tafels die een ouder opent, komen daar nog bij.</span>
            </p>
          )}

          {bySubject(data.practice).map(([subject, tiles]) => (
            <section key={subject} className="mb-4">
              <h3 className="mb-2"><span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', subjectLabel(subject).color)}>{subjectLabel(subject).label}</span></h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tiles.map((t) => <Tile key={t.type_key} tile={t} showStage />)}
              </div>
            </section>
          ))}

          {data.hidden.length > 0 && (
            <section className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <h3 className="mb-1.5 text-sm font-bold text-slate-700">Nog niet zichtbaar</h3>
              <ul className="flex flex-col gap-1 text-sm text-slate-600">
                {data.hidden.map((h) => (
                  <li key={h.type_key}>
                    <span className="font-semibold">{exerciseTypeName(h.type_key, h.title)}</span>
                    <span className="text-slate-400"> — {hiddenReason(h)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.review.length > 0 && (
            <details className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">Herhalen: {data.review.length} oefeningen van vorige leerjaren</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.review.map((t) => <Tile key={t.type_key} tile={t} showStage={false} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
