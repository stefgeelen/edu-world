import { describe, it, expect } from 'vitest';
import {
  generateGeometryRun,
  angleFigure,
  plsName,
  relationFigure,
  GEOMETRY_RUN_LENGTH,
  GEOMETRY_TOPICS,
  RELATION_OBJECTS,
  VIEW_W,
  VIEW_H,
  type GeometryQuestion,
  type Pt,
} from '@/lib/geometryQuestions';

const ALL = { topics: GEOMETRY_TOPICS };

function inside([x, y]: Pt) {
  expect(x).toBeGreaterThanOrEqual(0);
  expect(x).toBeLessThanOrEqual(VIEW_W);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(y).toBeLessThanOrEqual(VIEW_H);
}

function answerIsOffered(q: GeometryQuestion) {
  if (q.format === 'name') expect(q.options).toContain(q.answer);
  if (q.format === 'pick') expect(q.figures[q.answer]).toBeDefined();
}

describe('generateGeometryRun', () => {
  it('asks only the chosen part, with the answer among the choices', () => {
    for (let n = 0; n < 30; n++) {
      for (const topic of GEOMETRY_TOPICS) {
        const run = generateGeometryRun(topic, ALL);
        expect(run).toHaveLength(GEOMETRY_RUN_LENGTH);
        for (const q of run) {
          expect(q.topic).toBe(topic);
          answerIsOffered(q);
        }
      }
    }
  });

  it('"door elkaar" asks every part at least once', () => {
    for (let n = 0; n < 30; n++) {
      const run = generateGeometryRun('mix', ALL);
      expect(run).toHaveLength(GEOMETRY_RUN_LENGTH);
      expect(new Set(run.map((q) => q.topic)).size).toBe(GEOMETRY_TOPICS.length);
    }
  });

  it('"door elkaar" stays within the parts the admin left on', () => {
    for (let n = 0; n < 30; n++) {
      const run = generateGeometryRun('mix', { topics: ['lines', 'angles'] });
      expect(run).toHaveLength(GEOMETRY_RUN_LENGTH);
      expect(new Set(run.map((q) => q.topic))).toEqual(new Set(['lines', 'angles']));
    }
  });

  it('the hoek part asks to tap every part of an angle', () => {
    const run = generateGeometryRun('angles', ALL);
    const taps = run.filter((q) => q.format === 'tap').map((q) => q.answer);
    expect(taps.sort()).toEqual(['angle', 'legs', 'vertex']);
  });

  it('never asks to tap "the snijdende lijnen": the loodrechte ones would fit too', () => {
    for (let n = 0; n < 30; n++) {
      for (const q of generateGeometryRun('parallel', ALL)) {
        if (q.format === 'pick') expect(q.prompt).not.toMatch(/Tik de snijdende/);
      }
    }
  });
});

describe('names with letters', () => {
  it('writes them as in class', () => {
    expect(plsName('point', ['C', 'D'])).toBe('punt C');
    expect(plsName('line', ['C', 'D'])).toBe('rechte c');
    expect(plsName('segment', ['C', 'D'])).toBe('lijnstuk [CD]');
  });
});

describe('figures', () => {
  it('an angle always fits in the drawing', () => {
    for (let n = 0; n < 200; n++) {
      const a = angleFigure();
      inside(a.vertex);
      a.legs.forEach(inside);
    }
  });

  it('plain line pairs fit, and keep their kind', () => {
    for (let n = 0; n < 200; n++) {
      for (const kind of ['parallel', 'intersecting', 'perpendicular'] as const) {
        const f = relationFigure(kind);
        f.lines.flat().forEach(inside);
        const [[a, b], [c, d]] = f.lines;
        const angle = Math.abs(
          (Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.atan2(d[1] - c[1], d[0] - c[0])) * 180 / Math.PI,
        ) % 180;
        const between = Math.min(angle, 180 - angle);
        if (kind === 'parallel') expect(between).toBeLessThan(1);
        if (kind === 'perpendicular') expect(between).toBeGreaterThan(89);
        if (kind === 'intersecting') {
          expect(between).toBeGreaterThanOrEqual(24);
          expect(between).toBeLessThanOrEqual(61);
        }
      }
    }
  });

  it('every drawn thing belongs to a kind of lines', () => {
    for (const kind of ['parallel', 'intersecting', 'perpendicular'] as const) {
      const f = relationFigure(kind, true);
      expect(f.object).toBeDefined();
      expect(RELATION_OBJECTS[f.object!]).toBe(kind);
    }
  });
});
