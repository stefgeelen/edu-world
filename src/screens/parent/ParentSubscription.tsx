import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, Users, Loader2, Crown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const PLAN_DETAILS: Record<string, { label: string; color: string; features: string[] }> = {
  free: {
    label: 'Gratis',
    color: 'bg-slate-100 text-slate-700',
    features: ['1 kind', 'Basisoefeningen', 'Voortgangsoverzicht'],
  },
  basic: {
    label: 'Basis',
    color: 'bg-blue-100 text-blue-700',
    features: ['2 kinderen', 'Alle oefeningen', 'Beloningen systeem', 'Uitgebreide statistieken'],
  },
  family: {
    label: 'Familie',
    color: 'bg-teal-100 text-teal-700',
    features: ['5 kinderen', 'Alle oefeningen', 'Beloningen systeem', 'Prioriteit support'],
  },
  school: {
    label: 'School',
    color: 'bg-purple-100 text-purple-700',
    features: ['Onbeperkt kinderen', 'Alles uit Familie', 'Klasbeheer', 'Rapportages'],
  },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Actief', color: 'bg-teal-100 text-teal-700' },
  trialing: { label: 'Proefperiode', color: 'bg-blue-100 text-blue-700' },
  past_due: { label: 'Betaling achterstallig', color: 'bg-red-100 text-red-700' },
  canceled: { label: 'Opgezegd', color: 'bg-slate-100 text-slate-600' },
  expired: { label: 'Verlopen', color: 'bg-slate-100 text-slate-500' },
};

export function ParentSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['parent-subscription-detail', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const plan = subscription?.plan ?? 'free';
  const status = subscription?.status ?? 'active';
  const planInfo = PLAN_DETAILS[plan] ?? PLAN_DETAILS.free;
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.active;

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full space-y-6 pb-20">
      <h2 className="text-2xl font-black text-slate-900">Mijn Abonnement</h2>

      {/* Current Plan */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      >
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-slate-900">{planInfo.label}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${planInfo.color}`}>
                  {plan.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400 font-medium">Max kinderen</p>
            <p className="text-2xl font-black text-slate-900">{subscription?.max_children ?? 1}</p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inbegrepen</p>
          <div className="space-y-2.5">
            {planInfo.features.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {subscription?.current_period_end && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-medium">
            Volgende factuurdatum: {new Date(subscription.current_period_end).toLocaleDateString('nl-BE', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </div>
        )}
      </motion.div>

      {/* Upgrade Options */}
      {plan !== 'school' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Upgrade opties</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PLAN_DETAILS)
              .filter(([key]) => {
                const order = ['free', 'basic', 'family', 'school'];
                return order.indexOf(key) > order.indexOf(plan);
              })
              .map(([key, info]) => (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500" />
                    <h4 className="font-bold text-slate-900">{info.label}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${info.color}`}>
                      {key.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {info.features.map((f) => (
                      <p key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                        {f}
                      </p>
                    ))}
                  </div>
                  <button className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors">
                    Neem contact op
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Cancel */}
      {subscription && status === 'active' && plan !== 'free' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-2">Abonnement opzeggen</h3>
          <p className="text-sm text-slate-500 mb-4">
            Je kunt je abonnement op elk moment opzeggen. Je behoudt toegang tot het einde van de huidige factureringsperiode.
          </p>
          <button className="px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors">
            Neem contact op om op te zeggen
          </button>
        </div>
      )}
    </div>
  );
}
