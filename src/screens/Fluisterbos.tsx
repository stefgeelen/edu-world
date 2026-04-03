import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Types
type SubjectType = 'math' | 'reading' | 'writing';
type SubjectTab = 'all' | SubjectType;

const REQUIRED_COMPLETIONS = 5;

interface StageExercise {
  id: string;
  order: number;
  title: string;
  subject: SubjectType;
  xpReward: number;
  route: string;
  completions: number; // how many times completed
  bestStars: number;
}

// Subject config
const SUBJECTS: {
  id: SubjectType;
  label: string;
  icon: React.ElementType;
  emoji: string;
  gradient: string;
  accentColor: string;
  progressColor: string;
}[] = [
  {
    id: 'math',
    label: 'Rekenen',
    icon: Calculator,
    emoji: '🔢',
    gradient: 'from-blue-500 to-blue-600',
    accentColor: 'text-blue-600',
    progressColor: 'bg-blue-500',
  },
  {
    id: 'reading',
    label: 'Lezen',
    icon: BookOpen,
    emoji: '📖',
    gradient: 'from-violet-500 to-violet-600',
    accentColor: 'text-violet-600',
    progressColor: 'bg-violet-500',
  },
  {
    id: 'writing',
    label: 'Schrijven',
    icon: PenTool,
    emoji: '✏️',
    gradient: 'from-orange-500 to-orange-600',
    accentColor: 'text-orange-600',
    progressColor: 'bg-orange-500',
  },
];

