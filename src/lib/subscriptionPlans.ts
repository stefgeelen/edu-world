import type { Database } from '@/integrations/supabase/types';

export type SubscriptionPlan = Database['public']['Enums']['subscription_plan'];
export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];

/**
 * The packages, cheapest first. maxChildren mirrors plan_max_children() in
 * supabase/migrations/20261009180000_admin_set_subscription.sql — the server
 * sets the real limit, this copy only drives what the admin sees before saving.
 */
export const PLANS: { key: SubscriptionPlan; label: string; maxChildren: number }[] = [
  { key: 'free', label: 'Gratis', maxChildren: 1 },
  { key: 'basic', label: 'Basis', maxChildren: 2 },
  { key: 'family', label: 'Familie', maxChildren: 5 },
  { key: 'school', label: 'School', maxChildren: 999 },
];

export const STATUSES: { key: SubscriptionStatus; label: string }[] = [
  { key: 'active', label: 'Actief' },
  { key: 'trialing', label: 'Proefperiode' },
  { key: 'past_due', label: 'Betaling achterstallig' },
  { key: 'canceled', label: 'Opgezegd' },
  { key: 'expired', label: 'Verlopen' },
];

export const planLabel = (plan: SubscriptionPlan) => PLANS.find(p => p.key === plan)?.label ?? plan;
export const statusLabel = (status: SubscriptionStatus) => STATUSES.find(s => s.key === status)?.label ?? status;

/**
 * How many children may actually play. Only an active or trialing plan counts;
 * anything else falls back to 1, the same rule enforce_max_children() uses.
 */
export function effectiveMaxChildren(plan: SubscriptionPlan, status: SubscriptionStatus) {
  if (status !== 'active' && status !== 'trialing') return 1;
  return PLANS.find(p => p.key === plan)?.maxChildren ?? 1;
}

export const formatMaxChildren = (max: number) =>
  max >= 999 ? 'onbeperkt' : `${max} ${max === 1 ? 'kind' : 'kinderen'}`;
