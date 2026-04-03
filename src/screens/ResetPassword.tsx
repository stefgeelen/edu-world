import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      toast.error(error.message);
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
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nieuw wachtwoord"
            className="flex-1 bg-transparent text-slate-800 font-semibold placeholder:text-slate-400 outline-none"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={!password.trim() || loading || done}
          className={cn(
            'w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
            password.trim() && !loading && !done
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
