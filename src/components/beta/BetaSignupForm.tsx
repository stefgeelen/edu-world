import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().trim().email({ message: 'Vul een geldig e-mailadres in' }).max(255),
  full_name: z.string().trim().max(100).optional().or(z.literal('')),
  child_grade: z.enum(['kleuter', '1ste-leerjaar', '2de-leerjaar', 'ander', '']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  variant?: 'hero' | 'inline';
  source?: string;
}

export function BetaSignupForm({ variant = 'hero', source }: Props) {
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', full_name: '', child_grade: '' },
  });

  const onSubmit = async (values: FormValues) => {
    const { error } = await supabase.from('beta_signups').insert({
      email: values.email.trim().toLowerCase(),
      full_name: values.full_name?.trim() || null,
      child_grade: values.child_grade || null,
      source: source || (typeof window !== 'undefined' ? window.location.pathname : null),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });

    if (error) {
      if (error.code === '23505') {
        toast.success('Je staat al op onze lijst — bedankt!');
        setSuccess(true);
        return;
      }
      toast.error('Er ging iets mis. Probeer het opnieuw.');
      console.error('beta signup error', error);
      return;
    }

    toast.success('Aanmelding gelukt! We sturen je een bericht zodra de beta opent.');
    setSuccess(true);
  };

  if (success) {
    const shareText = encodeURIComponent(
      'Ontdek Leapio — gamified oefenen voor het 1ste & 2de leerjaar in Vlaanderen. Schrijf je in voor de beta:'
    );
    const shareUrl = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '');
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 shadow-xl border-2 border-emerald-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-900 mb-1">Je bent erbij!</h3>
            <p className="text-slate-600 mb-4">
              Begin augustus krijg je als één van de eersten toegang. Help ons groeien — deel met andere ouders:
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" /> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" /> Facebook
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const isInline = variant === 'inline';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        'rounded-3xl p-5 md:p-6 shadow-xl border-2',
        isInline
          ? 'bg-white/10 border-white/20 backdrop-blur'
          : 'bg-white/95 backdrop-blur border-amber-200'
      )}
    >
      <div className="space-y-3">
        <div>
          <input
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="jouw@emailadres.be"
            aria-label="E-mailadres"
            className={cn(
              'w-full h-14 px-5 rounded-2xl text-base font-semibold outline-none border-2 transition-colors',
              isInline
                ? 'bg-white text-slate-900 border-transparent focus:border-amber-300 placeholder:text-slate-400'
                : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-amber-400 placeholder:text-slate-400'
            )}
          />
          {errors.email && (
            <p className={cn('text-sm font-semibold mt-1.5 px-2', isInline ? 'text-amber-200' : 'text-red-600')}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            {...register('full_name')}
            type="text"
            autoComplete="name"
            placeholder="Voornaam (optioneel)"
            aria-label="Voornaam"
            className={cn(
              'h-12 px-4 rounded-xl text-sm font-semibold outline-none border-2 transition-colors',
              isInline
                ? 'bg-white text-slate-900 border-transparent focus:border-amber-300 placeholder:text-slate-400'
                : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-amber-400 placeholder:text-slate-400'
            )}
          />
          <select
            {...register('child_grade')}
            aria-label="Leerjaar van je kind"
            className={cn(
              'h-12 px-4 rounded-xl text-sm font-semibold outline-none border-2 transition-colors',
              isInline
                ? 'bg-white text-slate-900 border-transparent focus:border-amber-300'
                : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-amber-400'
            )}
          >
            <option value="">Leerjaar van je kind</option>
            <option value="kleuter">Laatste kleuterklas</option>
            <option value="1ste-leerjaar">1ste leerjaar</option>
            <option value="2de-leerjaar">2de leerjaar</option>
            <option value="ander">Ander</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30 active:scale-[0.98] border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Schrijf me in voor de beta
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </>
          )}
        </button>

        <p className={cn('text-xs text-center', isInline ? 'text-white/70' : 'text-slate-500')}>
          Geen spam. Je kan je op elk moment uitschrijven.
        </p>
      </div>
    </form>
  );
}
