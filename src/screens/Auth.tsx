import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isPasswordValid, validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordValidation';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.4z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.1 0-11.2-4.1-13.1-9.6H2.7v6.2C6.7 42.8 14.8 48 24 48z" />
    <path fill="#FBBC05" d="M10.9 28.9c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.7C1 17.2 0 20.5 0 24s1 6.8 2.7 9.9l8.2-5z" />
    <path fill="#EA4335" d="M24 9.6c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.5 30.5 0 24 0 14.8 0 6.7 5.2 2.7 14.1l8.2 5c1.9-5.5 7-9.5 13.1-9.5z" />
  </svg>
);

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isNotOnBetaListError, mapAuthError } from '@/lib/errorMessages';
import { StarryBackground, Ornaments } from '@/components/dashboard/Vitrine';
import leapioLogo from '@/assets/brand/leapio-logo-donker.svg';

// Same dark "vitrine" look as the dashboard.
const FIELD = 'bg-[#0f0828]/70 rounded-2xl border-2 border-[#3b2d71] p-4 flex items-center gap-3 focus-within:border-amber-400 transition-colors';
const INPUT = 'flex-1 min-w-0 bg-transparent text-white font-bold placeholder:text-[#9d8bce] placeholder:font-semibold outline-none text-base';

export function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithOAuth, resetPasswordForEmail, user } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailOk = emailRegex.test(email.trim());
  const passwordOk = mode === 'forgot' ? true : mode === 'login' ? password.length > 0 : isPasswordValid(password);
  const nameOk = mode === 'signup' ? fullName.trim().length >= 2 : true;
  const isValid = emailOk && passwordOk && nameOk;
  const pwReq = validatePassword(password);

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setResetSent(false);
    setConfirmSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      if (!emailOk) toast.error('Vul een geldig e-mailadres in.');
      else if (!passwordOk) toast.error(`Wachtwoord moet minstens ${PASSWORD_MIN_LENGTH} tekens, een hoofdletter, kleine letter en cijfer bevatten.`);
      else if (!nameOk) toast.error('Vul je volledige naam in.');
      return;
    }
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await resetPasswordForEmail(email.trim());
      if (error) {
        toast.error(mapAuthError(error));
      } else {
        // Generic confirmation regardless of whether the address is known,
        // so this can't be used to check which emails have an account.
        setResetSent(true);
      }
    } else if (mode === 'signup') {
      const { error, needsEmailConfirmation } = await signUp(email.trim(), password, fullName.trim());
      if (error) {
        toast.error(mapAuthError(error), { duration: isNotOnBetaListError(error) ? 10000 : undefined });
      } else if (needsEmailConfirmation) {
        // No session yet — every screen behind this point (PIN setup, add-child)
        // needs auth.uid(), so sending them there strands them on a form that
        // can only ever fail. Wait for the confirmation link instead; it comes
        // back through /auth/callback, which resumes onboarding from there.
        setConfirmSent(true);
      } else {
        toast.success('Account aangemaakt! Stel nu je toegangscode in.');
        navigate('/auth/setup-pin?redirect=/app/add-child', { replace: true });
      }
    } else {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        toast.error(mapAuthError(error));
      } else {
        navigate('/app', { replace: true });
      }
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-[100dvh] w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] flex flex-col items-center justify-center relative overflow-hidden px-6 py-12"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <StarryBackground />
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[90%] max-w-xl h-[45%] bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Logo / Brand */}
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="relative z-10 mb-3"
      >
        <img src={leapioLogo} alt="Leapio" className="h-14 w-auto" />
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 text-[#c9bdf0] font-bold mb-6"
      >
        {mode === 'login' ? 'Welkom terug!' : mode === 'signup' ? 'Maak een account aan' : 'Wachtwoord resetten'}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 w-full max-w-sm bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-amber-400/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)]"
      >
        <Ornaments tone="border-amber-400/40" />

      {/* Tab Switcher */}
      {mode !== 'forgot' && (
        <div className="bg-[#0f0828]/80 rounded-2xl p-1.5 flex gap-1 mb-5 border border-[#3b2d71]">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                'flex-1 py-3 rounded-xl font-extrabold text-sm transition-all',
                mode === m
                  ? 'bg-amber-400 text-[#1a103c] shadow-md shadow-amber-400/20'
                  : 'text-[#9d8bce] hover:text-white'
              )}
            >
              {m === 'login' ? 'Inloggen' : 'Registreren'}
            </button>
          ))}
        </div>
      )}

      {/* Social login */}
      {mode !== 'forgot' && (
        <div className="space-y-3 mb-4">
          <button
            type="button"
            onClick={async () => { setLoading(true); await signInWithOAuth('google'); setLoading(false); }}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-white hover:bg-slate-50 font-bold text-slate-700 flex items-center justify-center gap-3 transition-all active:scale-[0.98] border-b-4 border-slate-300 active:border-b-2 active:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                <span>Doorgaan met Google</span>
              </>
            )}
          </button>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#3b2d71]" />
            <span className="text-xs font-bold text-[#9d8bce]">of</span>
            <div className="flex-1 h-px bg-[#3b2d71]" />
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {(mode === 'forgot' && resetSent) || (mode === 'signup' && confirmSent) ? (
          <div className="bg-[#0f0828]/70 rounded-2xl border-2 border-emerald-400/40 p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-emerald-400/15 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-300" strokeWidth={3} />
            </div>
            <p className="text-[#e4dcff] font-semibold text-sm">
              {confirmSent
                ? 'Je account is aangemaakt. We hebben je een e-mail gestuurd — klik op de link daarin om je adres te bevestigen. Daarna stel je je toegangscode in en voeg je je kind toe.'
                : 'Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met een link om je wachtwoord opnieuw in te stellen.'}
            </p>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors"
            >
              Terug naar inloggen
            </button>
          </div>
        ) : (
        <>
        <AnimatePresence mode="wait">
          {mode === 'signup' && (
            <motion.div
              key="name"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={FIELD}>
                <User className="w-5 h-5 text-[#9d8bce] shrink-0" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Volledige naam"
                  className={INPUT}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={FIELD}>
          <Mail className="w-5 h-5 text-[#9d8bce] shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mailadres"
            className={INPUT}
            autoComplete="email"
          />
        </div>

        {mode !== 'forgot' && (
          <div className={FIELD}>
            <Lock className="w-5 h-5 text-[#9d8bce] shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              className={INPUT}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
        )}

        {mode === 'login' && (
          <button
            type="button"
            onClick={() => { setMode('forgot'); setResetSent(false); }}
            className="block text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors -mt-2"
          >
            Wachtwoord vergeten?
          </button>
        )}

        {mode === 'signup' && password.length > 0 && (
          <ul className="space-y-1 px-1">
            {[
              { ok: pwReq.length,    text: `Minimaal ${PASSWORD_MIN_LENGTH} tekens` },
              { ok: pwReq.uppercase, text: 'Minimaal één hoofdletter' },
              { ok: pwReq.lowercase, text: 'Minimaal één kleine letter' },
              { ok: pwReq.digit,     text: 'Minimaal één cijfer' },
            ].map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-xs font-bold">
                <div className={cn('w-4 h-4 rounded-full flex items-center justify-center', r.ok ? 'bg-emerald-400' : 'bg-[#3b2d71]')}>
                  {r.ok && <Check className="w-3 h-3 text-[#1a103c]" strokeWidth={3} />}
                </div>
                <span className={r.ok ? 'text-emerald-300' : 'text-[#9d8bce]'}>{r.text}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          className={cn(
            'w-full h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all duration-300',
            isValid && !loading
              ? 'bg-amber-400 hover:bg-amber-300 text-[#1a103c] shadow-lg shadow-amber-400/25 active:scale-[0.98] border-b-4 border-amber-600 active:border-b-0 active:translate-y-1'
              : 'bg-[#2d1b54] text-[#7e6db8] cursor-not-allowed border-b-4 border-[#3b2d71]'
          )}
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-[#1a103c] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {mode === 'login' ? 'Inloggen' : mode === 'signup' ? 'Account Aanmaken' : 'Verstuur resetlink'}
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </>
          )}
        </button>

        {mode === 'signup' && (
          <p className="text-center text-xs text-[#9d8bce]">
            Tijdens de beta maak je een account met het e-mailadres van de{' '}
            <Link to="/beta" className="font-bold text-amber-300 hover:text-amber-200">wachtlijst</Link>.
          </p>
        )}

        {mode === 'signup' && (
          <p className="text-center text-xs text-[#9d8bce]">
            Met je account ga je akkoord met onze{' '}
            <Link to="/voorwaarden" className="font-bold text-amber-300 hover:text-amber-200">voorwaarden</Link> en{' '}
            <Link to="/privacy" className="font-bold text-amber-300 hover:text-amber-200">privacyverklaring</Link>.
          </p>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="block w-full text-center text-sm font-bold text-[#9d8bce] hover:text-white transition-colors"
          >
            Terug naar inloggen
          </button>
        )}
        </>
        )}
      </form>
      </motion.div>
    </div>
  );
}
