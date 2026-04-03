import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, ChevronLeft, Target, BookOpen, 
  Calculator, Clock, Zap, Trophy, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { useChildProgress } from '@/hooks/useChildProgress';
import { BentoTable } from '@/components/ui/bento-table';
import { TableSection } from '@/components/ui/table-section';

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Rekenen',
  reading: 'Lezen',
  writing: 'Schrijven',
};

const SUBJECT_ICONS: Record<string, string> = {
  math: '🔢',
  reading: '📖',
  writing: '✏️',
};

const SUBJECT_COLORS: Record<string, { bg: string; accent: string }> = {
  math: { bg: 'bg-emerald-50', accent: 'text-emerald-600' },
  reading: { bg: 'bg-blue-50', accent: 'text-blue-600' },
  writing: { bg: 'bg-purple-50', accent: 'text-purple-600' },
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}u ${remainMins}m`;
}

function getScoreLevel(score: number): string {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Gevorderd';
  if (score >= 50) return 'Gemiddeld';
  return 'Basis';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Vandaag';
  if (diffDays === 1) return 'Gisteren';
  return `${diffDays} dagen`;
}

export function Progress() {
  const navigate = useNavigate();
  const { selectedAvatar } = useGame();
  const { isLoading, progressData, recentAttempts, child } = useChildProgress();

  const hasProgress = progressData.length > 0;
  const hasAttempts = recentAttempts.length > 0;

  return (
    <div className="h-full w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-y-auto pb-32 flex flex-col pt-12">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-16 mb-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/app/dashboard')}
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

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        )}

        {!isLoading && !hasProgress && !hasAttempts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BentoTable>
              <div className="px-8 py-16 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Nog geen voortgang</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Begin met oefeningen om je statistieken hier te zien! Ga naar de kaart om je eerste oefening te starten.
                </p>
                <button
                  onClick={() => navigate('/app/map')}
                  className="mt-6 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold transition-colors"
                >
                  Naar de kaart →
                </button>
              </div>
            </BentoTable>
          </motion.div>
        )}

        {/* Skills Overview Table */}
        {!isLoading && hasProgress && (
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
                    </tr>
                  </thead>
                  <tbody>
                    {progressData.map((row, index) => {
                      const score = Math.round(row.average_score ?? 0);
                      const colors = SUBJECT_COLORS[row.subject] ?? { bg: 'bg-slate-50', accent: 'text-slate-600' };
                      return (
                        <motion.tr 
                          key={row.subject}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center text-2xl font-black shadow-sm group-hover:scale-110 transition-transform`}>
                                {SUBJECT_ICONS[row.subject] ?? '📚'}
                              </div>
                              <span className="font-bold text-slate-800">{SUBJECT_LABELS[row.subject] ?? row.subject}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center hidden md:table-cell">
                            <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${colors.accent} ${colors.bg}`}>
                              {getScoreLevel(score)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-2xl font-black text-slate-800">{score}%</span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className={`h-full ${score >= 90 ? 'bg-emerald-500' : score >= 75 ? 'bg-blue-500' : 'bg-orange-500'} rounded-full`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center hidden sm:table-cell">
                            <div className="flex items-center justify-center gap-2">
                              <Calculator className="w-4 h-4 text-slate-400" />
                              <span className="font-bold text-slate-700">{row.exercises_completed}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center hidden lg:table-cell">
                            <div className="flex items-center justify-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-600">{formatTime(row.total_time_seconds)}</span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </BentoTable>
          </motion.div>
        )}

        {/* Recent Activity */}
        {!isLoading && hasAttempts && (
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
                    {recentAttempts.map((attempt) => {
                      const pct = attempt.max_score > 0 ? Math.round((attempt.score / attempt.max_score) * 100) : 0;
                      const exerciseData = Array.isArray(attempt.exercise) ? attempt.exercise[0] : attempt.exercise;
                      return (
                        <tr 
                          key={attempt.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-800 text-sm">
                                {exerciseData?.title ?? 'Oefening'}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-semibold">{formatDate(attempt.completed_at)}</span>
                                <span>&#x2022;</span>
                                <span>{SUBJECT_LABELS[exerciseData?.subject ?? ''] ?? exerciseData?.subject}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center hidden sm:table-cell">
                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
                              pct >= 90 ? 'bg-emerald-100 text-emerald-600' : 
                              pct >= 75 ? 'bg-blue-100 text-blue-600' : 
                              'bg-orange-100 text-orange-600'
                            }`}>
                              <span className="text-lg font-black">{pct}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100">
                              <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                              <span className="text-sm font-black text-amber-700">+{exerciseData?.xp_reward ?? 0}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </BentoTable>
          </motion.div>
        )}

        {/* Leaderboard placeholder — will be real once multiplayer is added */}
        {!isLoading && (
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
              <div className="px-8 py-12 text-center">
                <div className="text-5xl mb-3">🏆</div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Binnenkort beschikbaar</h3>
                <p className="text-sm text-slate-500">Het klassement wordt binnenkort geactiveerd!</p>
              </div>
            </BentoTable>
          </motion.div>
        )}
      </div>
    </div>
  );
}
