import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PLANS,
  STATUSES,
  effectiveMaxChildren,
  formatMaxChildren,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/lib/subscriptionPlans';

export interface ChangePlanTarget {
  userId: string;
  name: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  childCount: number;
}

interface ChangePlanDialogProps {
  target: ChangePlanTarget | null;
  onClose: () => void;
}

/**
 * Switches an account between packages. Upgrades are still requested by mail;
 * this is where the admin sets them. The server derives the child limit from
 * the package, so only package and status are chosen here.
 */
export function ChangePlanDialog({ target, onClose }: ChangePlanDialogProps) {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<SubscriptionPlan>('free');
  const [status, setStatus] = useState<SubscriptionStatus>('active');

  useEffect(() => {
    if (target) {
      setPlan(target.plan);
      setStatus(target.status);
    }
  }, [target]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('admin_set_subscription', {
        p_user_id: target!.userId,
        p_plan: plan,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-engagement'] });
      toast.success('Pakket bijgewerkt');
      onClose();
    },
    onError: () => toast.error('Pakket wijzigen mislukt'),
  });

  const unchanged = !!target && plan === target.plan && status === target.status;
  const newMax = effectiveMaxChildren(plan, status);
  const overLimit = target ? target.childCount - newMax : 0;

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open && !save.isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pakket wijzigen</DialogTitle>
          <DialogDescription>
            {target?.name} · {target?.childCount} {target?.childCount === 1 ? 'kind' : 'kinderen'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pakket</p>
            <div role="radiogroup" aria-label="Pakket" className="grid grid-cols-2 gap-2">
              {PLANS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={plan === p.key}
                  onClick={() => setPlan(p.key)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-2.5 text-left transition-all',
                    plan === p.key
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className="block font-bold text-sm text-slate-900">{p.label}</span>
                  <span className="block text-xs text-slate-500">{formatMaxChildren(p.maxChildren)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
            <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={status === s.key}
                  onClick={() => setStatus(s.key)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all',
                    status === s.key
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {status !== 'active' && status !== 'trialing' && (
              <p className="text-xs text-slate-500 mt-2">
                Met deze status geldt het pakket niet: het account valt terug op 1 kind.
              </p>
            )}
          </div>

          {overLimit > 0 && (
            <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Dit account heeft {target!.childCount} kinderen, het nieuwe pakket laat er {newMax} toe.{' '}
                <strong>
                  {overLimit} {overLimit === 1 ? 'kind wordt' : 'kinderen worden'} gepauzeerd.
                </strong>{' '}
                Niets wordt gewist.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={unchanged || save.isPending}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Opslaan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
