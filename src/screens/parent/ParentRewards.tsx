import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Trash2, Pencil, Loader2, X, BookOpen, Calculator, PenTool, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SUBJECT_OPTIONS = [
  { value: 'reading' as const, label: 'Lezen', icon: BookOpen, color: 'text-violet-600 bg-violet-50' },
  { value: 'math' as const, label: 'Rekenen', icon: Calculator, color: 'text-blue-600 bg-blue-50' },
  { value: 'writing' as const, label: 'Schrijven', icon: PenTool, color: 'text-orange-600 bg-orange-50' },
];

export function ParentRewards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: children = [] } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name')
        .eq('parent_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['parent-rewards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*, child:children(name)')
        .eq('parent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rewards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-rewards'] });
      toast.success('Beloning verwijderd.');
    },
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Beloningen</h2>
          <p className="text-sm text-slate-500 font-medium">Motiveer je kinderen met beloningen</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          disabled={children.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe beloning
        </button>
      </div>

      {children.length === 0 && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-medium">
          Voeg eerst een kind toe voordat je beloningen kunt aanmaken.
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <RewardForm
            children={children}
            parentId={user!.id}
            existing={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['parent-rewards'] });
              setShowForm(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!isLoading && rewards.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎁</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Nog geen beloningen</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Maak een beloning aan om je kind extra te motiveren bij het leren.
          </p>
        </div>
      )}

      {/* Rewards List */}
      <div className="space-y-3">
        {rewards.map((reward, i) => {
          const subCfg = SUBJECT_OPTIONS.find((s) => s.value === reward.subject);
          const pct = Math.min(Math.round((reward.current_progress / reward.required_exercises) * 100), 100);
          const childName = Array.isArray(reward.child) ? reward.child[0]?.name : (reward.child as any)?.name;
          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-white rounded-2xl p-5 border ${
                reward.is_completed ? 'border-teal-200 bg-teal-50/50' : 'border-slate-200'
              } shadow-sm`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subCfg?.color ?? 'bg-slate-100 text-slate-500'}`}>
                    {reward.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-500" />
                    ) : subCfg ? (
                      <subCfg.icon className="w-5 h-5" />
                    ) : (
                      <Gift className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{reward.title}</h4>
                    <p className="text-xs text-slate-500">
                      {childName} · {subCfg?.label ?? reward.subject} · {reward.required_exercises} oefeningen
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(reward); setShowForm(true); }}
                    className="p-2 hover:bg-blue-50 rounded-xl transition-colors text-slate-400 hover:text-blue-500"
                    aria-label="Bewerken"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(reward.id)}
                    className="p-2 hover:bg-red-50 rounded-xl transition-colors text-slate-400 hover:text-red-500"
                    aria-label="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>{reward.current_progress} / {reward.required_exercises} oefeningen</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${reward.is_completed ? 'bg-teal-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beloning verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze beloning wilt verwijderen? Dit kan niet ongedaan gemaakt worden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Reward Creation / Edit Form ───────────────────── */
function RewardForm({
  children,
  parentId,
  existing,
  onClose,
  onSuccess,
}: {
  children: { id: string; name: string }[];
  parentId: string;
  existing?: { id: string; title: string; subject: 'math' | 'reading' | 'writing'; required_exercises: number; child_id: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [subject, setSubject] = useState<'math' | 'reading' | 'writing'>(existing?.subject ?? 'math');
  const [requiredExercises, setRequiredExercises] = useState(existing?.required_exercises ?? 5);
  const [childId, setChildId] = useState(existing?.child_id ?? children[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !childId) return;
    if (requiredExercises < 1 || requiredExercises > 100) {
      toast.error('Aantal oefeningen moet tussen 1 en 100 zijn.');
      return;
    }
    setSaving(true);
    try {
      if (existing?.id) {
        const { error } = await supabase
          .from('rewards')
          .update({ title: title.trim(), subject, required_exercises: requiredExercises, child_id: childId })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Beloning bijgewerkt!');
      } else {
        const { error } = await supabase.from('rewards').insert({
          parent_id: parentId,
          child_id: childId,
          title: title.trim(),
          subject,
          required_exercises: requiredExercises,
        });
        if (error) throw error;
        toast.success('Beloning aangemaakt!');
      }
      onSuccess();
    } catch {
      toast.error('Er ging iets mis.');
    } finally {
      setSaving(false);
    }
  };
  onSuccess,
}: {
  children: { id: string; name: string }[];
  parentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<'math' | 'reading' | 'writing'>('math');
  const [requiredExercises, setRequiredExercises] = useState(5);
  const [childId, setChildId] = useState(children[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !childId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('rewards').insert({
        parent_id: parentId,
        child_id: childId,
        title: title.trim(),
        subject,
        required_exercises: requiredExercises,
      });
      if (error) throw error;
      toast.success('Beloning aangemaakt!');
      onSuccess();
    } catch {
      toast.error('Er ging iets mis.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900">Nieuwe beloning</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Child Select */}
          {children.length > 1 && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Kind</label>
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Een extra half uurtje schermtijd"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Onderdeel</label>
            <div className="flex gap-2">
              {SUBJECT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSubject(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      subject === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of exercises */}
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">
              Aantal oefeningen
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={requiredExercises}
              onChange={(e) => setRequiredExercises(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!title.trim() || !childId || saving}
            className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? 'Opslaan...' : 'Beloning opslaan'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
