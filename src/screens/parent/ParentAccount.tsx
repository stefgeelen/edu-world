import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, KeyRound, Lock, User, Trash2, Loader2, CreditCard, Calendar, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { mapAuthError, mapDbError } from '@/lib/errorMessages';
import { parentPinSession } from '@/hooks/useParentPin';
import { passwordSchema as strongPasswordSchema, PASSWORD_REQUIREMENTS_TEXT } from '@/lib/passwordValidation';

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis',
  basic: 'Basic',
  family: 'Family',
  school: 'School',
};

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Minstens 2 tekens').max(100, 'Maximaal 100 tekens'),
});

const emailSchema = z.object({
  email: z.string().trim().email('Ongeldig e-mailadres'),
});

const passwordSchema = z.object({
  password: strongPasswordSchema,
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Wachtwoorden komen niet overeen', path: ['confirm'] });

type ProfileForm = z.infer<typeof profileSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function ParentAccount() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['parent-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: subscription } = useQuery({
    queryKey: ['parent-subscription', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { full_name: profile?.full_name ?? '' },
  });

  const updateProfile = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: values.full_name })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Naam bijgewerkt');
      queryClient.invalidateQueries({ queryKey: ['parent-profile'] });
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  // Email form
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });
  const updateEmail = useMutation({
    mutationFn: async (values: EmailForm) => {
      const { error } = await supabase.auth.updateUser({ email: values.email });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bevestigingsmail verstuurd. Controleer beide inboxen.');
      setShowEmailForm(false);
      emailForm.reset();
    },
    onError: (e) => toast.error(mapAuthError(e)),
  });

  // Password form
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema), defaultValues: { password: '', confirm: '' } });
  const updatePassword = useMutation({
    mutationFn: async (values: PasswordForm) => {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Wachtwoord bijgewerkt');
      setShowPasswordForm(false);
      passwordForm.reset();
    },
    onError: (e) => toast.error(mapAuthError(e)),
  });

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'VERWIJDER') return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: 'VERWIJDER' },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      parentPinSession.lock();
      await signOut();
      toast.success('Je account is verwijderd');
      navigate('/');
    } catch (e: any) {
      toast.error(e?.message ?? 'Verwijderen mislukt');
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto w-full space-y-5 pb-24">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-black text-slate-900 mb-1">Mijn account</h2>
        <p className="text-sm text-slate-500">Beheer hier je persoonlijke gegevens en beveiliging.</p>
      </motion.div>

      {/* Profile section */}
      <Card title="Profielgegevens" icon={User}>
        <form onSubmit={profileForm.handleSubmit((v) => updateProfile.mutate(v))} className="space-y-4">
          <Field label="Volledige naam">
            <input
              {...profileForm.register('full_name')}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Je naam"
            />
            {profileForm.formState.errors.full_name && (
              <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.full_name.message}</p>
            )}
          </Field>
          <Field label="E-mailadres">
            <input
              value={profile?.email ?? user?.email ?? ''}
              readOnly
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
            />
            <p className="text-xs text-slate-400 mt-1">Wijzig je e-mail hieronder.</p>
          </Field>
          <button
            type="submit"
            disabled={updateProfile.isPending || !profileForm.formState.isDirty}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Opslaan
          </button>
        </form>
      </Card>

      {/* Email change */}
      <Card title="E-mailadres wijzigen" icon={Mail}>
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Nieuw e-mailadres instellen →
          </button>
        ) : (
          <form onSubmit={emailForm.handleSubmit((v) => updateEmail.mutate(v))} className="space-y-3">
            <Field label="Nieuw e-mailadres">
              <input
                type="email"
                {...emailForm.register('email')}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="nieuw@email.be"
              />
              {emailForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{emailForm.formState.errors.email.message}</p>
              )}
            </Field>
            <p className="text-xs text-slate-500">Je ontvangt een bevestigingsmail op zowel je oude als nieuwe adres.</p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateEmail.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
              >
                {updateEmail.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Bevestigingsmail sturen
              </button>
              <button
                type="button"
                onClick={() => { setShowEmailForm(false); emailForm.reset(); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Annuleren
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Password change */}
      <Card title="Wachtwoord wijzigen" icon={Lock}>
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Nieuw wachtwoord instellen →
          </button>
        ) : (
          <form onSubmit={passwordForm.handleSubmit((v) => updatePassword.mutate(v))} className="space-y-3">
            <Field label="Nieuw wachtwoord">
              <input
                type="password"
                {...passwordForm.register('password')}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoComplete="new-password"
              />
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.password.message}</p>
              )}
            </Field>
            <Field label="Bevestig wachtwoord">
              <input
                type="password"
                {...passwordForm.register('confirm')}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoComplete="new-password"
              />
              {passwordForm.formState.errors.confirm && (
                <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.confirm.message}</p>
              )}
            </Field>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updatePassword.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
              >
                {updatePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Wachtwoord opslaan
              </button>
              <button
                type="button"
                onClick={() => { setShowPasswordForm(false); passwordForm.reset(); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Annuleren
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* PIN change */}
      <Card title="Toegangscode (ouder-PIN)" icon={KeyRound}>
        <p className="text-sm text-slate-500 mb-3">De 4-cijferige code waarmee je dit ouderportaal ontgrendelt.</p>
        <button
          onClick={() => navigate('/auth/setup-pin?change=1&redirect=/app/parent/account')}
          className="text-sm font-bold text-blue-600 hover:text-blue-700"
        >
          Toegangscode wijzigen →
        </button>
      </Card>

      {/* Account info */}
      <Card title="Accountinformatie" icon={Calendar}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow label="Lid sinds" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
          <InfoRow
            label="Abonnement"
            value={
              <button onClick={() => navigate('/app/parent/subscription')} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100">
                <CreditCard className="w-3.5 h-3.5" />
                {PLAN_LABELS[subscription?.plan ?? 'free'] ?? 'Gratis'}
              </button>
            }
          />
        </div>
      </Card>

      {/* Danger zone */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-red-900 text-base">Gevarenzone</h3>
            <p className="text-sm text-red-700/80 mt-0.5">
              Verwijder je account en alle gekoppelde gegevens (kinderen, voortgang, beloningen). Deze actie kan niet ongedaan gemaakt worden.
            </p>
          </div>
        </div>
        {!showDeleteDialog ? (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Account verwijderen
          </button>
        ) : (
          <div className="space-y-3 bg-white rounded-xl p-4 border border-red-200">
            <p className="text-sm text-slate-700">
              Type <span className="font-mono font-bold text-red-600">VERWIJDER</span> om te bevestigen:
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border-2 border-red-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="VERWIJDER"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'VERWIJDER' || deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Definitief verwijderen
              </button>
              <button
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(''); }}
                disabled={deleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="font-black text-slate-900 text-base">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</span>
      <span className="text-slate-900 font-semibold">{value}</span>
    </div>
  );
}
