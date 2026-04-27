import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Zap,
  Calculator,
  BookOpen,
  PenTool,
  Leaf,
  Loader2,
  CheckCircle2,
  Clock,
  Coins,
  Hash,
  BarChart3,
  Ruler,
  Pencil,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStageExercises, REQUIRED_COMPLETIONS } from '@/hooks/useStageExercises';
import { useStageMastery, STAGE_NAMES } from '@/hooks/useStageMastery';
import { toast } from '@/hooks/use-toast';
import type { StageExercise, SubjectConfig } from '@/types/stage';

/* ── Subject config ─────────────────────────────────── */
const SUBJECTS: SubjectConfig[] = [
  {
    id: 'math',
    label: 'Rekenen',
    icon: Calculator,
    emoji: '🔢',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    accent: 'text-blue-600',
    progressColor: 'bg-blue-500',
    progressTrack: 'bg-blue-100',
  },
  {
    id: 'reading',
    label: 'Lezen',
    icon: BookOpen,
    emoji: '📖',
    gradient: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    accent: 'text-violet-600',
    progressColor: 'bg-violet-500',
    progressTrack: 'bg-violet-100',
  },
  {
    id: 'writing',
    label: 'Schrijven',
    icon: PenTool,
    emoji: '✏️',
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    accent: 'text-orange-600',
    progressColor: 'bg-orange-500',
    progressTrack: 'bg-orange-100',
  },
];

/* ── Main component ─────────────────────────────────── */
export function Fluisterbos() {
  const navigate = useNavigate();
  const { stage: stageParam } = useParams<{ stage?: string }>();
  const stage = Math.max(1, Math.min(4, Number(stageParam) || 1));
  const { data: allExercises = [], isLoading } = useStageExercises(stage);
  const { stages, isLoading: masteryLoading } = useStageMastery();

  // Guard: redirect if locked
  useEffect(() => {
    if (masteryLoading) return;
    const s = stages.find((x) => x.stage === stage);
    if (s?.isLocked) {
      toast({
        title: 'Nog op slot 🔒',
        description: `Voltooi eerst de vorige stage om "${STAGE_NAMES[stage]}" te openen.`,
      });
      navigate('/app/map', { replace: true });
    }
  }, [masteryLoading, stages, stage, navigate]);

  const mastered = allExercises.filter((e) => e.completions >= REQUIRED_COMPLETIONS);
  const totalXpEarned = mastered.reduce((s, e) => s + e.xpReward, 0);
  const overallPct =
    allExercises.length > 0 ? Math.round((mastered.length / allExercises.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="h-full w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden">
      {/* ── Header ────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 pt-10 pb-5 flex-shrink-0 shadow-sm">
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {/* Top row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app/map')}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-2xl transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Leaf className="w-3 h-3 text-teal-500" /> Stage {stage} · {STAGE_NAMES[stage]}
              </p>
              <h1 className="font-black text-xl text-slate-900 truncate">Het Fluisterbos</h1>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex-shrink-0">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-black text-amber-700 text-sm">{totalXpEarned} XP</span>
            </div>
          </div>

          {/* Overall progress */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-slate-500">
                Stage voortgang · {mastered.length} / {allExercises.length} voltooid
              </span>
              <span className="text-xs font-black text-teal-600">{overallPct}%</span>
            </div>
            <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {SUBJECTS.map((sub) => {
            const exercises = allExercises.filter((e) => e.subject === sub.id);
            if (exercises.length === 0) return null;
            const subMastered = exercises.filter((e) => e.completions >= REQUIRED_COMPLETIONS).length;
            const subPct = Math.round((subMastered / exercises.length) * 100);
            const Icon = sub.icon;

            return (
              <section key={sub.id}>
                {/* Section header */}
                <div className={cn('flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r mb-4', sub.gradient)}>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-white text-base">
                      {sub.emoji} {sub.label}
                    </h2>
                    <p className="text-xs text-white/80 font-semibold">
                      {subMastered} / {exercises.length} voltooid · {subPct}%
                    </p>
                  </div>
                </div>

                {/* Grid of exercise cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {exercises.map((ex, i) => (
                    <ExerciseCard key={ex.id} exercise={ex} subject={sub} index={i} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Exercise card ──────────────────────────────────── */
function ExerciseCard({
  exercise,
  subject,
  index,
}: {
  exercise: StageExercise;
  subject: SubjectConfig;
  index: number;
}) {
  const navigate = useNavigate();
  const pct = Math.min((exercise.completions / REQUIRED_COMPLETIONS) * 100, 100);
  const isMastered = exercise.completions >= REQUIRED_COMPLETIONS;
  const isStarted = exercise.completions > 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', bounce: 0.15 }}
      onClick={() => navigate(`/app${exercise.route}`)}
      className={cn(
        'relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all',
        isMastered
          ? 'bg-teal-50 border-teal-200'
          : cn(subject.bg, subject.border, 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0')
      )}
    >
      {/* Status badge */}
      {isMastered && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-5 h-5 text-teal-500" strokeWidth={2.5} />
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-2',
          isMastered ? 'bg-teal-500' : `bg-gradient-to-br ${subject.gradient}`
        )}
      >
        <ExerciseIcon route={exercise.route} className="w-5 h-5 text-white" />
      </div>

      {/* Title */}
      <p
        className={cn(
          'font-bold text-sm leading-tight mb-2',
          isMastered ? 'text-teal-700' : 'text-slate-800'
        )}
      >
        {exercise.title}
      </p>

      {/* Progress bar */}
      <div className="w-full space-y-1">
        <div className={cn('h-2 rounded-full overflow-hidden w-full', subject.progressTrack)}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: Math.min(index * 0.04, 0.4) + 0.3, ease: 'easeOut' }}
            className={cn('h-full rounded-full', isMastered ? 'bg-teal-500' : subject.progressColor)}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">
            {exercise.completions}/{REQUIRED_COMPLETIONS}
          </span>
          {exercise.bestStars > 0 && (
            <div className="flex gap-0.5">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'w-2.5 h-2.5',
                    s <= exercise.bestStars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* XP label */}
      <span className="text-[10px] font-bold text-amber-600 mt-1">+{exercise.xpReward} XP</span>

      {/* Status text */}
      {!isStarted && !isMastered && (
        <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Nog niet gestart</span>
      )}
    </motion.button>
  );
}

/* ── Route-based icon picker ────────────────────────── */
function ExerciseIcon({ route, className }: { route: string; className?: string }) {
  if (route.includes('exercises/clock')) return <Clock className={className} />;
  if (route.includes('exercises/money')) return <Coins className={className} />;
  if (route.includes('exercises/number-line')) return <Ruler className={className} />;
  if (route.includes('exercises/comparison')) return <BarChart3 className={className} />;
  if (route.includes('exercises/dots')) return <Hash className={className} />;
  if (route.includes('exercises/bonds')) return <Zap className={className} />;
  if (route.includes('exercises/write-letter')) return <PenTool className={className} />;
  if (route.includes('exercises/write-digit')) return <Pencil className={className} />;
  if (route.includes('exercises/write-number')) return <Type className={className} />;
  if (route.includes('exercises/language')) return <BookOpen className={className} />;
  return <Calculator className={className} />;
}
