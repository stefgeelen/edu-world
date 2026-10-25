import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, GraduationCap, Calculator, BookOpen, PenTool,
  ArrowUp, ArrowDown, Loader2, Clock, Target, CheckCircle2, AlertTriangle, Lock, Unlock, Heart, Triangle, Pencil,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { mapDbError } from '@/lib/errorMessages';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useChildInsights, type ChildInsight } from '@/hooks/useChildInsights';
import { MAX_SUPPORTED_GRADE } from '@/data/difficultyConfig';
import { GRADE_LABELS } from '@/lib/gradeFromAge';
import { useKindergarten } from '@/hooks/useKindergarten';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimesTablesCard } from '@/components/parent/TimesTablesCard';
import { ReadingThemeCard } from '@/components/parent/ReadingThemeCard';
import { TimesTablesAccessCard } from '@/components/parent/TimesTablesAccessCard';

const SUBJECT_CONFIG: Record<string, { label: string; icon: typeof Calculator; color: string; bg: string }> = {
  math: { label: 'Rekenen', icon: Calculator, color: 'text-blue-600', bg: 'bg-blue-50' },
  reading: { label: 'Lezen', icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
  writing: { label: 'Schrijven', icon: PenTool, color: 'text-orange-600', bg: 'bg-orange-50' },
  geometry: { label: 'Meetkunde', icon: Triangle, color: 'text-pink-600', bg: 'bg-pink-50' },
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}u ${mins % 60}m`;
}

function struggleColor(share: number) {
  if (share >= 0.75) return { text: 'text-red-600', bg: 'bg-red-50' };
  return { text: 'text-orange-600', bg: 'bg-orange-50' };
}

/** "3× met 1 hartje · 1× alle hartjes kwijt", leaving out the zeros. */
function struggleBreakdown(insight: ChildInsight): string {
  return [
    insight.hard > 0 && `${insight.hard}× met 1 hartje`,
    insight.gameOver > 0 && `${insight.gameOver}× alle hartjes kwijt`,
    insight.abandoned > 0 && `${insight.abandoned}× zelf gestopt`,
  ]
    .filter(Boolean)
    .join(' · ');
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
  // The 3de kleuterklas (grade 0) sits below the 1ste leerjaar, while it is open to this parent.
  const { open: kindergartenOpen } = useKindergarten();
  const minGrade = kindergartenOpen ? 0 : 1;
  // Two tabs: how the child is doing, and what it practises. Kept in the URL
  // so going back returns to the same tab.
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'leerstof' ? 'leerstof' : 'inzicht';

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
        .select('subject, exercises_completed, average_score, total_time_seconds')
        .eq('child_id', childId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!childId,
  });

  const { data: week } = useQuery({
    queryKey: ['parent-child-week', childId],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('exercise_attempts')
        .select('time_spent_seconds')
        .eq('child_id', childId!)
        .gte('completed_at', since);
      if (error) throw error;
      return {
        exercises: data?.length ?? 0,
        seconds: (data ?? []).reduce((sum, a) => sum + (a.time_spent_seconds ?? 0), 0),
      };
    },
    enabled: !!childId,
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
      // A newly opened trimester changes which exercises the child can pick.
      queryClient.invalidateQueries({ queryKey: ['practice-menu', childId] });
      toast.success(`${child?.name} heeft nu toegang tot trimester 1${maxStage > 1 ? ` t/m ${maxStage}` : ''}.`);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const promoteMutation = useMutation({
    mutationFn: async (newGrade: number) => {
      // max_unlocked_stage is a single override column, not scoped per grade —
      // reset it on any grade change so trimester access starts fresh instead
      // of carrying over whatever was unlocked in the previous grade. The same
      // for the reading theme the parent picked: back to the calendar.
      const { error } = await supabase
        .from('children')
        .update({ grade: newGrade, max_unlocked_stage: 1, reading_theme: null, extra_times_tables: [], extra_division_tables: [] })
        .eq('id', childId!)
        .eq('parent_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, newGrade) => {
      queryClient.invalidateQueries({ queryKey: ['parent-child', childId] });
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      // The child's own screens read the grade too: their exercise list, and
      // the Buddy, which grows into the new grade's form.
      queryClient.invalidateQueries({ queryKey: ['my-child'] });
      queryClient.invalidateQueries({ queryKey: ['practice-menu', childId] });
      queryClient.invalidateQueries({ queryKey: ['buddy-state', childId] });
      queryClient.invalidateQueries({ queryKey: ['reading-theme', childId] });
      queryClient.invalidateQueries({ queryKey: ['times-table-access', childId] });
      toast.success(`${child?.name} is nu in ${GRADE_LABELS[newGrade] ?? `groep ${newGrade}`}!`);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  // Fixing a typo in the child's name. Null while the dialog is closed.
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('children')
        .update({ name })
        .eq('id', childId!)
        .eq('parent_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['parent-child', childId] });
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      // The child's own screens greet it by name, and so does "Wie speelt er?".
      queryClient.invalidateQueries({ queryKey: ['my-child'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setNameDraft(null);
      toast.success(`De naam is aangepast naar ${name}.`);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const trimmedName = nameDraft?.trim() ?? '';
  const canSaveName = trimmedName.length > 0 && trimmedName !== child?.name && !renameMutation.isPending;

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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-2xl font-black text-slate-900 truncate">{child.name}</h2>
            <button
              onClick={() => setNameDraft(child.name)}
              aria-label="Naam wijzigen"
              title="Naam wijzigen"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
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

      <Tabs value={tab} onValueChange={(v) => setParams(v === 'leerstof' ? { tab: 'leerstof' } : {}, { replace: true })}>
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="inzicht" className="rounded-xl py-2.5 font-bold">Hoe gaat het?</TabsTrigger>
          <TabsTrigger value="leerstof" className="rounded-xl py-2.5 font-bold">Leerstof</TabsTrigger>
        </TabsList>

        {/* How the child is doing */}
        <TabsContent value="inzicht" className="mt-6 space-y-6">
          {/* Aandachtspunten */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900">Aandachtspunten</h3>
                <p className="text-xs text-slate-400 mt-0.5">Oefeningen die de laatste tijd vaak moeizaam gaan</p>
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
                <p className="text-xs text-slate-400">Geen oefeningen waar je kind de laatste tijd moeite mee heeft.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {insights.slice(0, 5).map((insight) => {
                  const cfg = SUBJECT_CONFIG[insight.subject];
                  const Icon = cfg?.icon;
                  const colors = struggleColor(insight.struggleShare);
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
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {insight.struggles} van de laatste {insight.tries} keer moeizaam: {struggleBreakdown(insight)}
                        </p>
                      </div>
                      <div className={`text-right flex-shrink-0 px-2.5 py-1 rounded-xl ${colors.bg}`}>
                        <p className={`text-lg font-black ${colors.text}`}>
                          {insight.struggles}/{insight.tries}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* The last 7 days */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">De laatste 7 dagen</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <Target className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-black text-slate-900">{week?.exercises ?? 0}</p>
                <p className="text-xs font-bold text-slate-400">Oefeningen</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <Clock className="w-5 h-5 text-teal-500 mx-auto mb-1" />
                <p className="text-2xl font-black text-slate-900">{formatTime(week?.seconds ?? 0)}</p>
                <p className="text-xs font-bold text-slate-400">Leertijd</p>
              </div>
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
                        <p className="text-xs font-bold text-slate-400">gemiddeld</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <TimesTablesCard childId={child.id} grade={child.grade} />
        </TabsContent>

        {/* What the child practises */}
        <TabsContent value="leerstof" className="mt-6 space-y-6">
          {/* Grade */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Leerjaar</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                {child.name} oefent de leerstof van {GRADE_LABELS[child.grade] ?? `groep ${child.grade}`}. Zet het
                leerjaar mee als je kind overgaat naar een volgend leerjaar.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { if (child.grade > minGrade) setPendingGrade(child.grade - 1); }}
                  disabled={child.grade <= minGrade || promoteMutation.isPending}
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

          <ReadingThemeCard childId={child.id} childName={child.name} grade={child.grade} />

          <TimesTablesAccessCard childId={child.id} childName={child.name} grade={child.grade} />

          {/* Trimester Access Control */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                {child.grade === 1 ? 'Trimester (rekenen, schrijven en de rest)' : 'Trimester'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Een trimester gaat vanzelf open als {child.name} alle oefeningen van het vorige minstens 5 keer
                maakte. Wil je sneller? Zet het hier zelf open.
              </p>
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

        </TabsContent>
      </Tabs>

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

      <Dialog open={nameDraft !== null} onOpenChange={(o) => !o && setNameDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSaveName) renameMutation.mutate(trimmedName);
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Naam wijzigen</DialogTitle>
              <DialogDescription>Een schrijffout gemaakt? Pas de naam hier aan.</DialogDescription>
            </DialogHeader>
            <input
              type="text"
              aria-label="Naam"
              value={nameDraft ?? ''}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setNameDraft(null)}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={!canSaveName}
                className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors sm:ml-2"
              >
                {renameMutation.isPending ? 'Opslaan...' : 'Opslaan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
