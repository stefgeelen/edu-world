import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Star, Trophy, ChevronRight, Check, LogOut, Shield, Users, Zap, Sparkles, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/context/GameContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { cn } from '@/lib/utils';
import { ChildRewards } from '@/components/ChildRewards';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

/* ── Decorative forest elements ─────────────────────── */
const FOREST_DECORATIONS = [
  { icon: '🌲', top: '8%', left: '5%', size: 'text-5xl', opacity: 'opacity-30' },
  { icon: '✨', top: '15%', left: '90%', size: 'text-2xl', opacity: 'opacity-50 animate-pulse' },
  { icon: '🍄', top: '45%', left: '92%', size: 'text-3xl', opacity: 'opacity-30' },
  { icon: '🌲', top: '70%', left: '3%', size: 'text-6xl', opacity: 'opacity-20' },
  { icon: '🦋', top: '55%', left: '8%', size: 'text-2xl', opacity: 'opacity-40' },
  { icon: '✨', top: '80%', left: '88%', size: 'text-xl', opacity: 'opacity-40 animate-pulse' },
  { icon: '🌺', top: '90%', left: '15%', size: 'text-3xl', opacity: 'opacity-25' },
  { icon: '🦉', top: '3%', left: '75%', size: 'text-3xl', opacity: 'opacity-30' },
];

