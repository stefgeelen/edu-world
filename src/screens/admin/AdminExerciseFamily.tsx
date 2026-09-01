import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<string, string> = {
  'stage-1': 'Trimester 1',
  'stage-2': 'Trimester 2',
  'stage-3': 'Trimester 3',
};

const GRADES = [1, 2, 3, 4, 5, 6];

function ConfigEditor({ exerciseId, initialConfig }: { exerciseId: string; initialConfig: unknown }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(() => JSON.stringify(initialConfig ?? {}, null, 2));

  const saveMutation = useMutation({
    mutationFn: async (config: Json) => {
      const { error } = await supabase.from('exercises').update({ config }).eq('id', exerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Config opgeslagen.');
      queryClient.invalidateQueries({ queryKey: ['admin-exercise-family'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-config'] });
    },
    onError: () => toast.error('Kon config niet opslaan.'),
  });

  const handleSave = () => {
    let parsed: Json;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast.error('Ongeldige JSON.');
      return;
    }
    saveMutation.mutate(parsed);
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-mono text-xs"
        spellCheck={false}
      />
      <button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
      >
        <Save className="w-3.5 h-3.5" />
        Opslaan
      </button>
    </div>
  );
}

export function AdminExerciseFamily() {
  const { familyKey } = useParams<{ familyKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routePrefix = decodeURIComponent(familyKey ?? '');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-exercise-family', routePrefix],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .like('route', `${routePrefix}/%`)
        .order('grade')
        .order('stage');
      if (error) throw error;
      return data;
    },
    enabled: !!routePrefix,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('exercises').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exercise-family', routePrefix] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['stage-exercises-progress'] });
      queryClient.invalidateQueries({ queryKey: ['stage-mastery'] });
    },
    onError: () => toast.error('Kon status niet bijwerken.'),
  });

  const toggleGradeMutation = useMutation({
    mutationFn: async (grade: number) => {
      const existingForGrade = rows.filter((r) => r.grade === grade);
      if (existingForGrade.length > 0) {
        // Grade already provisioned — turning it off deactivates, never deletes.
        const { error } = await supabase
          .from('exercises')
          .update({ is_active: false })
          .in('id', existingForGrade.map((r) => r.id));
        if (error) throw error;
        return;
      }
      // New grade — provision inactive stage-1/2/3 rows, copying catalog
      // metadata from an existing row so title/subject/xp stay consistent.
      const template = rows[0];
      if (!template) return;
      const inserts = [1, 2, 3].map((stage) => ({
        route: `${routePrefix}/${stage}`,
        title: template.title,
        subject: template.subject,
        grade,
        stage: `stage-${stage}`,
        display_order: template.display_order,
        xp_reward: template.xp_reward,
        is_active: false,
        config: null,
      }));
      const { error } = await supabase.from('exercises').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exercise-family', routePrefix] });
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
    },
    onError: () => toast.error('Kon graad niet bijwerken.'),
  });

  const familyTitle = rows[0]?.title ?? routePrefix;
  const gradesPresent = new Set(rows.map((r) => r.grade));
  const rowsByGrade = new Map<number, typeof rows>();
  for (const row of rows) {
    if (!rowsByGrade.has(row.grade)) rowsByGrade.set(row.grade, []);
    rowsByGrade.get(row.grade)!.push(row);
  }

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/admin/exercises')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar oefeningen
        </button>

        <h2 className="text-2xl font-black text-slate-900 mb-1">{familyTitle}</h2>
        <p className="text-sm text-slate-500 font-mono mb-6">{routePrefix}</p>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}

        {!isLoading && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Beschikbaar voor graad</p>
              <div className="flex flex-wrap gap-2">
                {GRADES.map((grade) => {
                  const active = gradesPresent.has(grade)
                    && (rowsByGrade.get(grade) ?? []).some((r) => r.is_active);
                  return (
                    <button
                      key={grade}
                      onClick={() => toggleGradeMutation.mutate(grade)}
                      disabled={toggleGradeMutation.isPending}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-bold border transition-colors',
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      )}
                    >
                      Graad {grade}
                    </button>
                  );
                })}
              </div>
            </div>

            {[...rowsByGrade.entries()].map(([grade, gradeRows]) => (
              <div key={grade} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  Graad {grade}
                </div>
                {gradeRows.map((row, i) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      'px-5 py-4 border-b border-slate-100 last:border-b-0',
                      !row.is_active && 'bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">
                        {STAGE_LABELS[row.stage] ?? row.stage}
                      </span>
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: row.id, isActive: !row.is_active })}
                        disabled={toggleActiveMutation.isPending}
                        title={row.is_active ? 'Deactiveren' : 'Activeren'}
                      >
                        {row.is_active ? (
                          <ToggleRight className="w-7 h-7 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-slate-300" />
                        )}
                      </button>
                    </div>
                    <ConfigEditor exerciseId={row.id} initialConfig={row.config} />
                  </motion.div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
