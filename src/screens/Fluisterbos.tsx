import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Check,
  Lock,
  Star,
  Zap,
  Calculator,
  BookOpen,
  PenTool,
  Leaf,
  Loader2,
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Types
type ExerciseStatus = 'completed' | 'available' | 'locked';
type SubjectType = 'math' | 'reading' | 'writing';
type SubjectTab = 'all' | SubjectType;

interface StageExercise {
  id: string;
  order: number;
  title: string;
  subject: SubjectType;
  status: ExerciseStatus;
  xpReward: number;
  route: string;
  stars: number;
}

// Subject config
const SUBJECTS: { id: SubjectType; label: string; icon: React.ElementType; emoji: string; color: string; lightBg: string; darkBg: string }[] = [
  { id: 'math',    label: 'Rekenen',  icon: Calculator, emoji: '🔢', color: 'text-blue-600',   lightBg: 'bg-blue-50 border-blue-200',   darkBg: 'bg-blue-500' },
  { id: 'reading', label: 'Lezen',    icon: BookOpen,   emoji: '📖', color: 'text-violet-600', lightBg: 'bg-violet-50 border-violet-200', darkBg: 'bg-violet-500' },
  { id: 'writing', label: 'Schrijven', icon: PenTool,   emoji: '✏️', color: 'text-orange-600', lightBg: 'bg-orange-50 border-orange-200', darkBg: 'bg-orange-500' },
];

function useExercises() {
  return useQuery({
    queryKey: ['exercises', 'stage-1'],
    queryFn: async (): Promise<StageExercise[]> => {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('stage', 'stage-1')
        .order('subject')
        .order('display_order');

      if (error) throw error;

      // For now, all exercises default to 'available'. 
      // Status/stars will be derived from exercise_attempts once child context is wired.
      return (exercises || []).map((ex) => ({
        id: ex.id,
        order: ex.display_order,
        title: ex.title,
        subject: ex.subject as SubjectType,
        status: 'available' as ExerciseStatus,
        xpReward: ex.xp_reward,
        route: ex.route,
        stars: 0,
      }));
    },
  });
}

export function Fluisterbos() {
  const navigate = useNavigate();
  const { xp: _xp } = useGame();
  const [activeTab, setActiveTab] = useState<SubjectTab>('all');
  const { data: allExercises = [], isLoading } = useExercises();

  const completed = allExercises.filter(e => e.status === 'completed');
  const totalXpEarned = completed.reduce((s, e) => s + e.xpReward, 0);
  const progressPct = allExercises.length > 0
    ? Math.round((completed.length / allExercises.length) * 100)
    : 0;

  const filteredExercises = activeTab === 'all'
    ? allExercises
    : allExercises.filter(e => e.subject === activeTab);

  const subjectsToShow = activeTab === 'all'
    ? SUBJECTS
    : SUBJECTS.filter(s => s.id === activeTab);

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

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto w-full">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-slate-500">{completed.length} / {allExercises.length} opdrachten</span>
            <span className="text-xs font-bold text-teal-600">{progressPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
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
          {SUBJECTS.map(sub => {
            const count = allExercises.filter(e => e.subject === sub.id).length;
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
        {subjectsToShow.map(sub => {
          const exercises = filteredExercises.filter(e => e.subject === sub.id);
          if (exercises.length === 0) return null;
          const subCompleted = exercises.filter(e => e.status === 'completed').length;
          const subAvailable = exercises.filter(e => e.status === 'available').length;
          const Icon = sub.icon;

          return (
            <div key={sub.id} className="mb-6">
              {/* Section header */}
              <div className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border mb-3',
                sub.lightBg
              )}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', sub.darkBg)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-slate-800 text-base">{sub.emoji} {sub.label}</h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    {subCompleted} voltooid · {subAvailable} beschikbaar
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <SubjectProgress completed={subCompleted} total={exercises.length} />
                </div>
              </div>

              {/* Exercise grid */}
              <ExerciseGrid exercises={exercises} subject={sub} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Subject progress ring
function SubjectProgress({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative w-11 h-11 flex items-center justify-center">
      <svg width="44" height="44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <motion.circle
          cx="22" cy="22" r={r} fill="none" stroke="#14b8a6" strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-[10px] font-black text-slate-600">{Math.round(pct)}%</span>
    </div>
  );
}

// Tab button
function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
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
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded-lg font-black',
        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
      )}>
        {count}
      </span>
    </button>
  );
}

// Exercise grid component
function ExerciseGrid({ exercises, subject }: { exercises: StageExercise[]; subject: typeof SUBJECTS[number] }) {
  const navigate = useNavigate();

  if (exercises.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-4xl mb-3">🌱</p>
        <p className="text-slate-400 font-semibold">Geen opdrachten gevonden</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {exercises.map((ex, i) => {
        const isCompleted = ex.status === 'completed';
        const isAvailable = ex.status === 'available';
        const isLocked = ex.status === 'locked';

        return (
          <motion.button
            key={ex.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.03, 0.5), type: 'spring', bounce: 0.3 }}
            onClick={() => { if (isAvailable) navigate(ex.route); }}
            disabled={!isAvailable}
            className={cn(
              'relative rounded-2xl p-3 flex flex-col items-center gap-1.5 border transition-all text-center',
              isCompleted && 'bg-teal-50 border-teal-200 cursor-default',
              isAvailable && 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm cursor-pointer',
              isLocked && 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed',
            )}
          >
            {/* Order badge */}
            <div className={cn(
              'absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm',
              isCompleted ? 'bg-teal-500' : isAvailable ? 'bg-orange-400' : 'bg-slate-400'
            )}>
              <span className="text-white font-black" style={{ fontSize: '9px' }}>{ex.order}</span>
            </div>

            {/* Status icon */}
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border',
              isCompleted
                ? 'bg-teal-500 border-teal-600'
                : isAvailable
                  ? subject.lightBg
                  : 'bg-slate-200 border-slate-300'
            )}>
              {isCompleted && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
              {isLocked && <Lock className="w-4 h-4 text-slate-400" strokeWidth={2.5} />}
              {isAvailable && (
                <span className={subject.color}>
                  <subject.icon className="w-4 h-4" />
                </span>
              )}
            </div>

            {/* Title */}
            <p className={cn(
              'font-bold leading-tight text-[11px]',
              isCompleted ? 'text-teal-700' : isAvailable ? 'text-slate-700' : 'text-slate-400'
            )}>
              {ex.title}
            </p>

            {/* Stars for completed */}
            {isCompleted && (
              <div className="flex gap-0.5">
                {[1, 2, 3].map(s => (
                  <Star
                    key={s}
                    className={cn(
                      'w-3 h-3',
                      s <= ex.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-300'
                    )}
                  />
                ))}
              </div>
            )}

            {/* XP for available */}
            {isAvailable && (
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 rounded-lg">
                +{ex.xpReward} XP
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
