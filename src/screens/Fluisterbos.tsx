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
  Type,
  Shapes,
  Music,
  Leaf,
  FlaskConical,
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';

// Types
type ExerciseStatus = 'completed' | 'available' | 'locked';
type ExerciseType = 'math' | 'language' | 'mixed' | 'science' | 'music';
type FilterTab = 'all' | 'available' | 'completed' | 'locked';

interface StageExercise {
  id: string;
  order: number;
  title: string;
  type: ExerciseType;
  status: ExerciseStatus;
  xpReward: number;
  route: string;
  stars: number;
}

// Icon renderer per type (avoid module-level JSX)
function TypeIcon({ type, className }: { type: ExerciseType; className?: string }) {
  const cls = className || 'w-4 h-4';
  switch (type) {
    case 'math':     return <Calculator className={cls} />;
    case 'language': return <Type className={cls} />;
    case 'mixed':    return <Shapes className={cls} />;
    case 'science':  return <FlaskConical className={cls} />;
    case 'music':    return <Music className={cls} />;
    default:         return <Calculator className={cls} />;
  }
}

const TYPE_COLOR: Record<ExerciseType, string> = {
  math:     'text-blue-600',
  language: 'text-violet-600',
  mixed:    'text-orange-600',
  science:  'text-teal-600',
  music:    'text-pink-600',
};

const TYPE_LIGHT: Record<ExerciseType, string> = {
  math:     'bg-blue-50 border-blue-200',
  language: 'bg-violet-50 border-violet-200',
  mixed:    'bg-orange-50 border-orange-200',
  science:  'bg-teal-50 border-teal-200',
  music:    'bg-pink-50 border-pink-200',
};

