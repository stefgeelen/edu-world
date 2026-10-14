import type { GeometryConfig, GeometryTopic } from '@/data/difficultyConfig';
import { randomInt } from '@/lib/random';

/*
 * Lijnen en hoeken (ExerciseGeometryTerms.tsx): naming the geometry words of
 * the 2de leerjaar, as on the class worksheet "Blok 2: Meetkunde":
 *   - rechte, gebogen en gebroken lijnen
 *   - een punt, een rechte en een lijnstuk, and their names (punt A, rechte b, lijnstuk [CD])
 *   - een hoek: het hoekpunt, de benen, de hoek
 *   - evenwijdige, snijdende en loodrecht snijdende lijnen
 *
 * Every figure is worked out here, in a 240 × 160 drawing, so the screen only
 * draws what it gets and a question looks the same on every render.
 */

export type { GeometryTopic };
export type GeometryMode = GeometryTopic | 'mix';

export const GEOMETRY_TOPICS: GeometryTopic[] = ['lines', 'point-line-segment', 'angles', 'parallel'];
export const GEOMETRY_RUN_LENGTH = 6;
export const VIEW_W = 240;
export const VIEW_H = 160;

export type Pt = [number, number];

export type LineKind = 'straight' | 'curved' | 'broken';
export type PlsKind = 'point' | 'line' | 'segment';
export type AnglePart = 'vertex' | 'legs' | 'angle';
export type RelationKind = 'parallel' | 'intersecting' | 'perpendicular';
/** A thing from daily life with two lines on it, as on the worksheet (ligstoel, T, trap). */
export type RelationObject = 'ladder' | 'rails' | 'letter-t' | 'window' | 'scissors' | 'crossing-sign';

export interface LineFigure { type: 'line'; kind: LineKind; d: string }
export interface PlsFigure {
  type: 'pls';
  kind: PlsKind;
  /** point: [p]; line and segment: the two ends (a line runs past the edges). */
  points: Pt[];
  /** Only on naming questions: "A" for a point, "a" for a line, ["C", "D"] for a segment. */
  labels?: string[];
}
export interface AngleFigure {
  type: 'angle';
  vertex: Pt;
  legs: [Pt, Pt];
  /** The part coloured in, when the child has to name it. */
  highlight?: AnglePart;
}
export interface RelationFigure {
  type: 'relation';
  kind: RelationKind;
  /** Two plain lines, or a drawn thing whose two lines stand out. */
  lines: [Pt, Pt][];
  object?: RelationObject;
}
export type GeometryFigure = LineFigure | PlsFigure | AngleFigure | RelationFigure;

export type GeometryQuestion =
  /** A drawing; the child taps the word that fits. */
  | { format: 'name'; topic: GeometryTopic; prompt: string; figure: GeometryFigure; options: string[]; answer: string }
  /** A word; the child taps the drawing that fits. */
  | { format: 'pick'; topic: GeometryTopic; prompt: string; figures: GeometryFigure[]; answer: number }
  /** One angle; the child taps the hoekpunt, a been or the hoek itself. */
  | { format: 'tap'; topic: 'angles'; prompt: string; figure: AngleFigure; answer: AnglePart };

// ── Helpers ────────────────────────────────────────────────────────────────

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickOne<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const round = (n: number) => Math.round(n * 10) / 10;
const pt = (x: number, y: number): Pt => [round(x), round(y)];

/** A line of the given length through `center` at `deg` degrees. */
function lineThrough(center: Pt, deg: number, length: number): [Pt, Pt] {
  const dx = (Math.cos(rad(deg)) * length) / 2;
  const dy = (Math.sin(rad(deg)) * length) / 2;
  return [pt(center[0] - dx, center[1] - dy), pt(center[0] + dx, center[1] + dy)];
}

// ── Lijnen ─────────────────────────────────────────────────────────────────

export const LINE_WORDS: Record<LineKind, string> = {
  straight: 'een rechte lijn',
  curved: 'een gebogen lijn',
  broken: 'een gebroken lijn',
};
const LINE_PICK: Record<LineKind, string> = {
  straight: 'Tik de rechte lijn aan.',
  curved: 'Tik de gebogen lijn aan.',
  broken: 'Tik de gebroken lijn aan.',
};

