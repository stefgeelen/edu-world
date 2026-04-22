import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapAuthError } from '@/lib/errorMessages';
import { cn } from '@/lib/utils';

const MIN_LENGTH = 8;
const MIN_STRENGTH_SCORE = 2; // require at least "Goed"

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => {
    if (password.length === 0) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    const map = [
      { label: 'Te kort', color: 'bg-red-400' },
      { label: 'Zwak', color: 'bg-orange-400' },
      { label: 'Goed', color: 'bg-amber-400' },
      { label: 'Sterk', color: 'bg-emerald-500' },
      { label: 'Heel sterk', color: 'bg-emerald-600' },
    ];
    return { score, ...map[score] };
  }, [password]);

  const requirements = useMemo(() => ({
    length: password.length >= MIN_LENGTH,
    mixedCase: /[A-Z]/.test(password) && /[a-z]/.test(password),
    digit: /\d/.test(password),
  }), [password]);

  const allRequirementsMet =
    requirements.length && requirements.mixedCase && requirements.digit;
  const strongEnough = strength.score >= MIN_STRENGTH_SCORE;
  const passwordsMatch = password.length > 0 && password === confirm;
  const showMismatch = confirmTouched && confirm.length > 0 && !passwordsMatch;
  const canSubmit =
    allRequirementsMet && strongEnough && passwordsMatch && !loading && !done;

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) {
      toast.error('Voldoe eerst aan alle wachtwoordvereisten.');
      return;
    }
    if (!strongEnough) {
      toast.error('Kies een sterker wachtwoord.');
      return;
    }
    if (!passwordsMatch) {
      setConfirmTouched(true);
      toast.error('De wachtwoorden komen niet overeen.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(mapAuthError(error));
    } else {
      setDone(true);
      toast.success('Wachtwoord succesvol gewijzigd!');
      setTimeout(() => navigate('/app', { replace: true }), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center px-6 py-10">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-6">
        {done ? <Check className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
      </motion.div>
      <h1 className="text-2xl font-black text-slate-800 mb-2">Nieuw wachtwoord</h1>
      <p className="text-slate-500 font-medium mb-8 text-center">Kies een nieuw wachtwoord voor je account</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4" noValidate>
        {/* Password */}
        <div>
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-3 focus-within:border-teal-400 transition-colors">
            <Lock className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Nieuw wachtwoord (min. ${MIN_LENGTH} tekens)`}
              className="flex-1 bg-transparent text-slate-800 font-semibold placeholder:text-slate-400 outline-none"
              autoComplete="new-password"
              aria-describedby="password-requirements"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="space-y-1.5 mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 h-1.5 rounded-full transition-colors',
                      i < strength.score ? strength.color : 'bg-slate-200'
                    )}
                  />
                ))}
              </div>
              <p className={cn(
                'text-xs font-bold',
                strongEnough ? 'text-emerald-600' : 'text-slate-500'
              )}>
                {strength.label}
                {!strongEnough && password.length > 0 && ' — kies iets sterkers'}
              </p>
            </div>
          )}

          {/* Requirements checklist */}
          <ul id="password-requirements" className="mt-3 space-y-1">
            {[
              { ok: requirements.length, text: `Minimaal ${MIN_LENGTH} tekens` },
              { ok: requirements.mixedCase, text: 'Hoofdletter en kleine letter' },
              { ok: requirements.digit, text: 'Minimaal één cijfer' },
            ].map((req, i) => (
              <li key={i} className="flex items-center gap-2 text-xs font-semibold">
                <div className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                  req.ok ? 'bg-emerald-500' : 'bg-slate-200'
                )}>
                  {req.ok && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className={req.ok ? 'text-emerald-600' : 'text-slate-500'}>
                  {req.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirm password */}
        <div>
          <div className={cn(
            'bg-white rounded-2xl border-2 p-4 flex items-center gap-3 transition-colors',
            showMismatch
              ? 'border-red-400 focus-within:border-red-500'
              : 'border-slate-200 focus-within:border-teal-400'
          )}>
            <Lock className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              placeholder="Bevestig wachtwoord"
              className="flex-1 bg-transparent text-slate-800 font-semibold placeholder:text-slate-400 outline-none"
              autoComplete="new-password"
              aria-invalid={showMismatch}
              aria-describedby={showMismatch ? 'confirm-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showConfirm ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {showMismatch && (
            <p
              id="confirm-error"
              className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-500"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              De wachtwoorden komen niet overeen
            </p>
          )}
          {confirmTouched && passwordsMatch && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              Wachtwoorden komen overeen
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
            canSubmit
              ? 'bg-teal-500 text-white shadow-lg active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {loading ? 'Bezig…' : done ? 'Gelukt!' : 'Opslaan'}
          {!loading && !done && <ArrowRight className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
