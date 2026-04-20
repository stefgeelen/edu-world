import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ChevronLeft, GraduationCap, Zap, Flame, Calculator, BookOpen, PenTool,
  ArrowUp, ArrowDown, Loader2, Clock, Target, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const GRADE_LABELS: Record<number, string> = {
  1: '1ste leerjaar', 2: '2de leerjaar', 3: '3de leerjaar',
  4: '4de leerjaar', 5: '5de leerjaar', 6: '6de leerjaar',
};

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

  const promoteMutation = useMutation({
    mutationFn: async (newGrade: number) => {
      const { error } = await supabase
        .from('children')
        .update({ grade: newGrade, pending_promotion: false })
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
    onError: () => toast.error('Er ging iets mis.'),
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

      {/* Trimester Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Trimesters - {GRADE_LABELS[child.grade]}</h3>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((num) => {
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
                  {child.name} heeft alle trimesters afgerond en is klaar voor het volgende leerjaar.
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
              onClick={() => { if (child.grade < 6) setPendingGrade(child.grade + 1); }}
              disabled={child.grade >= 6 || promoteMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ArrowUp className="w-4 h-4" />
              Volgend leerjaar
            </button>
          </div>
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
    </div>
  );
}