export function lineFigure(kind: LineKind): LineFigure {
  if (kind === 'straight') {
    const [a, b] = lineThrough([120 + randomInt(-10, 10), 80 + randomInt(-10, 10)], randomInt(-30, 30), randomInt(160, 190));
    return { type: 'line', kind, d: `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}` };
  }
  if (kind === 'curved') {
    if (Math.random() < 0.5) {
      // A wave, like the worksheet.
      const up = randomInt(25, 45);
      const down = randomInt(115, 135);
      return { type: 'line', kind, d: `M 25 80 C 60 ${up} 90 ${up} 120 80 S 180 ${down} 215 80` };
    }
    // One arc, a hill or a valley.
    const top = Math.random() < 0.5 ? randomInt(15, 35) : randomInt(125, 145);
    const y = top < 80 ? 125 : 35;
    return { type: 'line', kind, d: `M 30 ${y} Q 120 ${2 * top - y} 210 ${y}` };
  }
  if (Math.random() < 0.5) {
    // A zigzag.
    const corners = randomInt(3, 5);
    const step = 190 / corners;
    const high = randomInt(30, 50);
    const low = randomInt(110, 130);
    const start = Math.random() < 0.5;
    const points = Array.from({ length: corners + 1 }, (_, i) => pt(25 + i * step, (i % 2 === 0) === start ? high : low));
    return { type: 'line', kind, d: `M ${points.map((p) => p.join(' ')).join(' L ')}` };
  }
  // Steps, like the worksheet: flat, up, flat, down, ...
  const high = randomInt(35, 55);
  const low = randomInt(105, 125);
  const steps = randomInt(2, 3);
  const w = 190 / (steps * 2);
  let x = 25;
  let y = low;
  const points: Pt[] = [pt(x, y)];
  for (let i = 0; i < steps * 2; i++) {
    x += w;
    points.push(pt(x, y));
    if (i < steps * 2 - 1) {
      y = y === low ? high : low;
      points.push(pt(x, y));
    }
  }
  return { type: 'line', kind, d: `M ${points.map((p) => p.join(' ')).join(' L ')}` };
}

function linesQuestions(): GeometryQuestion[] {
  const kinds: LineKind[] = ['straight', 'curved', 'broken'];
  const options = kinds.map((k) => LINE_WORDS[k]);
  const name = shuffled(kinds).map((kind): GeometryQuestion => ({
    format: 'name', topic: 'lines', prompt: 'Welke lijn is dit?', figure: lineFigure(kind), options, answer: LINE_WORDS[kind],
  }));
  const pick = shuffled(kinds).map((kind): GeometryQuestion => {
    const order = shuffled(kinds);
    return { format: 'pick', topic: 'lines', prompt: LINE_PICK[kind], figures: order.map(lineFigure), answer: order.indexOf(kind) };
  });
  return [...name, ...pick];
}

// ── Punt, rechte, lijnstuk ─────────────────────────────────────────────────

export const PLS_WORDS: Record<PlsKind, string> = {
  point: 'een punt',
  line: 'een rechte',
  segment: 'een lijnstuk',
};
const PLS_PICK: Record<PlsKind, string> = {
  point: 'Tik het punt aan.',
  line: 'Tik de rechte aan.',
  segment: 'Tik het lijnstuk aan.',
};

/** Letters that read clearly in both cases (no I/l, O/0, Q). */
const LETTER_PAIRS: [string, string][] = [['A', 'B'], ['C', 'D'], ['E', 'F'], ['K', 'L'], ['M', 'N'], ['P', 'R'], ['S', 'T']];

export function plsFigure(kind: PlsKind, letters?: [string, string]): PlsFigure {
  if (kind === 'point') {
    const p = pt(randomInt(80, 160), randomInt(55, 105));
    return { type: 'pls', kind, points: [p], labels: letters && [letters[0]] };
  }
  const deg = randomInt(-25, 25);
  const center: Pt = [120 + randomInt(-15, 15), 80 + randomInt(-15, 15)];
  // A rechte runs past every edge, also of a card wider than the drawing; a
  // lijnstuk stops well inside, at two dots.
  const ends = lineThrough(center, deg, kind === 'line' ? 1200 : randomInt(110, 150));
  const labels = letters && (kind === 'line' ? [letters[0].toLowerCase()] : letters);
  return { type: 'pls', kind, points: ends, labels };
}

/** "punt A", "rechte a", "lijnstuk [AB]": the names the child learns to write. */
export function plsName(kind: PlsKind, letters: [string, string]): string {
  if (kind === 'point') return `punt ${letters[0]}`;
  if (kind === 'line') return `rechte ${letters[0].toLowerCase()}`;
  return `lijnstuk [${letters[0]}${letters[1]}]`;
}

