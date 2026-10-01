import {
  BarChart3,
  BookOpen,
  Boxes,
  Calculator,
  Clock,
  Coins,
  Hash,
  Home,
  Image,
  Link2,
  Minus,
  PenTool,
  Pencil,
  Puzzle,
  Ruler,
  Search,
  Stethoscope,
  Target,
  Type,
  type LucideIcon,
} from 'lucide-react';
import type { Subject } from '@/hooks/usePracticeMenu';

/** Icon per type of exercise, keyed by the route family ("/exercises/clock"). */
const TYPE_ICON: Record<string, LucideIcon> = {
  '/exercises/math': Calculator,
  '/exercises/bonds': Link2,
  '/exercises/dots': Hash,
  '/exercises/number-line': Ruler,
  '/exercises/comparison': BarChart3,
  '/exercises/compare-objects': Search,
  '/exercises/money': Coins,
  '/exercises/clock': Clock,
  '/exercises/split-box': Boxes,
  '/exercises/subtract-box': Minus,
  '/exercises/sum-split': Puzzle,
  '/exercises/write-number': Type,
  '/exercises/write-digit': Pencil,
  '/exercises/write-letter': PenTool,
  '/exercises/language': BookOpen,
  '/exercises/sentence-doctor': Stethoscope,
  '/exercises/sound-house': Home,
  '/exercises/picture-word': Image,
};

export interface SubjectStyle {
  id: Subject;
  label: string;
  icon: LucideIcon;
  /** Header bar and icon squares. */
  gradient: string;
  /** Card background and border. */
  bg: string;
  border: string;
}

/** Same palette as the old trimester screens: one colour per subject. */
export const SUBJECTS: SubjectStyle[] = [
  { id: 'math', label: 'Rekenen', icon: Calculator, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'reading', label: 'Lezen', icon: BookOpen, gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { id: 'writing', label: 'Schrijven', icon: PenTool, gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'other', label: 'Andere', icon: Target, gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
];

export function subjectStyle(subject: Subject): SubjectStyle {
  return SUBJECTS.find((s) => s.id === subject) ?? SUBJECTS[SUBJECTS.length - 1];
}

export function exerciseTypeIcon(typeKey: string, subject: Subject): LucideIcon {
  return TYPE_ICON[typeKey] ?? subjectStyle(subject).icon;
}

/** "rekenoefeningen", "leesoefeningen", ... for "Nog 12 rekenoefeningen tot je ijsje". */
export const SUBJECT_EXERCISES: Record<Subject, string> = {
  math: 'rekenoefeningen',
  reading: 'leesoefeningen',
  writing: 'schrijfoefeningen',
  other: 'oefeningen',
};
