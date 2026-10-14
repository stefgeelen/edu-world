import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  VIEW_H,
  VIEW_W,
  type AnglePart,
  type AngleFigure,
  type GeometryFigure as Figure,
  type Pt,
  type RelationObject,
} from '@/lib/geometryQuestions';

/*
 * Draws one figure of Lijnen en hoeken (src/lib/geometryQuestions.ts) on the
 * dark exercise card. The figure brings its own coordinates; this only draws.
 */

const INK = '#ede9fe';
const MUTED = '#6d5ca8';
const LINES = '#22d3ee';
const HIGHLIGHT = '#fbbf24';
const RIGHT = '#34d399';
const WRONG = '#fb7185';

const unit = (from: Pt, to: Pt): Pt => {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
};
const along = (p: Pt, u: Pt, d: number): Pt => [p[0] + u[0] * d, p[1] + u[1] * d];

/** Clicks on the parts of an angle; only on tap questions. */
export interface AngleTap {
  onTap: (part: AnglePart) => void;
  /** The part the child tapped, coloured right or wrong. */
  tapped?: AnglePart | null;
  status: 'idle' | 'correct' | 'incorrect';
}

export function GeometryFigure({ figure, className, tap, label }: {
  figure: Figure;
  className?: string;
  tap?: AngleTap;
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn('w-full h-auto overflow-hidden', className)}
      role="img"
      aria-label={label}
      data-testid="geometry-figure"
    >
      <Contents figure={figure} tap={tap} />
    </svg>
  );
}

function Contents({ figure, tap }: { figure: Figure; tap?: AngleTap }): ReactNode {
  if (figure.type === 'line') {
    return <path d={figure.d} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />;
  }

  if (figure.type === 'pls') {
    const [a, b] = figure.points;
    if (figure.kind === 'point') {
      return (
        <g>
          <circle cx={a[0]} cy={a[1]} r={6} fill={INK} />
          {figure.labels && <Letter at={[a[0] + 10, a[1] - 12]}>{figure.labels[0]}</Letter>}
        </g>
      );
    }
    const u = unit(a, b);
    const n: Pt = [u[1], -u[0]];
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return (
      <g>
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={4} strokeLinecap="round" />
        {figure.kind === 'segment' && (
          <>
            <circle cx={a[0]} cy={a[1]} r={6} fill={INK} />
            <circle cx={b[0]} cy={b[1]} r={6} fill={INK} />
          </>
        )}
        {figure.labels && figure.kind === 'line' && (
          <Letter at={along(along(mid, u, 75), n, 18)}>{figure.labels[0]}</Letter>
        )}
        {figure.labels && figure.kind === 'segment' && (
          <>
            <Letter at={along(along(a, u, -14), n, 14)}>{figure.labels[0]}</Letter>
            <Letter at={along(along(b, u, 14), n, 14)}>{figure.labels[1]}</Letter>
          </>
        )}
      </g>
    );
  }

  if (figure.type === 'angle') return <Angle figure={figure} tap={tap} />;

  return (
    <g>
      {figure.object && <ObjectBackdrop object={figure.object} />}
      {figure.lines.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={LINES} strokeWidth={5} strokeLinecap="round" />
      ))}
    </g>
  );
}

function Letter({ at, children }: { at: Pt; children: ReactNode }) {
  return (
    <text x={at[0]} y={at[1]} fill={HIGHLIGHT} fontSize={20} fontWeight={900} textAnchor="middle" dominantBaseline="middle">
      {children}
    </text>
  );
}

