import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useSetParentPin, useHasParentPin } from '@/hooks/useParentPin';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { mapDbError } from '@/lib/errorMessages';

type Step = 'choose' | 'confirm';

/**
 * Mandatory setup screen shown right after registration (or any time a parent
 * lacks a PIN). Forces a 4-digit numeric code, then a confirmation entry.
 */
export function SetupParentPin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get('redirect') ?? '/app/add-child';
  const isChange = params.get('change') === '1';

  const { data: hasPin, isLoading } = useHasParentPin();
  const setPin = useSetParentPin();

  const [step, setStep] = useState<Step>('choose');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');

  // If parent already has a PIN AND we're not explicitly changing it, skip setup
  useEffect(() => {
    if (!isLoading && hasPin && !isChange) {
      navigate(redirectTo, { replace: true });
    }
  }, [hasPin, isLoading, navigate, redirectTo, isChange]);

  // Move to confirm step automatically when first PIN is complete
  useEffect(() => {
    if (step === 'choose' && first.length === 4) {
      setStep('confirm');
    }
  }, [first, step]);

  // Auto-submit when confirm matches length
  useEffect(() => {
    if (step !== 'confirm' || second.length !== 4 || setPin.isPending) return;

    if (second !== first) {
      toast.error('De codes komen niet overeen. Probeer opnieuw.');
      setSecond('');
      setFirst('');
      setStep('choose');
      return;
    }

    setPin.mutate(second, {
      onSuccess: () => {
        toast.success(isChange ? 'Toegangscode gewijzigd' : 'Toegangscode ingesteld');
        navigate(redirectTo, { replace: true });
      },
      onError: (e: any) => {
        toast.error(mapDbError(e) || 'Kon code niet opslaan');
        setSecond('');
        setFirst('');
        setStep('choose');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [second]);

  if (isLoading) return <LoadingSpinner />;

  const isConfirm = step === 'confirm';
  const value = isConfirm ? second : first;
  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, '');
    if (isConfirm) setSecond(digits);
    else setFirst(digits);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col items-center justify-center px-6 py-10">
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
        className="text-2xl md:text-3xl font-black text-slate-900 mb-2 text-center"
      >
        {isConfirm ? 'Bevestig je nieuwe code' : (isChange ? 'Wijzig je toegangscode' : 'Maak je toegangscode')}
      </motion.h1>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-slate-500 font-medium mb-8 text-center max-w-sm"
      >
        {isConfirm
          ? 'Voer dezelfde 4 cijfers nogmaals in.'
          : (isChange
              ? 'Kies een nieuwe 4-cijferige code voor het ouderportaal.'
              : 'Kies een 4-cijferige code om het ouderportaal te beschermen tegen je kinderen.')}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl border-2 border-slate-200 p-6 md:p-8 shadow-lg w-full max-w-sm flex flex-col items-center gap-5"
      >
        <div className="flex items-center gap-2 w-full">
          <div className={cn('flex-1 h-1.5 rounded-full', step === 'choose' ? 'bg-blue-500' : 'bg-emerald-500')} />
          <div className={cn('flex-1 h-1.5 rounded-full', step === 'confirm' ? 'bg-blue-500' : 'bg-slate-200')} />
        </div>

        <InputOTP
          key={step}
          maxLength={4}
          value={value}
          onChange={onChange}
          disabled={setPin.isPending}
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

        {setPin.isPending && (
          <p className="text-xs font-bold text-slate-500">Opslaan…</p>
        )}

        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" />
          Versleuteld opgeslagen
        </div>

        {isConfirm && (
          <button
            type="button"
            onClick={() => { setSecond(''); setFirst(''); setStep('choose'); }}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Andere code kiezen
          </button>
        )}
      </motion.div>

      <p className="text-xs font-bold text-slate-400 mt-6 flex items-center gap-1.5">
        <ArrowRight className="w-3.5 h-3.5" />
        Je kunt deze code later wijzigen in het ouderportaal.
      </p>
    </div>
  );
}
