import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, ChevronLeft, Star, Trophy, Target, BookOpen, 
  Calculator, Clock, Award, Medal, Zap, ArrowUp, ArrowDown
} from 'lucide-react';
import { useGame } from '@/context/GameContext';

function BentoTable({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-3xl shadow-lg border-2 border-slate-100 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function TableSection({ title, icon: Icon, color }: { title: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className={`px-6 py-4 bg-gradient-to-r ${color} border-b-2 border-slate-100`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-slate-700" />
        </div>
        <h3 className="text-lg font-black text-slate-800">{title}</h3>
      </div>
    </div>
  );
}

export function Progress() {
  const navigate = useNavigate();
  const { selectedAvatar } = useGame();

  const skillsData = [
    { id: 1, name: 'Optellen',          icon: '+',  score: 92, trend: 'up',   exercises: 45, time: '3u 20m', level: 'Expert',    color: 'bg-emerald-50', accentColor: 'text-emerald-600' },
    { id: 2, name: 'Aftrekken',         icon: '-',  score: 85, trend: 'up',   exercises: 38, time: '2u 45m', level: 'Gevorderd', color: 'bg-blue-50',    accentColor: 'text-blue-600' },
    { id: 3, name: 'Vermenigvuldigen',  icon: 'x',  score: 78, trend: 'down', exercises: 32, time: '2u 10m', level: 'Gemiddeld', color: 'bg-purple-50',  accentColor: 'text-purple-600' },
    { id: 4, name: 'Delen',             icon: '/',  score: 71, trend: 'up',   exercises: 25, time: '1u 35m', level: 'Basis',     color: 'bg-orange-50',  accentColor: 'text-orange-600' },
  ];

  const recentActivities = [
    { date: 'Vandaag',   subject: 'Rekenen', topic: 'Groep 5 - Keer Kust',   score: 95,  xp: 50, time: '14:30' },
    { date: 'Vandaag',   subject: 'Spelling', topic: 'Woorden met -tion',     score: 88,  xp: 40, time: '10:15' },
    { date: 'Gisteren',  subject: 'Rekenen', topic: 'Groep 4 - Min Moeras',  score: 100, xp: 75, time: '16:20' },
    { date: 'Gisteren',  subject: 'Lezen',   topic: 'Begrijpend Lezen',      score: 82,  xp: 35, time: '11:00' },
    { date: '2 dagen',   subject: 'Rekenen', topic: 'Groep 5 - Keer Kust',   score: 91,  xp: 45, time: '15:10' },
  ];

  const changeForMe = -1;
  const leaderboardData = [
    { rank: 1, name: 'Emma',                            avatar: '👧', score: 2850, change: 0,         isYou: false },
    { rank: 2, name: 'Lucas',                           avatar: '👦', score: 2720, change: 1,         isYou: false },
    { rank: 3, name: selectedAvatar?.name || 'Jij',    avatar: '⭐', score: 2680, change: changeForMe, isYou: true  },
    { rank: 4, name: 'Sophie',                          avatar: '👧', score: 2520, change: 2,         isYou: false },
    { rank: 5, name: 'Noah',                            avatar: '👦', score: 2490, change: -2,        isYou: false },
  ];

  return (
    <div className="h-full w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-y-auto pb-32 flex flex-col pt-12">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-16 mb-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-12 h-12 md:w-14 md:h-14 bg-white hover:bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-slate-100 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-indigo-200 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-800 tracking-wide uppercase">Mijn Voortgang</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight mb-3">
            Overzicht &amp; Statistieken
          </h1>
          <p className="text-lg md:text-xl text-slate-600 font-medium">
            Bekijk je resultaten en verbeteringen
          </p>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Skills Overview Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BentoTable>
            <TableSection 
              title="Vaardigheden Overzicht" 
              icon={Target} 
              color="from-purple-50 to-indigo-50" 
            />
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Vaardigheid</span>
                    </th>
                    <th className="px-6 py-4 text-center hidden md:table-cell">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Niveau</span>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Score</span>
                    </th>
                    <th className="px-6 py-4 text-center hidden sm:table-cell">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Oefeningen</span>
                    </th>
                    <th className="px-6 py-4 text-center hidden lg:table-cell">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Tijd</span>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Trend</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {skillsData.map((skill, index) => (
                    <motion.tr 
                      key={skill.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 ${skill.color} rounded-xl flex items-center justify-center text-2xl font-black shadow-sm group-hover:scale-110 transition-transform`}>
                            {skill.icon}
                          </div>
                          <span className="font-bold text-slate-800">{skill.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden md:table-cell">
                        <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${skill.accentColor} ${skill.color}`}>
                          {skill.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-black text-slate-800">{skill.score}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full ${skill.score >= 90 ? 'bg-emerald-500' : skill.score >= 75 ? 'bg-blue-500' : 'bg-orange-500'} rounded-full`}
                              style={{ width: `${skill.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <Calculator className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-700">{skill.exercises}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-600">{skill.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${skill.trend === 'up' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {skill.trend === 'up' ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )}
                          <span className="text-xs font-bold">
                            {skill.trend === 'up' ? '+5%' : '-3%'}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoTable>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <BentoTable>
              <TableSection 
                title="Recente Activiteit" 
                icon={BookOpen} 
                color="from-teal-50 to-cyan-50" 
              />
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="px-4 py-3 text-left">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Activiteit</span>
                      </th>
                      <th className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Score</span>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">XP</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((activity, index) => (
                      <tr 
                        key={index}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-800 text-sm">{activity.topic}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold">{activity.date}</span>
                              <span>&#x2022;</span>
                              <span>{activity.time}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center hidden sm:table-cell">
                          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
                            activity.score >= 90 ? 'bg-emerald-100 text-emerald-600' : 
                            activity.score >= 75 ? 'bg-blue-100 text-blue-600' : 
                            'bg-orange-100 text-orange-600'
                          }`}>
                            <span className="text-lg font-black">{activity.score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100">
                            <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                            <span className="text-sm font-black text-amber-700">+{activity.xp}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BentoTable>
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <BentoTable>
              <TableSection 
                title="Klassement" 
                icon={Trophy} 
                color="from-amber-50 to-yellow-50" 
              />
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="px-4 py-3 text-center">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">#</span>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Speler</span>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Score</span>
                      </th>
                      <th className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Verandering</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((player) => (
                      <tr 
                        key={player.rank}
                        className={`border-b border-slate-100 last:border-0 transition-all ${
                          player.isYou 
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black ${
                            player.rank === 1 ? 'bg-amber-100 text-amber-600' :
                            player.rank === 2 ? 'bg-slate-200 text-slate-600' :
                            player.rank === 3 ? 'bg-orange-100 text-orange-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {player.rank <= 3 ? (
                              player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'
                            ) : (
                              player.rank
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl ${
                              player.isYou ? 'bg-gradient-to-br from-blue-200 to-purple-200' : 'bg-slate-100'
                            }`}>
                              {player.avatar}
                            </div>
                            <span className={`font-bold ${player.isYou ? 'text-blue-600' : 'text-slate-800'}`}>
                              {player.name}
                              {player.isYou && (
                                <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">JIJ</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-black text-slate-800">{player.score.toLocaleString()}</span>
                            <span className="text-xs font-medium text-slate-400">punten</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center hidden sm:table-cell">
                          {player.change === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-400 text-xs font-bold">-</span>
                          ) : (
                            <div className={`inline-flex items-center gap-1 ${
                              player.change > 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {player.change > 0 ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )}
                              <span className="text-sm font-bold">{Math.abs(player.change)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-100">
                <p className="text-center text-sm font-semibold text-slate-600">
                  Blijf oefenen om hoger te komen! 💪
                </p>
              </div>
            </BentoTable>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
