import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, GraduationCap, Zap, Flame, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const GRADE_LABELS: Record<number, string> = {
  1: '1ste leerjaar',
  2: '2de leerjaar',
  3: '3de leerjaar',
  4: '4de leerjaar',
  5: '5de leerjaar',
  6: '6de leerjaar',
};

export function ParentChildren() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, age, grade, xp, level, streak, avatar_url, avatar_id, pending_promotion')
        .eq('parent_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: subscription } = useQuery({
    queryKey: ['parent-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, max_children, status')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const maxChildren = subscription?.max_children ?? 1;
  const canAddChild = children.length < maxChildren;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Mijn Kinderen</h2>
          <p className="text-sm text-slate-500 font-medium">
            {children.length} van {maxChildren} kind{maxChildren !== 1 ? 'eren' : ''}
          </p>
        </div>
        <button
          onClick={() => canAddChild ? navigate('/app/parent/add-child') : null}
          disabled={!canAddChild}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all',
            canAddChild
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          <Plus className="w-4 h-4" />
          Kind toevoegen
        </button>
      </div>

      {!canAddChild && children.length >= maxChildren && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-medium">
          Je hebt het maximum aantal kinderen bereikt voor jouw abonnement. 
          <button 
            onClick={() => navigate('/app/parent/subscription')}
            className="text-amber-600 font-bold underline ml-1"
          >
            Upgrade je plan
          </button>
        </div>
      )}

      {/* Children List */}
      <div className="space-y-4">
        {children.map((child, i) => (
          <motion.button
            key={child.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/app/parent/child/${child.id}`)}
            className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4 text-left group"
          >
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 overflow-hidden flex-shrink-0">
              {child.avatar_url ? (
                <img src={child.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                child.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-slate-900 truncate">{child.name}</h3>
                {child.pending_promotion && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    Promotie beschikbaar
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {GRADE_LABELS[child.grade] ?? `Groep ${child.grade}`}
                </span>
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <Zap className="w-3.5 h-3.5 fill-amber-500" />
                  {child.xp} XP
                </span>
                <span className="flex items-center gap-1 font-bold text-orange-500">
                  <Flame className="w-3.5 h-3.5 fill-orange-500" />
                  {child.streak}
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      {children.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">👶</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Nog geen kinderen</h3>
          <p className="text-slate-500 mb-6">Voeg je eerste kind toe om te beginnen.</p>
          <button
            onClick={() => navigate('/app/parent/add-child')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-colors"
          >
            Kind toevoegen
          </button>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
