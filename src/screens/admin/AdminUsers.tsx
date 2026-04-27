import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Users, Search, Shield, ShieldCheck, ShieldOff, Loader2, Mail, Calendar, UserCheck, Crown, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscriptions').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: children = [] } = useQuery({
    queryKey: ['admin-children'],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('*');
      if (error) throw error;
      return data;
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Rol bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken rol'),
  });

  const getUserRoles = (userId: string) => roles.filter(r => r.user_id === userId).map(r => r.role);
  const getUserSub = (userId: string) => subscriptions.find(s => s.user_id === userId);
  const getUserChildren = (userId: string) => children.filter(c => c.parent_id === userId);

  const filtered = profiles.filter(p =>
    !search ||
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingProfiles) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Gebruikers
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">{profiles.length} geregistreerde gebruikers</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Zoek op naam of e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
        />
      </div>

      {/* User list */}
      <div className="space-y-3">
        {filtered.map((profile, i) => {
          const userRoles = getUserRoles(profile.id);
          const isAdmin = userRoles.includes('admin');
          const sub = getUserSub(profile.id);
          const childCount = getUserChildren(profile.id).length;

          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-4"
            >
              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 truncate">
                    {profile.full_name || 'Geen naam'}
                  </h3>
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> Admin
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {profile.email || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(profile.created_at).toLocaleDateString('nl-NL')}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    {profile.user_type}
                  </span>
                </div>
              </div>

              {/* Subscription badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-lg border',
                  sub?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : sub?.status === 'trialing'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                )}>
                  {sub ? `${sub.plan} · ${sub.status}` : 'Geen abonnement'}
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {childCount} {childCount === 1 ? 'kind' : 'kinderen'}
                </span>
              </div>

              {/* Admin toggle */}
              <button
                onClick={() => {
                  const action = isAdmin ? 'verwijderen als admin' : 'maken tot admin';
                  if (!window.confirm(`Weet je zeker dat je ${profile.full_name || profile.email || 'deze gebruiker'} wilt ${action}?`)) return;
                  toggleAdmin.mutate({ userId: profile.id, makeAdmin: !isAdmin });
                }}
                disabled={toggleAdmin.isPending}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 border',
                  isAdmin
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                )}
              >
                {isAdmin ? (
                  <><ShieldOff className="w-3.5 h-3.5" /> Admin verwijderen</>
                ) : (
                  <><ShieldCheck className="w-3.5 h-3.5" /> Maak admin</>
                )}
              </button>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 font-semibold">Geen gebruikers gevonden</p>
          </div>
        )}
      </div>
    </div>
  );
}
