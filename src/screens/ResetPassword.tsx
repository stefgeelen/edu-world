import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapAuthError } from '@/lib/errorMessages';
import { cn } from '@/lib/utils';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = (() => {
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
  })();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens bevatten');
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
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center px-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-6">
        {done ? <Check className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
      </motion.div>
      <h1 className="text-2xl font-black text-slate-800 mb-2">Nieuw wachtwoord</h1>
      <p className="text-slate-500 font-medium mb-8">Kies een nieuw wachtwoord voor je account</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-3 focus-within:border-teal-400 transition-colors">
          <Lock className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nieuw wachtwoord (min. 6 tekens)"
            className="flex-1 bg-transparent text-slate-800 font-semibold placeholder:text-slate-400 outline-none"
            autoComplete="new-password"
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
          <div className="space-y-1.5">
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
            <p className="text-xs font-bold text-slate-500">{strength.label}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={password.length < 6 || loading || done}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
            password.length >= 6 && !loading && !done
              ? 'bg-teal-500 text-white shadow-lg active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          Opslaan <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