function plsQuestions(): GeometryQuestion[] {
  const kinds: PlsKind[] = ['point', 'line', 'segment'];
  const options = kinds.map((k) => PLS_WORDS[k]);
  const [nameA, nameB] = shuffled(kinds);
  const name = [nameA, nameB].map((kind): GeometryQuestion => ({
    format: 'name', topic: 'point-line-segment', prompt: 'Wat zie je hier?', figure: plsFigure(kind), options, answer: PLS_WORDS[kind],
  }));
  const [pickA, pickB] = shuffled(kinds);
  const pick = [pickA, pickB].map((kind): GeometryQuestion => {
    const order = shuffled(kinds);
    return { format: 'pick', topic: 'point-line-segment', prompt: PLS_PICK[kind], figures: order.map((k) => plsFigure(k)), answer: order.indexOf(kind) };
  });
  const [labelA, labelB] = shuffled(kinds);
  const labelled = [labelA, labelB].map((kind): GeometryQuestion => {
    const letters = pickOne(LETTER_PAIRS);
    return {
      format: 'name', topic: 'point-line-segment', prompt: 'Hoe heet dit?',
      figure: plsFigure(kind, letters), options: kinds.map((k) => plsName(k, letters)), answer: plsName(kind, letters),
    };
  });
  return [...name, ...pick, ...labelled];
}

// ── Hoeken ─────────────────────────────────────────────────────────────────

export const ANGLE_WORDS: Record<AnglePart, string> = {
  vertex: 'het hoekpunt',
  legs: 'de benen',
  angle: 'de hoek',
};
const ANGLE_TAP: Record<AnglePart, string> = {
  vertex: 'Tik het hoekpunt aan.',
  legs: 'Tik een been van de hoek aan.',
  angle: 'Tik de hoek aan.',
};

/** One angle, opening 40°–120°, turned any way, fitted in the drawing. */
export function angleFigure(highlight?: AnglePart): AngleFigure {
  const opening = randomInt(40, 120);
  const turn = randomInt(0, 359);
  const lengths = [randomInt(110, 140), randomInt(110, 140)];
  const dirs = [turn, turn + opening];
  const ends = dirs.map((deg, i) => [Math.cos(rad(deg)) * lengths[i], Math.sin(rad(deg)) * lengths[i]] as Pt);
  const xs = [0, ends[0][0], ends[1][0]];
  const ys = [0, ends[0][1], ends[1][1]];
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const scale = Math.min(1, 200 / w, 130 / h);
  const ox = VIEW_W / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * scale;
  const oy = VIEW_H / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * scale;
  const at = ([x, y]: Pt) => pt(ox + x * scale, oy + y * scale);
  return { type: 'angle', vertex: at([0, 0]), legs: [at(ends[0]), at(ends[1])], highlight };
}

function anglesQuestions(): GeometryQuestion[] {
  const parts: AnglePart[] = ['vertex', 'legs', 'angle'];
  const options = parts.map((p) => ANGLE_WORDS[p]);
  const tap = parts.map((part): GeometryQuestion => ({
    format: 'tap', topic: 'angles', prompt: ANGLE_TAP[part], figure: angleFigure(), answer: part,
  }));
  const name = parts.map((part): GeometryQuestion => ({
    format: 'name', topic: 'angles', prompt: 'Wat is geel gekleurd?', figure: angleFigure(part), options, answer: ANGLE_WORDS[part],
  }));
  return [...tap, ...name];
}

// ── Evenwijdig, snijdend, loodrecht ────────────────────────────────────────

/** As on the worksheet; "loodrecht snijdend" is also snijdend, so the child picks what fits best. */
export const RELATION_WORDS: Record<RelationKind, string> = {
  parallel: 'evenwijdige lijnen',
  intersecting: 'snijdende lijnen',
  perpendicular: 'loodrecht snijdende lijnen',
};
const RELATION_PICK: Partial<Record<RelationKind, string>> = {
  parallel: 'Tik de evenwijdige lijnen aan.',
  perpendicular: 'Tik de loodrecht snijdende lijnen aan.',
};

export const RELATION_OBJECTS: Record<RelationObject, RelationKind> = {
  ladder: 'parallel',
  rails: 'parallel',
  'letter-t': 'perpendicular',
  window: 'perpendicular',
  scissors: 'intersecting',
  'crossing-sign': 'intersecting',
};

/** The two lines that stand out on each drawn thing (the rest is drawn by the screen). */
const OBJECT_LINES: Record<RelationObject, [Pt, Pt][]> = {
  ladder: [[[95, 10], [95, 150]], [[145, 10], [145, 150]]],
  rails: [[[20, 62], [220, 62]], [[20, 98], [220, 98]]],
  'letter-t': [[[60, 30], [180, 30]], [[120, 30], [120, 150]]],
  window: [[[50, 80], [190, 80]], [[120, 15], [120, 145]]],
  scissors: [[[60, 30], [185, 135]], [[60, 130], [185, 25]]],
  'crossing-sign': [[[60, 22], [180, 98]], [[60, 98], [180, 22]]],
};

