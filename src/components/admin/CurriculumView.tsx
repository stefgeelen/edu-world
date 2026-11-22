import React, { useMemo, useState } from 'react';
import { ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXERCISE_CATALOG, GRADE_NAMES, subjectLabel } from '@/data/exerciseCatalog';
import { buildCurriculum, gradesIn, type CurriculumCell, type CurriculumFamily, type CurriculumRow } from '@/lib/curriculum';

/*
 * Leerplan in Admin → Oefeningen: per grade, per type of exercise, what the
 * child gets in trimester 1, 2 and 3. A click opens the type's settings.
 */

function Cell({ cell, typeName }: { cell: CurriculumCell; typeName: string }) {
  if (cell.kind === 'row') {
    const ownTitle = cell.row.title !== typeName;
    return (
      <div
        className={cn(
          'h-full rounded-lg border px-2.5 py-1.5 text-xs leading-snug',
          cell.test ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900',
        )}
        data-testid="curriculum-cell"
        data-kind="row"
      >
        {ownTitle && <div className="font-bold">{cell.row.title}</div>}
        <div className={cn(ownTitle && 'opacity-80')}>{cell.summary || (ownTitle ? '' : 'zonder instellingen')}</div>
        {cell.test && <span className="mt-0.5 inline-block rounded-full bg-sky-200 px-1.5 text-[10px] font-bold uppercase text-sky-800">Test</span>}
      </div>
    );
  }
  if (cell.kind === 'same') {
    return (
      <div className="h-full rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500" data-testid="curriculum-cell" data-kind="same">
        zoals T{cell.from}
        {cell.off && <div className="text-[11px] text-slate-400">eigen rij staat uit</div>}
      </div>
    );
  }
  return (
    <div className="h-full rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-400" data-testid="curriculum-cell" data-kind="none">
      {cell.off ? 'uit' : 'nog niet'}
    </div>
  );
}

function FamilyRow({ family, onOpen }: { family: CurriculumFamily; onOpen: (familyKey: string) => void }) {
  const info = EXERCISE_CATALOG[family.familyKey];
  return (
    <button
      type="button"
      onClick={() => onOpen(family.familyKey)}
      className="grid w-full grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_1rem] items-stretch gap-2 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50"
    >
      <div className="flex min-w-0 flex-col justify-center">
        <span className="text-sm font-semibold text-slate-900">{family.name}</span>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {info?.choices && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700" title={info.choices.join(', ')}>
              {info.choices.length === 1 ? info.choices[0] : `${info.choices.length} keuzes in de app`}
            </span>
          )}
          {family.fromReadingTheme !== null && family.fromReadingTheme > 1 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">vanaf leesthema {family.fromReadingTheme}</span>
          )}
          {info?.rule && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800" title={info.rule}>{info.rule.split(';')[0]}</span>
          )}
        </div>
      </div>
      {family.cells.map((cell, i) => <Cell key={i} cell={cell} typeName={family.name} />)}
      <ChevronRight className="w-4 h-4 self-center text-slate-300" />
    </button>
  );
}

export function CurriculumView({ rows, onOpen }: { rows: CurriculumRow[]; onOpen: (familyKey: string) => void }) {
  const grades = gradesIn(rows);
  const [grade, setGrade] = useState<number>(() => (grades.includes(2) ? 2 : grades[0] ?? 1));
  const [search, setSearch] = useState('');
  const current = grades.includes(grade) ? grade : grades[0];

  const families = useMemo(() => buildCurriculum(rows, current), [rows, current]);
  const q = search.trim().toLowerCase();
  const matches = (f: CurriculumFamily) => !q || f.name.toLowerCase().includes(q) || f.familyKey.includes(q);
  const on = families.filter((f) => !f.off && matches(f));
  const off = families.filter((f) => f.off && matches(f));

  const bySubject = new Map<string, CurriculumFamily[]>();
  for (const f of on) {
    if (!bySubject.has(f.subject)) bySubject.set(f.subject, []);
    bySubject.get(f.subject)!.push(f);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {grades.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrade(g)}
            aria-pressed={g === current}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-bold transition-colors',
              g === current ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            )}
          >
            {GRADE_NAMES[g] ?? `Graad ${g}`}
          </button>
        ))}
        <input
          type="text"
          placeholder="Zoek op naam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-56"
        />
      </div>

      <p className="mb-4 flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Een kind krijgt het volgende trimester als het elke oefening van zijn trimester 5 keer gedaan heeft, of als de ouder het opent.
        Per oefening krijgt het de versie van het hoogste open trimester; staat daar niets, dan blijft de vorige.
      </p>

      {on.length === 0 && off.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">Geen oefeningen gevonden.</div>
      )}

      {[...bySubject.entries()].map(([subject, list]) => (
        <section key={subject} className="mb-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[40rem]">
          <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_1rem] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 normal-case tracking-normal', subjectLabel(subject).color)}>{subjectLabel(subject).label}</span>
            </span>
            <span>Trimester 1</span>
            <span>Trimester 2</span>
            <span>Trimester 3</span>
            <span />
          </div>
          {list.map((f) => <FamilyRow key={f.familyKey} family={f} onOpen={onOpen} />)}
          </div>
        </section>
      ))}

      {off.length > 0 && (
        <details className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-slate-600">Uit in dit leerjaar ({off.length})</summary>
          <div className="mt-2 flex flex-col">
            {off.map((f) => (
              <button
                key={f.familyKey}
                type="button"
                onClick={() => onOpen(f.familyKey)}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
              >
                <span>{f.name} <span className="font-mono text-xs text-slate-400">{f.familyKey}</span></span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
