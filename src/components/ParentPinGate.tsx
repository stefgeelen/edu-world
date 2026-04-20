import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useHasParentPin, useVerifyParentPin, parentPinSession } from '@/hooks/useParentPin';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

interface ParentPinGateProps {
  children: React.ReactNode;
}

/**
 * Gate that blocks access to parent portal until a 4-digit PIN is verified.
 * - If the parent has no PIN yet → redirects to /auth/setup-pin.
 * - If unlocked in this session → renders children.
 * - Otherwise shows the PIN entry screen.
 */
export function ParentPinGate({ children }: ParentPinGateProps) {
  const navigate = useNavigate();
  const { data: hasPin, isLoading } = useHasParentPin();
  const verify = useVerifyParentPin();

  const [unlocked, setUnlocked] = useState<boolean>(parentPinSession.isUnlocked());
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick for lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  // Auto-redirect to setup if no pin exists
  useEffect(() => {
    if (!isLoading && hasPin === false) {
      navigate('/auth/setup-pin?redirect=/app/parent', { replace: true });
    }
  }, [hasPin, isLoading, navigate]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length !== 4 || verify.isPending || lockedUntil) return;
    handleVerify(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleVerify = async (value: string) => {
    try {
      const ok = await verify.mutateAsync(value);
      if (ok) {
        setUnlocked(true);
        toast.success('Welkom in het ouderportaal');
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setPin('');
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCK_MS);
          toast.error(`Te veel pogingen. Wacht ${Math.ceil(LOCK_MS / 1000)} seconden.`);
        } else {
          toast.error(`Verkeerde PIN (${next}/${MAX_ATTEMPTS})`);
        }
      }
    } catch (e: any) {
      setPin('');
      toast.error(e?.message ?? 'Kon PIN niet controleren');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (unlocked) return <>{children}</>;
  if (hasPin === false) return <LoadingSpinner />; // redirecting

  const isLocked = lockedUntil !== null && now < lockedUntil;
  const secondsLeft = isLocked ? Math.ceil((lockedUntil! - now) / 1000) : 0;
  if (lockedUntil && !isLocked) {
    // expired
    setLockedUntil(null);
    setAttempts(0);
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col items-center justify-center px-6 py-10 relative">
      <button
        onClick={() => navigate('/app/dashboard')}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Terug
      </button>

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/30 flex items-center justify-center mb-6"
      >
        <Lock className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>

      <motion.h1
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl md:text-3xl font-black text-slate-900 mb-2 text-center"
      >
        Ouderportaal vergrendeld
      </motion.h1>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-slate-500 font-medium mb-8 text-center max-w-sm"
      >
        Voer je 4-cijferige toegangscode in om verder te gaan.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border-2 border-slate-200 p-6 md:p-8 shadow-lg w-full max-w-sm flex flex-col items-center gap-5"
      >
        <InputOTP
          maxLength={4}
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, ''))}
          disabled={isLocked || verify.isPending}
          autoFocus
          inputMode="numeric"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="w-14 h-16 text-2xl font-black" />
            <InputOTPSlot index={1} className="w-14 h-16 text-2xl font-black" />
            <InputOTPSlot index={2} className="w-14 h-16 text-2xl font-black" />
            <InputOTPSlot index={3} className="w-14 h-16 text-2xl font-black" />
          </InputOTPGroup>
        </InputOTP>

        {verify.isPending && (
          <p className="text-xs font-bold text-slate-500">Controleren…</p>
        )}

        {isLocked && (
          <p className="text-sm font-bold text-red-600 text-center">
            Geblokkeerd. Probeer opnieuw over {secondsLeft}s.
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" />
          Versleuteld opgeslagen
        </div>
      </motion.div>
    </div>
  );
}
