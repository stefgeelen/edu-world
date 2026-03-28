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
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';

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

const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));

// Exercise data organised by subject
const ALL_EXERCISES: StageExercise[] = [
  // ── MATH ──
  { id: 'fb-01', order: 1,  title: 'Tellen tot 10',        subject: 'math', status: 'completed', xpReward: 20,  route: '/exercise/1',       stars: 3 },
  { id: 'fb-03', order: 2,  title: 'Optellen tot 10',      subject: 'math', status: 'completed', xpReward: 25,  route: '/exercise/2',       stars: 2 },
  { id: 'fb-05', order: 3,  title: 'Getallen splitsen',    subject: 'math', status: 'completed', xpReward: 30,  route: '/exercise-bonds/1', stars: 2 },
  { id: 'fb-09', order: 4,  title: 'Plus en min',          subject: 'math', status: 'completed', xpReward: 35,  route: '/exercise/4',       stars: 2 },
  { id: 'fb-11', order: 5,  title: 'Rekenen tot 20',       subject: 'math', status: 'completed', xpReward: 35,  route: '/exercise/6',       stars: 3 },
  { id: 'fb-13', order: 6,  title: 'Getallenlijn',         subject: 'math', status: 'available', xpReward: 40,  route: '/exercise-bonds/2', stars: 0 },
  { id: 'fb-15', order: 7,  title: 'Meten & vergelijken',  subject: 'math', status: 'available', xpReward: 40,  route: '/exercise/7',       stars: 0 },
  { id: 'fb-17', order: 8,  title: 'Getallenpatronen',     subject: 'math', status: 'available', xpReward: 40,  route: '/exercise-bonds/3', stars: 0 },
  { id: 'fb-21', order: 9,  title: 'Tafels van 2',         subject: 'math', status: 'locked',    xpReward: 50,  route: '/exercise/10',      stars: 0 },
  { id: 'fb-23', order: 10, title: 'Breuken intro',        subject: 'math', status: 'locked',    xpReward: 55,  route: '/exercise-bonds/4', stars: 0 },
  { id: 'fb-25', order: 11, title: 'Klokkijken',           subject: 'math', status: 'locked',    xpReward: 55,  route: '/exercise/11',      stars: 0 },
  { id: 'fb-28', order: 12, title: 'Tafels van 5',         subject: 'math', status: 'locked',    xpReward: 60,  route: '/exercise/14',      stars: 0 },
  { id: 'fb-30', order: 13, title: 'Getallen tot 100',     subject: 'math', status: 'locked',    xpReward: 60,  route: '/exercise-bonds/5', stars: 0 },
  { id: 'fb-40', order: 14, title: 'Geld rekenen',         subject: 'math', status: 'locked',    xpReward: 80,  route: '/exercise-bonds/7', stars: 0 },
  { id: 'fb-dot-1',     order: 15, title: 'Stippen plaatsen',  subject: 'math', status: 'available', xpReward: 30, route: '/exercise-dots/1',    stars: 0 },
  { id: 'fb-numline-1', order: 16, title: 'Getallenlijn',      subject: 'math', status: 'available', xpReward: 40, route: '/exercise-numline/1', stars: 0 },
  { id: 'fb-compare-1', order: 17, title: 'Groter of kleiner', subject: 'math', status: 'available', xpReward: 35, route: '/exercise-compare/1', stars: 0 },

  // ── READING ──
  { id: 'fb-02', order: 1,  title: 'Letters herkennen',    subject: 'reading', status: 'completed', xpReward: 20,  route: '/exercise-lang/1',  stars: 3 },
  { id: 'fb-06', order: 2,  title: 'Rijmwoorden',          subject: 'reading', status: 'completed', xpReward: 25,  route: '/exercise-lang/3',  stars: 3 },
  { id: 'fb-08', order: 3,  title: 'Zinnen maken',         subject: 'reading', status: 'completed', xpReward: 30,  route: '/exercise-lang/4',  stars: 3 },
  { id: 'fb-12', order: 4,  title: 'Begrijpend lezen 1',   subject: 'reading', status: 'completed', xpReward: 35,  route: '/exercise-lang/5',  stars: 2 },
  { id: 'fb-14', order: 5,  title: 'Woordenschat bos',     subject: 'reading', status: 'available', xpReward: 35,  route: '/exercise-lang/6',  stars: 0 },
  { id: 'fb-16', order: 6,  title: 'Leestekens',           subject: 'reading', status: 'available', xpReward: 35,  route: '/exercise-lang/7',  stars: 0 },
  { id: 'fb-20', order: 7,  title: 'Samenstellingen',      subject: 'reading', status: 'available', xpReward: 40,  route: '/exercise-lang/8',  stars: 0 },
  { id: 'fb-22', order: 8,  title: 'Begrijpend lezen 2',   subject: 'reading', status: 'locked',    xpReward: 50,  route: '/exercise-lang/9',  stars: 0 },
  { id: 'fb-29', order: 9,  title: 'Synoniemen',           subject: 'reading', status: 'locked',    xpReward: 50,  route: '/exercise-lang/11', stars: 0 },
  { id: 'fb-34', order: 10, title: 'Woordzoeker',          subject: 'reading', status: 'locked',    xpReward: 55,  route: '/exercise-lang/13', stars: 0 },
  { id: 'fb-37', order: 11, title: 'Leesdiploma',          subject: 'reading', status: 'locked',    xpReward: 75,  route: '/exercise-lang/14', stars: 0 },
  { id: 'fb-39', order: 12, title: 'Spreekwoorden',        subject: 'reading', status: 'locked',    xpReward: 75,  route: '/exercise-lang/15', stars: 0 },
  { id: 'fb-47', order: 13, title: 'Woordenschat meester', subject: 'reading', status: 'locked',    xpReward: 90,  route: '/exercise-lang/17', stars: 0 },

  // ── WRITING ──
  { id: 'fb-04', order: 1,  title: 'Woorden spellen',      subject: 'writing', status: 'completed', xpReward: 25,  route: '/exercise-lang/2',  stars: 3 },
  { id: 'fb-24', order: 2,  title: 'Schrijf een verhaal',  subject: 'writing', status: 'locked',    xpReward: 50,  route: '/exercise-lang/10', stars: 0 },
  { id: 'fb-32', order: 3,  title: 'Gedicht schrijven',    subject: 'writing', status: 'locked',    xpReward: 55,  route: '/exercise-lang/12', stars: 0 },
  { id: 'fb-44', order: 4,  title: 'Dictee kampioen',      subject: 'writing', status: 'locked',    xpReward: 85,  route: '/exercise-lang/16', stars: 0 },
  { id: 'fb-write-1',   order: 5, title: 'Getal schrijven',   subject: 'writing', status: 'available', xpReward: 30, route: '/exercise-write/1',   stars: 0 },
  { id: 'fb-digit-0', order: 6,  title: 'Schrijf: 0',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/0', stars: 0 },
  { id: 'fb-digit-1', order: 7,  title: 'Schrijf: 1',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/1', stars: 0 },
  { id: 'fb-digit-2', order: 8,  title: 'Schrijf: 2',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/2', stars: 0 },
  { id: 'fb-digit-3', order: 9,  title: 'Schrijf: 3',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/3', stars: 0 },
  { id: 'fb-digit-4', order: 10, title: 'Schrijf: 4',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/4', stars: 0 },
  { id: 'fb-digit-5', order: 11, title: 'Schrijf: 5',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/5', stars: 0 },
  { id: 'fb-digit-6', order: 12, title: 'Schrijf: 6',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/6', stars: 0 },
  { id: 'fb-digit-7', order: 13, title: 'Schrijf: 7',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/7', stars: 0 },
  { id: 'fb-digit-8', order: 14, title: 'Schrijf: 8',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/8', stars: 0 },
  { id: 'fb-digit-9', order: 15, title: 'Schrijf: 9',  subject: 'writing', status: 'available', xpReward: 25, route: '/exercise-write-digit/9', stars: 0 },
];

export function Fluisterbos() {
  const navigate = useNavigate();
  const { xp: _xp } = useGame();
  const [activeTab, setActiveTab] = useState<SubjectTab>('all');

  const completed = ALL_EXERCISES.filter(e => e.status === 'completed');
  const totalXpEarned = completed.reduce((s, e) => s + e.xpReward, 0);
  const progressPct = Math.round((completed.length / ALL_EXERCISES.length) * 100);

  const filteredExercises = activeTab === 'all'
    ? ALL_EXERCISES
    : ALL_EXERCISES.filter(e => e.subject === activeTab);

  const subjectsToShow = activeTab === 'all'
    ? SUBJECTS
    : SUBJECTS.filter(s => s.id === activeTab);

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-10 pb-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 mb-4 max-w-2xl mx-auto w-full">
          <button
            onClick={() => navigate('/map')}
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
            <span className="text-xs font-bold text-slate-500">{completed.length} / {ALL_EXERCISES.length} opdrachten</span>
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
            count={ALL_EXERCISES.length}
          />
          {SUBJECTS.map(sub => {
            const count = ALL_EXERCISES.filter(e => e.subject === sub.id).length;
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