// Exercise data
const ALL_EXERCISES: StageExercise[] = [
  // Round 1: Tellen & Letters (1-10)
  { id: 'fb-01', order: 1,  title: 'Tellen tot 10',        type: 'math',     status: 'completed', xpReward: 20,  route: '/exercise/1',       stars: 3 },
  { id: 'fb-02', order: 2,  title: 'Letters herkennen',    type: 'language', status: 'completed', xpReward: 20,  route: '/exercise-lang/1',  stars: 3 },
  { id: 'fb-03', order: 3,  title: 'Optellen tot 10',      type: 'math',     status: 'completed', xpReward: 25,  route: '/exercise/2',       stars: 2 },
  { id: 'fb-04', order: 4,  title: 'Woorden spellen',      type: 'language', status: 'completed', xpReward: 25,  route: '/exercise-lang/2',  stars: 3 },
  { id: 'fb-05', order: 5,  title: 'Getallen splitsen',    type: 'math',     status: 'completed', xpReward: 30,  route: '/exercise-bonds/1', stars: 2 },
  { id: 'fb-06', order: 6,  title: 'Rijmwoorden',          type: 'language', status: 'completed', xpReward: 25,  route: '/exercise-lang/3',  stars: 3 },
  { id: 'fb-07', order: 7,  title: 'Vormen en kleuren',    type: 'mixed',    status: 'completed', xpReward: 20,  route: '/exercise/3',       stars: 1 },
  { id: 'fb-08', order: 8,  title: 'Zinnen maken',         type: 'language', status: 'completed', xpReward: 30,  route: '/exercise-lang/4',  stars: 3 },
  { id: 'fb-09', order: 9,  title: 'Plus en min',          type: 'math',     status: 'completed', xpReward: 35,  route: '/exercise/4',       stars: 2 },
  { id: 'fb-10', order: 10, title: 'Dieren van het bos',   type: 'science',  status: 'completed', xpReward: 25,  route: '/exercise/5',       stars: 3 },
  // Round 2: Rekenen & Lezen (11-20)
  { id: 'fb-11', order: 11, title: 'Reken tot 20',         type: 'math',     status: 'completed', xpReward: 35,  route: '/exercise/6',       stars: 3 },
  { id: 'fb-12', order: 12, title: 'Begrijpend lezen 1',   type: 'language', status: 'completed', xpReward: 35,  route: '/exercise-lang/5',  stars: 2 },
  { id: 'fb-13', order: 13, title: 'Getallenlijn',         type: 'math',     status: 'available', xpReward: 40,  route: '/exercise-bonds/2', stars: 0 },
  { id: 'fb-14', order: 14, title: 'Woordenschat bos',     type: 'language', status: 'available', xpReward: 35,  route: '/exercise-lang/6',  stars: 0 },
  { id: 'fb-15', order: 15, title: 'Meten vergelijken',    type: 'math',     status: 'available', xpReward: 40,  route: '/exercise/7',       stars: 0 },
  { id: 'fb-16', order: 16, title: 'Leestekens',           type: 'language', status: 'available', xpReward: 35,  route: '/exercise-lang/7',  stars: 0 },
  { id: 'fb-17', order: 17, title: 'Getallenpatronen',     type: 'math',     status: 'available', xpReward: 40,  route: '/exercise-bonds/3', stars: 0 },
  { id: 'fb-18', order: 18, title: 'Plantkunde basis',     type: 'science',  status: 'available', xpReward: 30,  route: '/exercise/8',       stars: 0 },
  { id: 'fb-19', order: 19, title: 'Bosritmes',            type: 'music',    status: 'available', xpReward: 30,  route: '/exercise/9',       stars: 0 },
  { id: 'fb-20', order: 20, title: 'Samenstellingen',      type: 'language', status: 'available', xpReward: 40,  route: '/exercise-lang/8',  stars: 0 },
  // Round 3: Verdieping (21-35)
  { id: 'fb-21', order: 21, title: 'Tafels van 2',         type: 'math',     status: 'locked',    xpReward: 50,  route: '/exercise/10',      stars: 0 },
  { id: 'fb-22', order: 22, title: 'Begrijpend lezen 2',   type: 'language', status: 'locked',    xpReward: 50,  route: '/exercise-lang/9',  stars: 0 },
  { id: 'fb-23', order: 23, title: 'Breuken intro',        type: 'math',     status: 'locked',    xpReward: 55,  route: '/exercise-bonds/4', stars: 0 },
  { id: 'fb-24', order: 24, title: 'Schrijf een verhaal',  type: 'language', status: 'locked',    xpReward: 50,  route: '/exercise-lang/10', stars: 0 },
  { id: 'fb-25', order: 25, title: 'Klokkijken',           type: 'math',     status: 'locked',    xpReward: 55,  route: '/exercise/11',      stars: 0 },
  { id: 'fb-26', order: 26, title: 'Seizoenen',            type: 'science',  status: 'locked',    xpReward: 45,  route: '/exercise/12',      stars: 0 },
  { id: 'fb-27', order: 27, title: 'Muzieknoten',          type: 'music',    status: 'locked',    xpReward: 45,  route: '/exercise/13',      stars: 0 },
  { id: 'fb-28', order: 28, title: 'Tafels van 5',         type: 'math',     status: 'locked',    xpReward: 60,  route: '/exercise/14',      stars: 0 },
  { id: 'fb-29', order: 29, title: 'Synoniemen',           type: 'language', status: 'locked',    xpReward: 50,  route: '/exercise-lang/11', stars: 0 },
  { id: 'fb-30', order: 30, title: 'Getallen tot 100',     type: 'math',     status: 'locked',    xpReward: 60,  route: '/exercise-bonds/5', stars: 0 },
  { id: 'fb-31', order: 31, title: 'Biologie bos',         type: 'science',  status: 'locked',    xpReward: 50,  route: '/exercise/15',      stars: 0 },
  { id: 'fb-32', order: 32, title: 'Gedicht schrijven',    type: 'language', status: 'locked',    xpReward: 55,  route: '/exercise-lang/12', stars: 0 },
  { id: 'fb-33', order: 33, title: 'Vormen meten',         type: 'math',     status: 'locked',    xpReward: 60,  route: '/exercise/16',      stars: 0 },
  { id: 'fb-34', order: 34, title: 'Woordzoeker',          type: 'language', status: 'locked',    xpReward: 55,  route: '/exercise-lang/13', stars: 0 },
  { id: 'fb-35', order: 35, title: 'Ritme en melodie',     type: 'music',    status: 'locked',    xpReward: 50,  route: '/exercise/17',      stars: 0 },
  // Round 4: Meester van het Fluisterbos (36-50)
  { id: 'fb-36', order: 36, title: 'Grote Rekenwedstrijd', type: 'math',     status: 'locked',    xpReward: 75,  route: '/exercise-bonds/6', stars: 0 },
  { id: 'fb-37', order: 37, title: 'Leesdiploma',          type: 'language', status: 'locked',    xpReward: 75,  route: '/exercise-lang/14', stars: 0 },
  { id: 'fb-38', order: 38, title: 'Tafels van 10',        type: 'math',     status: 'locked',    xpReward: 80,  route: '/exercise/18',      stars: 0 },
  { id: 'fb-39', order: 39, title: 'Spreekwoorden',        type: 'language', status: 'locked',    xpReward: 75,  route: '/exercise-lang/15', stars: 0 },
  { id: 'fb-40', order: 40, title: 'Geld rekenen',         type: 'math',     status: 'locked',    xpReward: 80,  route: '/exercise-bonds/7', stars: 0 },
  { id: 'fb-41', order: 41, title: 'Ecosysteem bos',       type: 'science',  status: 'locked',    xpReward: 70,  route: '/exercise/19',      stars: 0 },
  { id: 'fb-42', order: 42, title: 'Muziek componeren',    type: 'music',    status: 'locked',    xpReward: 70,  route: '/exercise/20',      stars: 0 },
  { id: 'fb-43', order: 43, title: 'Hoofdrekenen sprint',  type: 'math',     status: 'locked',    xpReward: 85,  route: '/exercise/21',      stars: 0 },
  { id: 'fb-44', order: 44, title: 'Dictee kampioen',      type: 'language', status: 'locked',    xpReward: 85,  route: '/exercise-lang/16', stars: 0 },
  { id: 'fb-45', order: 45, title: 'Puzzelwoud',           type: 'mixed',    status: 'locked',    xpReward: 90,  route: '/exercise/22',      stars: 0 },
  { id: 'fb-46', order: 46, title: 'Tafels mix',           type: 'math',     status: 'locked',    xpReward: 90,  route: '/exercise-bonds/8', stars: 0 },
  { id: 'fb-47', order: 47, title: 'Woordenschat meester', type: 'language', status: 'locked',    xpReward: 90,  route: '/exercise-lang/17', stars: 0 },
  { id: 'fb-48', order: 48, title: 'Natuurdagboek',        type: 'science',  status: 'locked',    xpReward: 80,  route: '/exercise/23',      stars: 0 },
  { id: 'fb-49', order: 49, title: 'Grote Mix-toets',      type: 'mixed',    status: 'locked',    xpReward: 100, route: '/exercise/24',      stars: 0 },
  { id: 'fb-50', order: 50, title: 'Fluisterbos Baas',     type: 'mixed',    status: 'locked',    xpReward: 150, route: '/exercise/25',      stars: 0 },
  // Bonus: Nieuwe interactieve oefeningen
  { id: 'fb-dot-1',     order: 51, title: 'Stippen plaatsen',  type: 'math', status: 'available', xpReward: 30, route: '/exercise-dots/1',    stars: 0 },
  { id: 'fb-write-1',   order: 52, title: 'Getal schrijven',   type: 'math', status: 'available', xpReward: 30, route: '/exercise-write/1',   stars: 0 },
  { id: 'fb-numline-1', order: 53, title: 'Getallenlijn',      type: 'math', status: 'available', xpReward: 40, route: '/exercise-numline/1', stars: 0 },
  { id: 'fb-compare-1', order: 54, title: 'Groter of kleiner', type: 'math', status: 'available', xpReward: 35, route: '/exercise-compare/1', stars: 0 },
  // Schrijf de getallen 0–9
  { id: 'fb-digit-0', order: 55, title: 'Schrijf: 0 (nul)',   type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/0', stars: 0 },
  { id: 'fb-digit-1', order: 56, title: 'Schrijf: 1 (één)',   type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/1', stars: 0 },
  { id: 'fb-digit-2', order: 57, title: 'Schrijf: 2 (twee)',  type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/2', stars: 0 },
  { id: 'fb-digit-3', order: 58, title: 'Schrijf: 3 (drie)',  type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/3', stars: 0 },
  { id: 'fb-digit-4', order: 59, title: 'Schrijf: 4 (vier)',  type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/4', stars: 0 },
  { id: 'fb-digit-5', order: 60, title: 'Schrijf: 5 (vijf)',  type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/5', stars: 0 },
  { id: 'fb-digit-6', order: 61, title: 'Schrijf: 6 (zes)',   type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/6', stars: 0 },
  { id: 'fb-digit-7', order: 62, title: 'Schrijf: 7 (zeven)', type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/7', stars: 0 },
  { id: 'fb-digit-8', order: 63, title: 'Schrijf: 8 (acht)',  type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/8', stars: 0 },
  { id: 'fb-digit-9', order: 64, title: 'Schrijf: 9 (negen)', type: 'math', status: 'available', xpReward: 25, route: '/exercise-write-digit/9', stars: 0 },
];

const ROUNDS = [
  { label: 'Ronde 1', range: [1,  10], subtitle: 'Tellen & Letters' },
  { label: 'Ronde 2', range: [11, 20], subtitle: 'Rekenen & Lezen' },
  { label: 'Ronde 3', range: [21, 35], subtitle: 'Verdieping' },
  { label: 'Ronde 4', range: [36, 50], subtitle: 'Meester van het Bos' },
  { label: 'Nieuw!',  range: [51, 65], subtitle: 'Interactieve Oefeningen' },
];

// Main component
export function Fluisterbos() {
  const navigate = useNavigate();
  const { xp: _xp } = useGame();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const completed = ALL_EXERCISES.filter(e => e.status === 'completed');
  const available = ALL_EXERCISES.filter(e => e.status === 'available');
  const locked    = ALL_EXERCISES.filter(e => e.status === 'locked');

  const totalXpEarned   = completed.reduce((s, e) => s + e.xpReward, 0);
  const totalXpPossible = ALL_EXERCISES.reduce((s, e) => s + e.xpReward, 0);
  const progressPct     = Math.round((completed.length / ALL_EXERCISES.length) * 100);

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all',       label: 'Alles',       count: ALL_EXERCISES.length },
    { id: 'available', label: 'Beschikbaar', count: available.length },
    { id: 'completed', label: 'Voltooid',    count: completed.length },
    { id: 'locked',    label: 'Vergrendeld', count: locked.length },
  ];

  const filteredExercises = activeTab === 'all'
    ? ALL_EXERCISES
    : ALL_EXERCISES.filter(e =>
        activeTab === 'available' ? e.status === 'available' :
        activeTab === 'completed' ? e.status === 'completed' :
        e.status === 'locked'
      );

  const showByRound = activeTab === 'all';

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

      {/* Info + filters */}
      <div className="px-4 pt-4 flex-shrink-0 max-w-2xl mx-auto w-full">
        {/* Story card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 mb-4 flex gap-3 items-start">
          <div className="text-3xl flex-shrink-0 leading-none pt-0.5">&#x1F989;</div>
          <div>
            <p className="font-black text-slate-800 mb-0.5">Het verhaal tot nu toe</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Je bent aangekomen in het Fluisterbos! De Grote Uil heeft hulp nodig -- de magische Fluisterstenen verliezen hun kracht. Help de dieren en herstel het bos!
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard value={completed.length} label="Voltooid"    color="text-teal-600"   bg="bg-teal-50 border-teal-200" />
          <StatCard value={available.length} label="Beschikbaar" color="text-orange-600" bg="bg-orange-50 border-orange-200" />
          <StatCard value={totalXpPossible}  label="Max XP"      color="text-amber-600"  bg="bg-amber-50 border-amber-200" suffix="xp" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-sm transition-all',
                activeTab === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-lg font-black',
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Exercise grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 max-w-2xl mx-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {showByRound ? (
          ROUNDS.map(round => {
            const roundExercises = filteredExercises.filter(
              e => e.order >= round.range[0] && e.order <= round.range[1]
            );
            if (roundExercises.length === 0) return null;
            const roundCompleted = roundExercises.filter(e => e.status === 'completed').length;
            return (
              <div key={round.label} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-black text-slate-800">{round.label}</h2>
                    <p className="text-xs text-slate-400 font-semibold">{round.subtitle}</p>
                  </div>
                  <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {roundCompleted}/{roundExercises.length}
                  </span>
                </div>
                <ExerciseGrid exercises={roundExercises} />
              </div>
            );
          })
        ) : (
          <ExerciseGrid exercises={filteredExercises} />
        )}
      </div>
    </div>
  );
}

// Exercise grid component
function ExerciseGrid({ exercises }: { exercises: StageExercise[] }) {
  const navigate = useNavigate();

  if (exercises.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-4xl mb-3">&#x1F331;</p>
        <p className="text-slate-400 font-semibold">Geen opdrachten gevonden</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {exercises.map((ex, i) => {
        const isCompleted = ex.status === 'completed';
        const isAvailable = ex.status === 'available';
        const isLocked    = ex.status === 'locked';

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
              isLocked    && 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed',
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
                  ? TYPE_LIGHT[ex.type]
                  : 'bg-slate-200 border-slate-300'
            )}>
              {isCompleted && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
              {isLocked    && <Lock  className="w-4 h-4 text-slate-400" strokeWidth={2.5} />}
              {isAvailable && (
                <span className={TYPE_COLOR[ex.type]}>
                  <TypeIcon type={ex.type} className="w-4 h-4" />
                </span>
              )}
            </div>

            {/* Title */}
            <p className={cn(
              'font-bold leading-tight',
              'text-[11px]',
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

// Stat card component
function StatCard({
  value, label, color, bg, suffix,
}: {
  value: number; label: string; color: string; bg: string; suffix?: string;
}) {
  return (
    <div className={cn('rounded-2xl p-3 border flex flex-col items-center text-center', bg)}>
      <span className={cn('font-black text-xl leading-none mb-0.5', color)}>
        {value}
        {suffix && <span className="text-xs ml-0.5">{suffix}</span>}
      </span>
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
    </div>
  );
}