function useStageExercises() {
  const { user } = useAuth();

  // Get child
  const childQuery = useQuery({
    queryKey: ['my-child', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id')
        .eq('parent_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const childId = childQuery.data?.id;

  // Get exercises + attempts count
  return useQuery({
    queryKey: ['stage-exercises-progress', childId],
    queryFn: async (): Promise<StageExercise[]> => {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('stage', 'stage-1')
        .order('subject')
        .order('display_order');

      if (error) throw error;

      // Fetch attempts for this child
      let attemptsByExercise: Record<string, { count: number; bestStars: number }> = {};
      if (childId) {
        const { data: attempts } = await supabase
          .from('exercise_attempts')
          .select('exercise_id, stars')
          .eq('child_id', childId);

        if (attempts) {
          for (const a of attempts) {
            if (!attemptsByExercise[a.exercise_id]) {
              attemptsByExercise[a.exercise_id] = { count: 0, bestStars: 0 };
            }
            attemptsByExercise[a.exercise_id].count++;
            attemptsByExercise[a.exercise_id].bestStars = Math.max(
              attemptsByExercise[a.exercise_id].bestStars,
              a.stars
            );
          }
        }
      }

      return (exercises || []).map((ex) => ({
        id: ex.id,
        order: ex.display_order,
        title: ex.title,
        subject: ex.subject as SubjectType,
        xpReward: ex.xp_reward,
        route: ex.route,
        completions: attemptsByExercise[ex.id]?.count ?? 0,
        bestStars: attemptsByExercise[ex.id]?.bestStars ?? 0,
      }));
    },
    enabled: childQuery.isFetched,
  });
}

export function Fluisterbos() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SubjectTab>('all');
  const { data: allExercises = [], isLoading } = useStageExercises();

  const mastered = allExercises.filter((e) => e.completions >= REQUIRED_COMPLETIONS);
  const totalXpEarned = mastered.reduce((s, e) => s + e.xpReward, 0);
  const overallPct =
    allExercises.length > 0
      ? Math.round((mastered.length / allExercises.length) * 100)
      : 0;

  const filteredExercises =
    activeTab === 'all' ? allExercises : allExercises.filter((e) => e.subject === activeTab);

  const subjectsToShow =
    activeTab === 'all' ? SUBJECTS : SUBJECTS.filter((s) => s.id === activeTab);

  if (isLoading) {
    return (
      <div className="h-full w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-10 pb-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 mb-4 max-w-2xl mx-auto w-full">
          <button
            onClick={() => navigate('/app/map')}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-2xl transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" strokeWidth={2.5} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
              <Leaf className="w-3 h-3 text-teal-500" /> Stage 1
            </p>
            <h1 className="font-black text-slate-900 truncate">Het Fluisterbos</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex-shrink-0">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-black text-amber-700 text-sm">{totalXpEarned} XP</span>
          </div>
        </div>

        {/* Overall progress */}
        <div className="max-w-2xl mx-auto w-full">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-slate-500">
              {mastered.length} / {allExercises.length} voltooid
            </span>
            <span className="text-xs font-bold text-teal-600">{overallPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Subject tabs */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0 max-w-2xl mx-auto w-full">
        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            label="Alles"
            count={allExercises.length}
          />
          {SUBJECTS.map((sub) => {
            const count = allExercises.filter((e) => e.subject === sub.id).length;
            return (
              <TabButton
                key={sub.id}
                active={activeTab === sub.id}
                onClick={() => setActiveTab(sub.id)}
                label={`${sub.emoji} ${sub.label}`}
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* Exercise list grouped by subject */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 max-w-2xl mx-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {subjectsToShow.map((sub) => {
          const exercises = filteredExercises.filter((e) => e.subject === sub.id);
          if (exercises.length === 0) return null;
          const subMastered = exercises.filter((e) => e.completions >= REQUIRED_COMPLETIONS).length;
          const subPct = Math.round((subMastered / exercises.length) * 100);
          const Icon = sub.icon;

          return (
            <div key={sub.id} className="mb-6">
              {/* Section header */}
              <div className={cn('flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r mb-3', sub.gradient)}>
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

              {/* Exercise list */}
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <ExerciseRow key={ex.id} exercise={ex} subject={sub} index={i} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Single exercise row with progress bar
function ExerciseRow({
  exercise,
  subject,
  index,
}: {
  exercise: StageExercise;
  subject: (typeof SUBJECTS)[number];
  index: number;
}) {
  const navigate = useNavigate();
  const pct = Math.min((exercise.completions / REQUIRED_COMPLETIONS) * 100, 100);
  const isMastered = exercise.completions >= REQUIRED_COMPLETIONS;
  const Icon = subject.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', bounce: 0.2 }}
      onClick={() => navigate(`/app${exercise.route}`)}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
        isMastered
          ? 'bg-teal-50 border-teal-200'
          : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
          isMastered ? 'bg-teal-500' : `bg-gradient-to-br ${subject.gradient}`
        )}
      >
        {isMastered ? (
          <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
        ) : (
          <Icon className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p
            className={cn(
              'font-bold text-sm truncate',
              isMastered ? 'text-teal-700' : 'text-slate-800'
            )}
          >
            {exercise.title}
          </p>
          <span className="text-[11px] font-bold text-slate-400 flex-shrink-0 ml-2">
            {exercise.completions}/{REQUIRED_COMPLETIONS}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: Math.min(index * 0.04, 0.4) + 0.2, ease: 'easeOut' }}
            className={cn('h-full rounded-full', isMastered ? 'bg-teal-500' : subject.progressColor)}
          />
        </div>

        {/* Stars + XP row */}
        <div className="flex items-center gap-2 mt-1">
          {exercise.bestStars > 0 && (
            <div className="flex gap-0.5">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'w-3 h-3',
                    s <= exercise.bestStars
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200 fill-slate-200'
                  )}
                />
              ))}
            </div>
          )}
          <span className="text-[10px] font-bold text-amber-600">+{exercise.xpReward} XP</span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight
        className={cn(
          'w-4 h-4 flex-shrink-0',
          isMastered ? 'text-teal-400' : 'text-slate-300'
        )}
      />
    </motion.button>
  );
}

// Tab button
function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-sm transition-all whitespace-nowrap',
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      )}
    >
      {label}
      <span
        className={cn(
          'text-xs px-1.5 py-0.5 rounded-lg font-black',
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
        )}
      >
        {count}
      </span>
    </button>
  );
}
