import type { Subject } from '@/hooks/usePracticeMenu';

/** Picture per type of exercise, keyed by the route family ("/exercises/clock"). */
const TYPE_EMOJI: Record<string, string> = {
  '/exercises/math': '➕',
  '/exercises/bonds': '🔗',
  '/exercises/dots': '🔵',
  '/exercises/number-line': '📏',
  '/exercises/comparison': '⚖️',
  '/exercises/compare-objects': '🔍',
  '/exercises/money': '💶',
  '/exercises/clock': '🕐',
  '/exercises/split-box': '📦',
  '/exercises/subtract-box': '➖',
  '/exercises/sum-split': '🧩',
  '/exercises/write-number': '🔢',
  '/exercises/write-digit': '✏️',
  '/exercises/write-letter': '✍️',
  '/exercises/language': '📖',
  '/exercises/sentence-doctor': '🩺',
  '/exercises/sound-house': '🏠',
  '/exercises/picture-word': '🖼️',
};

const SUBJECT_EMOJI: Record<Subject, string> = {
  math: '🔢',
  reading: '📖',
  writing: '✏️',
  other: '🎯',
};

export function exerciseTypeEmoji(typeKey: string, subject: Subject): string {
  return TYPE_EMOJI[typeKey] ?? SUBJECT_EMOJI[subject] ?? '⭐';
}

export const SUBJECTS: { id: Subject; label: string; emoji: string }[] = [
  { id: 'math', label: 'Rekenen', emoji: SUBJECT_EMOJI.math },
  { id: 'reading', label: 'Lezen', emoji: SUBJECT_EMOJI.reading },
  { id: 'writing', label: 'Schrijven', emoji: SUBJECT_EMOJI.writing },
  { id: 'other', label: 'Andere', emoji: SUBJECT_EMOJI.other },
];

/** "rekenoefeningen", "leesoefeningen", ... for "Nog 12 rekenoefeningen tot je ijsje". */
export const SUBJECT_EXERCISES: Record<Subject, string> = {
  math: 'rekenoefeningen',
  reading: 'leesoefeningen',
  writing: 'schrijfoefeningen',
  other: 'oefeningen',
};