/* ── Starry sky background ──────────────────────────── */
function StarryBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white opacity-20"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            animation: `pulse ${Math.random() * 2 + 2}s infinite ${Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Daily quest data ───────────────────────────────── */
const DAILY_QUESTS = [
  { title: 'Rond 1 Rekenles af', xp: '+50 XP', done: true },
  { title: 'Behoud een reeks van 5 dagen', xp: '+100 XP', done: true },
  { title: 'Lees een nieuw verhalenboek', xp: '+150 XP', done: false },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { selectedAvatar, xp, streak, level } = useGame();
  const { isAdmin } = useAdminRole();

  const xpRequired = level * 1000;
  const progress = Math.min((xp / xpRequired) * 100, 100);
  const completedQuests = DAILY_QUESTS.filter(q => q.done).length;

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] overflow-y-auto pb-32 flex flex-col relative" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

      {/* Decorations */}
      {FOREST_DECORATIONS.map((el, i) => (
        <div key={i} className={`absolute pointer-events-none select-none ${el.size} ${el.opacity}`} style={{ top: el.top, left: el.left }}>
          {el.icon}
        </div>
      ))}

      {/* ── Header ──────────────────────────────────── */}
      <div className="relative z-10 px-5 pt-6 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          {/* Avatar + greeting */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-[3px] border-amber-400 overflow-hidden shadow-lg shadow-amber-400/20 bg-[#2d1b54] flex-shrink-0">
              {selectedAvatar ? (
                <ImageWithFallback src={selectedAvatar.imageUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#3b2d71] animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200">
                Hoi, {selectedAvatar?.name || 'Vriend'}!
              </h2>
              <p className="text-xs font-bold text-[#a78bfa] uppercase tracking-widest">Groep {level}</p>
            </div>
          </motion.div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#2d1b54]/80 backdrop-blur-sm px-3 py-1.5 rounded-full border-2 border-orange-500/40">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <span className="text-orange-300 font-black text-sm">{streak}</span>
            </div>
            {isAdmin && (
              <button onClick={() => navigate('/admin')} className="w-10 h-10 bg-[#2d1b54] rounded-full flex items-center justify-center border-b-[3px] border-[#1c1134] active:border-b-0 active:translate-y-0.5 transition-all" title="Admin">
                <Shield className="w-4 h-4 text-[#9d8bce]" />
              </button>
            )}
            <button onClick={() => navigate('/app/parent')} className="w-10 h-10 bg-[#2d1b54] rounded-full flex items-center justify-center border-b-[3px] border-[#1c1134] active:border-b-0 active:translate-y-0.5 transition-all" title="Ouderportaal">
              <Users className="w-4 h-4 text-[#9d8bce]" />
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }} className="w-10 h-10 bg-[#2d1b54] rounded-full flex items-center justify-center border-b-[3px] border-[#1c1134] active:border-b-0 active:translate-y-0.5 transition-all" title="Uitloggen">
              <LogOut className="w-4 h-4 text-[#9d8bce]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="relative z-10 px-5 max-w-2xl mx-auto w-full space-y-5 flex-1">

        {/* XP Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a103c]/80 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-[#3b2d71] shadow-xl"
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-black text-[#a78bfa] uppercase tracking-[0.2em] mb-1">Huidig Niveau</p>
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">{level}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-cyan-300">{xp}</span>
              <span className="text-xs font-bold text-[#7c6bae] ml-1">/ {xpRequired} XP</span>
            </div>
          </div>
          <div className="h-4 w-full bg-[#2d1b54] rounded-full overflow-hidden border-2 border-[#3b2d71]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.5, type: 'spring' }}
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.4)]"
            />
          </div>
        </motion.div>

        {/* Hero CTA: Start met Leren */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('/app/map')}
          className="w-full p-5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl flex items-center justify-between shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all group outline-none active:scale-[0.98] border-b-[5px] border-emerald-700 active:border-b-0 active:translate-y-1"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <div className="text-left">
              <span className="block text-xl font-black text-white">Start met Leren</span>
              <span className="block text-xs font-bold text-emerald-100">Ga verder met je quest! 🌟</span>
            </div>
          </div>
          <div className="bg-white/20 p-2.5 rounded-full group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        </motion.button>

        {/* Daily Quests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1a103c]/80 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-[#3b2d71] shadow-xl"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Dagelijkse Quests
            </h3>
            <span className="text-[10px] font-black text-[#a78bfa] bg-[#2d1b54] px-3 py-1 rounded-full uppercase tracking-widest border border-[#3b2d71]">
              {completedQuests}/{DAILY_QUESTS.length} klaar
            </span>
          </div>

          <div className="space-y-3">
            {DAILY_QUESTS.map((quest, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all",
                  quest.done
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-[#2d1b54]/60 border-[#3b2d71] hover:border-cyan-500/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                    quest.done ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "border-2 border-[#5b4d8a]"
                  )}>
                    {quest.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className={cn(
                    "font-bold text-sm",
                    quest.done ? "text-emerald-300/70 line-through decoration-emerald-500/30" : "text-white/90"
                  )}>
                    {quest.title}
                  </span>
                </div>
                <span className={cn(
                  "font-black text-xs whitespace-nowrap",
                  quest.done ? "text-emerald-400/50" : "text-cyan-300"
                )}>
                  {quest.xp}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Two-column: Badges + Stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => navigate('/app/badges')}
            className="bg-[#1a103c]/80 backdrop-blur-xl rounded-3xl p-4 border-[3px] border-[#3b2d71] shadow-xl cursor-pointer hover:border-amber-500/40 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-amber-200">Trofeeën</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: '⭐', bg: 'bg-amber-500/20 border-amber-500/30' },
                { icon: '🏅', bg: 'bg-purple-500/20 border-purple-500/30' },
                { icon: '🔒', bg: 'bg-[#2d1b54] border-[#3b2d71] opacity-50' },
              ].map((b, i) => (
                <div key={i} className={cn("aspect-square rounded-xl flex items-center justify-center text-lg border-2", b.bg)}>
                  {b.icon}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-[#7c6bae] mt-2 flex items-center gap-1">
              Bekijk alles <ChevronRight className="w-3 h-3" />
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => navigate('/app/progress')}
            className="bg-gradient-to-br from-indigo-600/80 to-purple-700/80 backdrop-blur-xl rounded-3xl p-4 border-[3px] border-indigo-400/30 shadow-xl cursor-pointer hover:border-indigo-400/50 transition-all active:scale-[0.98]"
          >
            <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-200" />
              Statistieken
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Score</span>
                <span className="text-lg font-black text-white">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Lessen</span>
                <span className="text-lg font-black text-white">45</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Tijd</span>
                <span className="text-lg font-black text-white">3u</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-indigo-300 mt-2 flex items-center gap-1">
              Bekijk alles <ChevronRight className="w-3 h-3" />
            </p>
          </motion.div>
        </div>

        {/* Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-[#1a103c]/80 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-[#3b2d71] shadow-xl"
        >
          <ChildRewards />
        </motion.div>
      </div>
    </div>
  );
}
