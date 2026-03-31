import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminSubscriptions() {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['admin-subscriptions-detail'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const getUser = (userId: string | null) => profiles.find(p => p.id === userId);

  const planCounts = subscriptions.reduce((acc, s) => {
    acc[s.plan] = (acc[s.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusCounts = subscriptions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6">
        <CreditCard className="w-6 h-6 text-indigo-600" />
        Abonnementen
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {['free', 'basic', 'family', 'school'].map(plan => (
          <div key={plan} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{planCounts[plan] || 0}</p>
            <p className="text-xs font-bold text-slate-500 capitalize">{plan}</p>
          </div>
        ))}
      </div>

      {/* Status summary */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <span
            key={status}
            className={cn(
              'text-xs font-bold px-3 py-1.5 rounded-lg border',
              status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              status === 'trialing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              status === 'canceled' ? 'bg-red-50 text-red-600 border-red-200' :
              'bg-slate-50 text-slate-500 border-slate-200'
            )}
          >
            {status}: {count as number}
          </span>
        ))}
      </div>

      {/* Subscription list */}
      <div className="space-y-3">
        {subscriptions.map((sub, i) => {
          const user = getUser(sub.user_id);
          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">
                  {user?.full_name || user?.email || sub.user_id || 'Organisatie'}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(sub.created_at).toLocaleDateString('nl-NL')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Max {sub.max_children} kind{sub.max_children !== 1 ? 'eren' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                  {sub.plan}
                </span>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-lg border',
                  sub.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  sub.status === 'trialing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                )}>
                  {sub.status}
                </span>
              </div>
            </motion.div>
          );
        })}

        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 font-semibold">Nog geen abonnementen</p>
          </div>
        )}
      </div>
    </div>
  );
}
