import { exerciseFamilyKey, exerciseTypeName, stageNumber, summarizeConfig } from '@/data/exerciseCatalog';

/*
 * The leerplan of one grade for Admin → Oefeningen: per type of exercise,
 * what the child gets in trimester 1, 2 and 3. Same rule as the server
 * (_child_practice_options): a child gets, per type, the active row of the
 * highest trimester it has open; a missing or switched-off trimester keeps
 * the one before it.
 */

export interface CurriculumRow {
  id: string;
  route: string;
  grade: number;
  stage: string;
  title: string;
  subject: string;
  display_order: number;
  is_active: boolean;
  admin_only?: boolean | null;
  from_reading_theme?: number | null;
  config?: unknown;
}

export type CurriculumCell =
  /** This trimester has its own active row. */
  | { kind: 'row'; row: CurriculumRow; summary: string; test: boolean }
  /** No own active row, the child keeps an earlier trimester's (`from`). `off`: a row exists but is switched off. */
  | { kind: 'same'; from: number; off: boolean }
  /** Nothing for the child yet in this trimester. `off`: a row exists but is switched off. */
  | { kind: 'none'; off: boolean };

export interface CurriculumFamily {
  familyKey: string;
  name: string;
  subject: string;
  displayOrder: number;
  cells: [CurriculumCell, CurriculumCell, CurriculumCell];
  /** Lowest leesthema from which it shows (1ste leerjaar), if any. */
  fromReadingTheme: number | null;
  /** No active row at all in this grade. */
  off: boolean;
  inTest: boolean;
}

export const SUBJECT_ORDER = ['math', 'geometry', 'reading', 'writing', 'other'];

export function gradesIn(rows: CurriculumRow[]): number[] {
  return [...new Set(rows.map((r) => r.grade))].sort((a, b) => a - b);
}

export function buildCurriculum(rows: CurriculumRow[], grade: number): CurriculumFamily[] {
  const byFamily = new Map<string, CurriculumRow[]>();
  for (const row of rows) {
    if (row.grade !== grade) continue;
    const key = exerciseFamilyKey(row.route);
    if (!byFamily.has(key)) byFamily.set(key, []);
    byFamily.get(key)!.push(row);
  }

  const families: CurriculumFamily[] = [];
  for (const [familyKey, familyRows] of byFamily) {
    const atStage = (n: number) => familyRows.filter((r) => stageNumber(r.stage) === n);
    const active = familyRows.filter((r) => r.is_active);
    const first = [...familyRows].sort((a, b) => (stageNumber(a.stage) ?? 9) - (stageNumber(b.stage) ?? 9))[0];

    let lastOwn: number | null = null;
    const cells = [1, 2, 3].map((n): CurriculumCell => {
      const here = atStage(n);
      const own = here.find((r) => r.is_active);
      if (own) {
        lastOwn = n;
        return { kind: 'row', row: own, summary: summarizeConfig(familyKey, own.config), test: !!own.admin_only };
      }
      const off = here.length > 0;
      return lastOwn === null ? { kind: 'none', off } : { kind: 'same', from: lastOwn, off };
    }) as CurriculumFamily['cells'];

    const themes = active.map((r) => r.from_reading_theme).filter((t): t is number => typeof t === 'number');
    families.push({
      familyKey,
      name: exerciseTypeName(familyKey, first.title),
      subject: (active[0] ?? first).subject,
      displayOrder: Math.min(...familyRows.map((r) => r.display_order)),
      cells,
      fromReadingTheme: themes.length === active.length && themes.length > 0 ? Math.min(...themes) : null,
      off: active.length === 0,
      inTest: active.some((r) => r.admin_only),
    });
  }

  const subjectRank = (s: string) => {
    const i = SUBJECT_ORDER.indexOf(s);
    return i === -1 ? SUBJECT_ORDER.length : i;
  };
  return families.sort((a, b) =>
    subjectRank(a.subject) - subjectRank(b.subject) || a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'nl'));
}
