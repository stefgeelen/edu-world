import { cn } from '@/lib/utils';
import { exerciseTypeIcon, subjectStyle } from '@/data/exerciseTypes';
import type { Subject } from '@/hooks/usePracticeMenu';

/** The coloured square with a type's icon, as on the old trimester cards. */
export function ExerciseTypeIcon({
  typeKey,
  subject,
  size = 'md',
  muted = false,
}: {
  typeKey: string;
  subject: Subject;
  size?: 'sm' | 'md';
  muted?: boolean;
}) {
  const Icon = exerciseTypeIcon(typeKey, subject);
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-gradient-to-br shadow-sm',
        size === 'md' ? 'h-12 w-12 rounded-xl' : 'h-10 w-10 rounded-lg',
        muted ? 'from-slate-300 to-slate-400' : subjectStyle(subject).gradient
      )}
    >
      <Icon className={cn('text-white', size === 'md' ? 'h-6 w-6' : 'h-5 w-5')} strokeWidth={2.25} />
    </span>
  );
}
