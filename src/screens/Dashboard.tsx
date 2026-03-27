import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Star, Trophy, Target, Award, Hexagon, Medal, Zap, LayoutGrid, TrendingUp, ChevronRight, Check } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const navigate = useNavigate();
  const { selectedAvatar, xp, streak, level } = useGame();

  const xpRequired = level * 1000;
  const progress = (xp / xpRequired) * 100;

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto pb-32 flex flex-col pt-12">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-16 flex justify-between items-center mb-8 max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl shadow-sm overflow-hidden bg-white border border-slate-200">
            {selectedAvatar ? (
              <img src={selectedAvatar.imageUrl} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <div className="w-full h-full bg-slate-100 animate-pulse" />
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Hoi, {selectedAvatar?.name || 'Vriend'}!</h2>
            <p className="text-base text-slate-500 font-medium">Klaar voor een avontuur?</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm"
        >
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
          <span className="text-orange-700 font-bold text-lg">{streak}</span>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Left Column */}
          <div className="space-y-6 flex flex-col">
            
            {/* XP Progress Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60"
            >
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Huidig Niveau</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 leading-none">{level}</h3>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end justify-end">
                  <span className="text-2xl md:text-3xl font-bold text-blue-600 leading-none mb-1">{xp}</span>
                  <span className="text-sm font-semibold text-slate-500">van {xpRequired} XP</span>
                </div>
              </div>
              
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.5, type: 'spring' }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </motion.div>

            {/* Primary CTA: Start Button */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <button 
                onClick={() => navigate('/map')}
                className="w-full p-6 bg-teal-500 hover:bg-teal-600 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group outline-none focus-visible:ring-4 ring-teal-500/30 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-4 rounded-2xl">
                    <Zap className="w-8 h-8 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <span className="block text-2xl font-bold text-white mb-1">Start met Leren</span>
                    <span className="block text-sm font-semibold text-teal-50">Ga verder met Groep {level}</span>
                  </div>
                </div>
                <div className="bg-white text-teal-600 p-3 rounded-full shadow-sm group-hover:translate-x-1 transition-transform">
                  <ChevronRight className="w-6 h-6" strokeWidth={3} />
                </div>
              </button>
            </motion.div>

            {/* Progress Stats Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={() => navigate('/progress')}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Statistieken</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors group-hover:translate-x-1" strokeWidth={2.5} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-white mb-1">92%</span>
                  <span className="text-xs font-semibold text-indigo-200 tracking-wide uppercase">Score</span>
                </div>
                <div className="flex flex-col items-center border-x border-indigo-500/50">
                  <span className="text-3xl font-bold text-white mb-1">45</span>
                  <span className="text-xs font-semibold text-indigo-200 tracking-wide uppercase">Lessen</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-white mb-1">3u</span>
                  <span className="text-xs font-semibold text-indigo-200 tracking-wide uppercase">Tijd</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 flex flex-col">
            
            {/* Badge Collection */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  Recente Badges
                </h3>
                <button 
                  onClick={() => navigate('/badges')}
                  className="text-blue-600 text-sm font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                >
                  Bekijk Alles
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: Star, color: 'bg-amber-50 text-amber-500 border-amber-200' },
                  { icon: Medal, color: 'bg-purple-50 text-purple-600 border-purple-200' },
                  { icon: Award, color: 'bg-blue-50 text-blue-600 border-blue-200' },
                  { icon: Hexagon, color: 'bg-slate-50 text-slate-400 border-slate-200', locked: true },
                ].map((badge, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "aspect-square rounded-2xl flex items-center justify-center relative transition-transform hover:-translate-y-1 cursor-pointer",
                      badge.color,
                      badge.locked ? "border border-dashed" : "border"
                    )}
                  >
                    {badge.locked && (
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-slate-50/50">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <badge.icon className={cn("w-8 h-8", !badge.locked && 'fill-current')} strokeWidth={badge.locked ? 1.5 : 2} />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Daily Tasks */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <LayoutGrid className="w-6 h-6 text-indigo-500" />
                  Dagelijkse Taken
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg tracking-wide">
                  2/3 KLAAR
                </span>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'Rond 1 Rekenles af', xp: '+50 XP', done: true },
                  { title: 'Behoud een reeks van 5 dagen', xp: '+100 XP', done: true },
                  { title: 'Lees een nieuw verhalenboek', xp: '+150 XP', done: false },
                ].map((task, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer hover:bg-slate-50",
                      task.done ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0",
                        task.done ? "bg-teal-500" : "border-2 border-slate-300"
                      )}>
                        {task.done && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                      </div>
                      <span className={cn(
                        "font-semibold text-base",
                        task.done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-800"
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <span className={cn(
                      "font-bold text-sm whitespace-nowrap",
                      task.done ? "text-slate-400" : "text-blue-600"
                    )}>
                      {task.xp}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
