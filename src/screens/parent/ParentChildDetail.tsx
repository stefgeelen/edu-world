import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ChevronLeft, GraduationCap, Zap, Flame, Calculator, BookOpen, PenTool,
  ArrowUp, ArrowDown, Loader2, Clock, Target, CheckCircle2, AlertTriangle, Lock, Unlock, Heart,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { mapDbError } from '@/lib/errorMessages';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useChildInsights } from '@/hooks/useChildInsights';
import { MAX_SUPPORTED_GRADE } from '@/data/difficultyConfig';
import { GRADE_LABELS } from '@/lib/gradeFromAge';

const SUBJECT_CONFIG: Record<string, { label: string; icon: typeof Calculator; color: string; bg: string }> = {
  math: { label: 'Rekenen', icon: Calculator, color: 'text-blue-600', bg: 'bg-blue-50' },
  reading: { label: 'Lezen', icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
  writing: { label: 'Schrijven', icon: PenTool, color: 'text-orange-600', bg: 'bg-orange-50' },
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}u ${mins % 60}m`;
}

function scoreColor(pct: number) {
  if (pct < 0.4) return { text: 'text-red-600', bg: 'bg-red-50' };
  return { text: 'text-orange-600', bg: 'bg-orange-50' };
}

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    'stage-1': 'Trimester 1',
    'stage-2': 'Trimester 2',
    'stage-3': 'Trimester 3',
  };
  return map[stage] ?? stage;
}

export function ParentChildDetail() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingGrade, setPendingGrade] = useState<number | null>(null);

  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: ['parent-child', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId!)
        .eq('parent_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!childId && !!user,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['parent-child-progress', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('subject, exercises_completed, total_xp, average_score, total_time_seconds')
        .eq('child_id', childId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!childId,
  });

  const { data: trimesters = [] } = useQuery({
    queryKey: ['parent-child-trimesters', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trimester_progress')
        .select('*')
        .eq('child_id', childId!)
        .eq('grade_level', child?.grade ?? 1)
        .order('trimester_number');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!childId && !!child,
  });

  const { data: insights = [], isLoading: insightsLoading } = useChildInsights(childId);

  const { data: buddyState } = useQuery({
    queryKey: ['parent-buddy-state', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buddy_states')
        .select('dead')
        .eq('child_id', childId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!childId,
  });

  const [reviveConfirmOpen, setReviveConfirmOpen] = useState(false);

  const reviveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('buddy_revive', { p_child_id: childId! });
      if (error) throw error;
      return data as unknown as { ok: boolean; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parent-buddy-state', childId] });
      queryClient.invalidateQueries({ queryKey: ['buddy-state', childId] });
      if (data.ok) toast.success(data.message);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const stageMutation = useMutation({
    mutationFn: async (maxStage: number) => {
      const { error } = await supabase
        .from('children')
        .update({ max_unlocked_stage: maxStage })
        .eq('id', childId!)
        .eq('parent_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, maxStage) => {
      queryClient.invalidateQueries({ queryKey: ['parent-child', childId] });
      queryClient.invalidateQueries({ queryKey: ['my-child'] });
      toast.success(`${child?.name} heeft nu toegang tot trimester 1${maxStage > 1 ? ` t/m ${maxStage}` : ''}.`);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const promoteMutation = useMutation({
    mutationFn: async (newGrade: number) => {
      // max_unlocked_stage is a single override column, not scoped per grade —
      // reset it on any grade change so trimester access starts fresh instead
      // of carrying over whatever was unlocked in the previous grade.
      const { error } = await supabase
        .from('children')
        .update({ grade: newGrade, pending_promotion: false, max_unlocked_stage: 1 })
        .eq('id', childId!)
        .eq('parent_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, newGrade) => {
      queryClient.invalidateQueries({ queryKey: ['parent-child', childId] });
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      queryClient.invalidateQueries({ queryKey: ['parent-child-trimesters', childId] });
      toast.success(`${child?.name} is nu in ${GRADE_LABELS[newGrade] ?? `groep ${newGrade}`}!`);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  if (childLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Kind niet gevonden.</p>
      </div>
    );
  }

  const totalExercises = progress.reduce((s, p) => s + p.exercises_completed, 0);
  const totalTime = progress.reduce((s, p) => s + p.total_time_seconds, 0);

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full space-y-6 pb-20">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/parent')}
          className="p-2.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-900">{child.name}</h2>
          <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" />
            {GRADE_LABELS[child.grade] ?? `Groep ${child.grade}`}
          </p>
        </div>
      </div>

      {buddyState?.dead && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <Heart className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-800">{child.name}'s Buddy is helaas overleden</p>
            <p className="text-sm text-rose-700">Dit gebeurt na te lange verwaarlozing. Jij kan de Buddy nieuw leven geven.</p>
          </div>
          <button
            onClick={() => setReviveConfirmOpen(true)}
            disabled={reviveMutation.isPending}
            className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            Nieuw leven geven
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 text-center">
          <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-slate-900">{child.xp}</p>
          <p className="text-xs font-bold text-slate-400">Totaal XP</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 text-center">
          <Target className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-slate-900">{totalExercises}</p>
          <p className="text-xs font-bold text-slate-400">Oefeningen</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 text-center">
          <Clock className="w-5 h-5 text-teal-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-slate-900">{formatTime(totalTime)}</p>
          <p className="text-xs font-bold text-slate-400">Leertijd</p>
        </div>
      </div>

      {/* Per Subject Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Voortgang per vak</h3>
        </div>
        {progress.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">Nog geen oefeningen ingevuld.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {progress.map((p) => {
              const cfg = SUBJECT_CONFIG[p.subject];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const score = Math.round((p.average_score ?? 0) * 100);
              return (
                <div key={p.subject} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">{cfg.label}</p>
                    <p className="text-xs text-slate-500">
                      {p.exercises_completed} oefeningen · {formatTime(p.total_time_seconds)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">{score}%</p>
                    <p className="text-xs font-bold text-slate-400">{p.total_xp} XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aandachtspunten */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-slate-900">Aandachtspunten</h3>
            <p className="text-xs text-slate-400 mt-0.5">Oefeningen die extra aandacht verdienen</p>
          </div>
        </div>

        {insightsLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                </div>
                <div className="h-6 w-12 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-teal-500" />
            <p className="font-bold text-slate-700 text-sm">Alles gaat goed!</p>
            <p className="text-xs text-slate-400">Geen oefeningen met aanhoudende moeite gevonden.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {insights.slice(0, 5).map((insight) => {
              const cfg = SUBJECT_CONFIG[insight.subject];
              const Icon = cfg?.icon;
              const colors = scoreColor(insight.avgScorePct);
              return (
                <div key={insight.exerciseId} className="px-5 py-4 flex items-center gap-4">
                  {cfg && Icon ? (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{insight.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {cfg && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{stageLabel(insight.stage)}</span>
                      <span className="text-xs text-slate-400">{insight.attemptCount}× geprobeerd</span>
                    </div>
                  </div>
                  <div className={`text-right flex-shrink-0 px-2.5 py-1 rounded-xl ${colors.bg}`}>
                    <p className={`text-lg font-black ${colors.text}`}>{Math.round(insight.avgScorePct * 100)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trimester Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Trimesters - {GRADE_LABELS[child.grade]}</h3>
        </div>
        <div className="p-5 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((num) => {
            const t = trimesters.find((tr) => tr.trimester_number === num);
            const pct = t ? Math.min(Math.round((t.xp_earned / t.xp_threshold) * 100), 100) : 0;
            const completed = t?.is_completed ?? false;
            return (
              <div
                key={num}
                className={`rounded-2xl p-4 border text-center ${
                  completed ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {completed && <CheckCircle2 className="w-5 h-5 text-teal-500 mx-auto mb-1" />}
                <p className="font-black text-sm text-slate-700 mb-1">Trimester {num}</p>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full ${completed ? 'bg-teal-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-slate-400">
                  {t ? `${t.xp_earned}/${t.xp_threshold} XP` : '0/100 XP'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trimester Access Control */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Trimester toegang</h3>
          <p className="text-xs text-slate-500 mt-0.5">Kies tot welk trimester {child.name} toegang heeft.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((num) => {
              const isUnlocked = num <= (child.max_unlocked_stage ?? 1);
              return (
                <button
                  key={num}
                  onClick={() => stageMutation.mutate(num)}
                  disabled={stageMutation.isPending}
                  className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    isUnlocked
                      ? 'bg-teal-50 border-teal-400 text-teal-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {isUnlocked ? (
                    <Unlock className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  <span>Trimester {num}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grade Promotion / Demotion */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Leerjaar beheren</h3>
        </div>
        <div className="p-5 space-y-4">
          {child.pending_promotion && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm">Alle trimesters voltooid!</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {child.grade < MAX_SUPPORTED_GRADE
                    ? `${child.name} heeft alle trimesters afgerond en is klaar voor het volgende leerjaar.`
                    : `${child.name} heeft alle trimesters afgerond! Het volgende leerjaar is nog in ontwikkeling — je kind kan de trimesters blijven herhalen voor extra oefening.`}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { if (child.grade > 1) setPendingGrade(child.grade - 1); }}
              disabled={child.grade <= 1 || promoteMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDown className="w-4 h-4" />
              Vorig leerjaar
            </button>
            <button
              onClick={() => { if (child.grade < MAX_SUPPORTED_GRADE) setPendingGrade(child.grade + 1); }}
              disabled={child.grade >= MAX_SUPPORTED_GRADE || promoteMutation.isPending}
              title={child.grade >= MAX_SUPPORTED_GRADE ? 'Nog niet beschikbaar — dit leerjaar is nog in ontwikkeling' : undefined}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ArrowUp className="w-4 h-4" />
              Volgend leerjaar
            </button>
          </div>
          {child.grade >= MAX_SUPPORTED_GRADE && (
            <p className="text-xs text-slate-400 text-center -mt-1">
              Volgend leerjaar is nog in ontwikkeling en daarom nog niet beschikbaar.
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={pendingGrade !== null} onOpenChange={(o) => !o && setPendingGrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leerjaar wijzigen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingGrade !== null && child && (
                pendingGrade > child.grade
                  ? `${child.name} promoveren naar ${GRADE_LABELS[pendingGrade] ?? `groep ${pendingGrade}`}?`
                  : `${child.name} terugzetten naar ${GRADE_LABELS[pendingGrade] ?? `groep ${pendingGrade}`}?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingGrade !== null) promoteMutation.mutate(pendingGrade);
                setPendingGrade(null);
              }}
            >
              Bevestigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reviveConfirmOpen} onOpenChange={setReviveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buddy nieuw leven geven?</AlertDialogTitle>
            <AlertDialogDescription>
              De Buddy komt terug, maar begint met deels herstelde Needs — niet volledig vol. {child.name} zal er
              snel weer voor moeten zorgen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => reviveMutation.mutate()}>
              Ja, nieuw leven geven
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
