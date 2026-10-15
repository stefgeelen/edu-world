import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapAuthError } from '@/lib/errorMessages';
import { cn } from '@/lib/utils';
import { PASSWORD_MIN_LENGTH } from '@/lib/passwordValidation';
import { NightSkyScreen, VitrineCard, FIELD, INPUT, PRIMARY_BUTTON, DISABLED_BUTTON } from '@/components/auth/NightSky';
import leapioLogo from '@/assets/brand/leapio-logo-donker.svg';

const MIN_LENGTH = PASSWORD_MIN_LENGTH;
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
    if (password.length === 0) return { score: 0, label: '', color: 'bg-[#3b2d71]' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    const map = [
      { label: 'Te kort', color: 'bg-red-400' },
      { label: 'Zwak', color: 'bg-orange-400' },
      { label: 'Goed', color: 'bg-amber-400' },
      { label: 'Sterk', color: 'bg-emerald-400' },
      { label: 'Heel sterk', color: 'bg-emerald-300' },
    ];
    return { score, ...map[score] };
  }, [password]);

  const requirements = useMemo(() => ({
    length:    password.length >= MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit:     /\d/.test(password),
  }), [password]);

  const allRequirementsMet =
    requirements.length && requirements.uppercase && requirements.lowercase && requirements.digit;
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
    <NightSkyScreen className="justify-center px-6 py-10">
      <img src={leapioLogo} alt="Leapio" className="relative z-10 h-12 w-auto mb-6" />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative z-10 w-16 h-16 bg-amber-400 rounded-2xl border-b-4 border-amber-600 shadow-lg shadow-amber-400/25 flex items-center justify-center mb-4">
        {done ? <Check className="w-8 h-8 text-[#1a103c]" strokeWidth={3} /> : <Lock className="w-8 h-8 text-[#1a103c]" />}
      </motion.div>
      <h1 className="relative z-10 text-2xl font-black text-white mb-2">Nieuw wachtwoord</h1>
      <p className="relative z-10 text-[#c9bdf0] font-bold mb-6 text-center">Kies een nieuw wachtwoord voor je account</p>

      <VitrineCard className="z-10 max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Password */}
        <div>
          <div className={FIELD}>
            <Lock className="w-5 h-5 text-[#9d8bce] shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Nieuw wachtwoord (min. ${MIN_LENGTH} tekens)`}
              className={INPUT}
              autoComplete="new-password"
              aria-describedby="password-requirements"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#9d8bce] hover:text-white transition-colors"
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
                      i < strength.score ? strength.color : 'bg-[#3b2d71]'
                    )}
                  />
                ))}
              </div>
              <p className={cn(
                'text-xs font-bold',
                strongEnough ? 'text-emerald-300' : 'text-[#c9bdf0]'
              )}>
                {strength.label}
                {!strongEnough && password.length > 0 && ' — kies iets sterkers'}
              </p>
            </div>
          )}

          {/* Requirements checklist */}
          <ul id="password-requirements" className="mt-3 space-y-1">
            {[
              { ok: requirements.length,    text: `Minimaal ${MIN_LENGTH} tekens` },
              { ok: requirements.uppercase, text: 'Minimaal één hoofdletter' },
              { ok: requirements.lowercase, text: 'Minimaal één kleine letter' },
              { ok: requirements.digit,     text: 'Minimaal één cijfer' },
            ].map((req, i) => (
              <li key={i} className="flex items-center gap-2 text-xs font-bold">
                <div className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                  req.ok ? 'bg-emerald-400' : 'bg-[#3b2d71]'
                )}>
                  {req.ok && <Check className="w-3 h-3 text-[#1a103c]" strokeWidth={3} />}
                </div>
                <span className={req.ok ? 'text-emerald-300' : 'text-[#9d8bce]'}>
                  {req.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirm password */}
        <div>
          <div className={cn(
            FIELD,
            showMismatch && 'border-red-400 focus-within:border-red-400'
          )}>
            <Lock className="w-5 h-5 text-[#9d8bce] shrink-0" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              placeholder="Bevestig wachtwoord"
              className={INPUT}
              autoComplete="new-password"
              aria-invalid={showMismatch}
              aria-describedby={showMismatch ? 'confirm-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-[#9d8bce] hover:text-white transition-colors"
              aria-label={showConfirm ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {showMismatch && (
            <p
              id="confirm-error"
              className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-300"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              De wachtwoorden komen niet overeen
            </p>
          )}
          {confirmTouched && passwordsMatch && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              Wachtwoorden komen overeen
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            'w-full h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all duration-300',
            canSubmit ? PRIMARY_BUTTON : DISABLED_BUTTON
          )}
        >
          {loading ? 'Bezig…' : done ? 'Gelukt!' : 'Opslaan'}
          {!loading && !done && <ArrowRight className="w-5 h-5" strokeWidth={3} />}
        </button>
      </form>
      </VitrineCard>
    </NightSkyScreen>
  );
}