function Angle({ figure, tap }: { figure: AngleFigure; tap?: AngleTap }) {
  const v = figure.vertex;
  const [e0, e1] = figure.legs;
  const u0 = unit(v, e0);
  const u1 = unit(v, e1);
  // Turning from leg 0 to leg 1 on screen: clockwise when the cross product is positive.
  const sweep = u0[0] * u1[1] - u0[1] * u1[0] > 0 ? 1 : 0;
  const sector = (r: number) => {
    const a = along(v, u0, r);
    const b = along(v, u1, r);
    return `M ${v[0]} ${v[1]} L ${a[0]} ${a[1]} A ${r} ${r} 0 0 ${sweep} ${b[0]} ${b[1]} Z`;
  };
  const arc = (r: number) => {
    const a = along(v, u0, r);
    const b = along(v, u1, r);
    return `M ${a[0]} ${a[1]} A ${r} ${r} 0 0 ${sweep} ${b[0]} ${b[1]}`;
  };
  const reach = Math.min(Math.hypot(e0[0] - v[0], e0[1] - v[1]), Math.hypot(e1[0] - v[0], e1[1] - v[1]));

  const colour = (part: AnglePart, base: string) => {
    if (tap?.tapped === part) return tap.status === 'incorrect' ? WRONG : tap.status === 'correct' ? RIGHT : base;
    return figure.highlight === part ? HIGHLIGHT : base;
  };
  const angleColour = colour('angle', INK);
  const angleOn = figure.highlight === 'angle' || tap?.tapped === 'angle';
  const tapProps = (part: AnglePart) => tap && {
    onClick: (e: MouseEvent) => { e.stopPropagation(); tap.onTap(part); },
    style: { cursor: 'pointer' },
    'data-testid': `angle-${part}`,
  };

  return (
    <g>
      {angleOn && <path d={sector(34)} fill={angleColour} opacity={0.35} />}
      <path d={arc(34)} fill="none" stroke={angleColour} strokeWidth={angleOn ? 4 : 2.5} />
      {[e0, e1].map((e, i) => (
        <line key={i} x1={v[0]} y1={v[1]} x2={e[0]} y2={e[1]} stroke={colour('legs', INK)} strokeWidth={figure.highlight === 'legs' || tap?.tapped === 'legs' ? 6 : 4} strokeLinecap="round" />
      ))}
      <circle cx={v[0]} cy={v[1]} r={figure.highlight === 'vertex' || tap?.tapped === 'vertex' ? 8 : 5} fill={colour('vertex', INK)} />

      {tap && (
        // Invisible, generous tap areas, the vertex on top.
        <g fill="transparent" stroke="transparent">
          <path d={sector(reach * 0.75)} {...tapProps('angle')} />
          {[[u0, e0], [u1, e1]].map(([u, e], i) => {
            const start = along(v, u as Pt, 20);
            return (
              <line key={i} x1={start[0]} y1={start[1]} x2={(e as Pt)[0]} y2={(e as Pt)[1]} strokeWidth={26} strokeLinecap="round" {...tapProps('legs')} />
            );
          })}
          <circle cx={v[0]} cy={v[1]} r={17} {...tapProps('vertex')} />
        </g>
      )}
    </g>
  );
}

/** The thing around the two lines, in a quiet colour so the lines stand out. */
function ObjectBackdrop({ object }: { object: RelationObject }) {
  const stroke = { stroke: MUTED, strokeWidth: 5, strokeLinecap: 'round' as const, fill: 'none' };
  switch (object) {
    case 'ladder':
      return <g {...stroke}>{[28, 54, 80, 106, 132].map((y) => <line key={y} x1={95} y1={y} x2={145} y2={y} />)}</g>;
    case 'rails':
      return (
        <g fill={MUTED} opacity={0.8}>
          {[28, 58, 88, 118, 148, 178, 208].map((x) => <rect key={x} x={x - 6} y={48} width={12} height={64} rx={2} />)}
        </g>
      );
    case 'letter-t':
      return (
        <g fill={MUTED} opacity={0.6}>
          <rect x={50} y={18} width={140} height={24} rx={4} />
          <rect x={108} y={18} width={24} height={138} rx={4} />
        </g>
      );
    case 'window':
      return (
        <g>
          <rect x={50} y={15} width={140} height={130} rx={4} fill="#1e3a5f" opacity={0.6} />
          <rect x={50} y={15} width={140} height={130} rx={4} {...stroke} strokeWidth={7} />
        </g>
      );
    case 'scissors':
      return (
        <g {...stroke}>
          <circle cx={48} cy={20} r={14} />
          <circle cx={48} cy={140} r={14} />
        </g>
      );
    case 'crossing-sign':
      // A railway crossing sign: two red-and-white planks on a pole.
      return (
        <g>
          <line x1={120} y1={60} x2={120} y2={156} {...stroke} strokeWidth={8} />
          <g stroke="#fca5a5" strokeWidth={18} strokeLinecap="round" opacity={0.45}>
            <line x1={60} y1={22} x2={180} y2={98} />
            <line x1={60} y1={98} x2={180} y2={22} />
          </g>
        </g>
      );
  }
}
