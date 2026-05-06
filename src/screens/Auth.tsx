import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isPasswordValid, validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/passwordValidation';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { mapAuthError } from '@/lib/errorMessages';

export function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailOk = emailRegex.test(email.trim());
  const passwordOk = mode === 'login' ? password.length > 0 : isPasswordValid(password);
  const nameOk = mode === 'login' ? true : fullName.trim().length >= 2;
  const isValid = emailOk && passwordOk && nameOk;
  const pwReq = validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      if (!emailOk) toast.error('Vul een geldig e-mailadres in.');
      else if (!passwordOk) toast.error(`Wachtwoord moet minstens ${PASSWORD_MIN_LENGTH} tekens, een cijfer en een speciaal teken bevatten.`);
      else if (!nameOk) toast.error('Vul je volledige naam in.');
      return;
    }
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email.trim(), password, fullName.trim());
      if (error) {
        toast.error(mapAuthError(error));
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
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden px-6 py-12">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[60%] bg-gradient-to-br from-teal-300 to-cyan-200 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[60%] bg-gradient-to-tl from-orange-300 to-amber-200 rounded-full blur-3xl opacity-20 pointer-events-none" />

      {/* Logo / Brand */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-[2rem] shadow-xl shadow-teal-500/20 flex items-center justify-center mb-6 transform -rotate-3"
      >
        <Sparkles className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-black text-slate-800 mb-1 tracking-tight"
      >
        EduWorld
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-slate-500 font-medium mb-8"
      >
        {mode === 'login' ? 'Welkom terug!' : 'Maak een account aan'}
      </motion.p>

      {/* Tab Switcher */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-1.5 flex gap-1 mb-6 shadow-sm border border-slate-200 w-full max-w-sm"
      >
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 py-3 rounded-xl font-bold text-sm transition-all',
              mode === m
                ? 'bg-teal-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {m === 'login' ? 'Inloggen' : 'Registreren'}
          </button>
        ))}
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
      >
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
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-3 focus-within:border-teal-400 transition-colors">
                <User className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Volledige naam"
                  className="flex-1 bg-transparent text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-medium outline-none text-base"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-3 focus-within:border-teal-400 transition-colors">
          <Mail className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mailadres"
            className="flex-1 bg-transparent text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-medium outline-none text-base"
            autoComplete="email"
          />
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-3 focus-within:border-teal-400 transition-colors">
          <Lock className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            className="flex-1 bg-transparent text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-medium outline-none text-base"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {mode === 'signup' && password.length > 0 && (
          <ul className="space-y-1 px-1">
            {[
              { ok: pwReq.length,    text: `Minimaal ${PASSWORD_MIN_LENGTH} tekens` },
              { ok: pwReq.uppercase, text: 'Minimaal één hoofdletter' },
              { ok: pwReq.lowercase, text: 'Minimaal één kleine letter' },
              { ok: pwReq.digit,     text: 'Minimaal één cijfer' },
              { ok: pwReq.special,   text: 'Minimaal één speciaal teken' },
            ].map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-xs font-semibold">
                <div className={cn('w-4 h-4 rounded-full flex items-center justify-center', r.ok ? 'bg-emerald-500' : 'bg-slate-200')}>
                  {r.ok && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className={r.ok ? 'text-emerald-600' : 'text-slate-500'}>{r.text}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          className={cn(
            'w-full h-16 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 transition-all duration-300',
            isValid && !loading
              ? 'bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-500 text-white shadow-lg shadow-teal-500/30 active:scale-[0.98] border-b-4 border-teal-600 active:border-b-0 active:translate-y-1'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border-b-4 border-slate-200'
          )}
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {mode === 'login' ? 'Inloggen' : 'Account Aanmaken'}
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </>
          )}
        </button>
      </motion.form>
    </div>
  );
}