export function relationFigure(kind: RelationKind, withObject = false): RelationFigure {
  if (withObject) {
    const objects = (Object.keys(RELATION_OBJECTS) as RelationObject[]).filter((o) => RELATION_OBJECTS[o] === kind);
    const object = pickOne(objects);
    return { type: 'relation', kind, lines: OBJECT_LINES[object], object };
  }
  const deg = randomInt(-60, 60);
  const length = 170;
  if (kind === 'parallel') {
    const gap = randomInt(40, 60) / 2;
    const nx = -Math.sin(rad(deg)) * gap;
    const ny = Math.cos(rad(deg)) * gap;
    const shift = randomInt(-15, 15);
    return {
      type: 'relation', kind,
      lines: [lineThrough([120 - nx + shift, 80 - ny], deg, length * 0.85), lineThrough([120 + nx - shift, 80 + ny], deg, length * 0.85)],
    };
  }
  // Snijdend: 25°–60° apart, clearly not square. Loodrecht: exactly 90°, as a cross or a T.
  const between = kind === 'perpendicular' ? 90 : randomInt(25, 60) * (Math.random() < 0.5 ? 1 : -1);
  const center: Pt = [120 + randomInt(-15, 15), 80 + randomInt(-10, 10)];
  const first = lineThrough(center, deg, length);
  if (kind === 'perpendicular' && Math.random() < 0.4) {
    // A T: the second line starts on the first one.
    const d2 = deg + 90 * (Math.random() < 0.5 ? 1 : -1);
    const len = randomInt(90, 110);
    const end = pt(center[0] + Math.cos(rad(d2)) * len, center[1] + Math.sin(rad(d2)) * len);
    return { type: 'relation', kind, lines: fitLines([first, [pt(center[0], center[1]), end]]) };
  }
  return { type: 'relation', kind, lines: fitLines([first, lineThrough(center, deg + between, length * 0.8)]) };
}

/** Scales a pair of lines down around the middle until they fit with a margin. */
function fitLines(lines: [Pt, Pt][]): [Pt, Pt][] {
  const xs = lines.flat().map((p) => p[0]);
  const ys = lines.flat().map((p) => p[1]);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const scale = Math.min(1, 210 / (Math.max(...xs) - Math.min(...xs)), 140 / (Math.max(...ys) - Math.min(...ys)));
  const at = ([x, y]: Pt) => pt(VIEW_W / 2 + (x - cx) * scale, VIEW_H / 2 + (y - cy) * scale);
  return lines.map(([a, b]) => [at(a), at(b)]);
}

function relationQuestions(): GeometryQuestion[] {
  const kinds: RelationKind[] = ['parallel', 'intersecting', 'perpendicular'];
  const options = kinds.map((k) => RELATION_WORDS[k]);
  const named = shuffled([...kinds, pickOne(kinds)]);
  // Half of the drawings are things from daily life.
  const objects = shuffled([true, true, false, false]);
  const name = named.map((kind, i): GeometryQuestion => ({
    format: 'name', topic: 'parallel', prompt: 'Welke lijnen zie je?', figure: relationFigure(kind, objects[i]), options, answer: RELATION_WORDS[kind],
  }));
  // "Tik de snijdende lijnen aan" would also fit the loodrechte ones, so only these two are asked this way.
  const pick = (['parallel', 'perpendicular'] as const).map((kind): GeometryQuestion => {
    const order = shuffled(kinds);
    return { format: 'pick', topic: 'parallel', prompt: RELATION_PICK[kind]!, figures: order.map((k) => relationFigure(k)), answer: order.indexOf(kind) };
  });
  return [...name, ...pick];
}

// ── One run ────────────────────────────────────────────────────────────────

const POOLS: Record<GeometryTopic, () => GeometryQuestion[]> = {
  lines: linesQuestions,
  'point-line-segment': plsQuestions,
  angles: anglesQuestions,
  parallel: relationQuestions,
};

/**
 * GEOMETRY_RUN_LENGTH questions. One topic: its own mix of question kinds.
 * Door elkaar: at least one question of every topic the admin left on.
 */
export function generateGeometryRun(mode: GeometryMode, config: GeometryConfig): GeometryQuestion[] {
  if (mode !== 'mix') return shuffled(POOLS[mode]()).slice(0, GEOMETRY_RUN_LENGTH);
  const topics = config.topics.length ? config.topics : GEOMETRY_TOPICS;
  const pools = topics.map((t) => shuffled(POOLS[t]()));
  const run = pools.map((pool) => pool.shift()!).slice(0, GEOMETRY_RUN_LENGTH);
  const rest = shuffled(pools.flat());
  return shuffled([...run, ...rest.slice(0, GEOMETRY_RUN_LENGTH - run.length)]);
}
