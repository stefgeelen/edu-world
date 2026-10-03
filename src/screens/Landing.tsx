import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bath, BookOpen, Check, Coins, Gamepad2, Heart, LockKeyhole,
  ShoppingBag, Sparkles, Sprout, Star, Utensils, Volume2, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { BetaSignupForm } from '@/components/beta/BetaSignupForm';
import { cn } from '@/lib/utils';
import nootje from '@/assets/landing/nootje.png';
import vosje from '@/assets/landing/vosje.png';
import prikkel from '@/assets/landing/prikkel.png';
import loeka from '@/assets/landing/loeka.png';

/** Gold "press me" button with a hard shadow underneath, as in the design. */
const GOLD_BUTTON =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-lp-gold font-bold text-lp-night ' +
  'shadow-[0_8px_0_hsl(var(--lp-gold-shadow))] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_0_hsl(var(--lp-gold-shadow))] ' +
  'active:translate-y-1 active:shadow-[0_4px_0_hsl(var(--lp-gold-shadow))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cream';

const STARS = [
  'left-[7%] top-[18%]',
  'left-[20%] top-[42%]',
  'right-[12%] top-[16%]',
  'right-[29%] top-[35%]',
  'left-[48%] top-[12%]',
  'right-[5%] top-[57%]',
];

const BUDDIES = [
  { name: 'Nootje', animal: 'eekhoorn', image: nootje },
  { name: 'Vosje', animal: 'vos', image: vosje },
  { name: 'Prikkel', animal: 'egel', image: prikkel },
  { name: 'Loeka', animal: 'uil', image: loeka },
];

const CARE: { label: string; action: string; icon: LucideIcon; fill: string; bar: string }[] = [
  { label: 'Honger', action: 'Voeren', icon: Utensils, fill: 'w-4/5', bar: 'bg-lp-orange' },
  { label: 'Plezier', action: 'Spelen', icon: Gamepad2, fill: 'w-3/4', bar: 'bg-lp-pink' },
  { label: 'Energie', action: 'Slapen', icon: Zap, fill: 'w-full', bar: 'bg-lp-violet' },
  { label: 'Hygiëne', action: 'Wassen', icon: Bath, fill: 'w-4/5', bar: 'bg-lp-blue' },
];

const LOOP: { title: string; description: string; icon: LucideIcon }[] = [
  { title: 'Oefenen', description: 'Kies zelf uit 18 oefentypes voor rekenen, lezen en schrijven.', icon: BookOpen },
  { title: 'Munten verdienen', description: 'Elke afgeronde oefening telt. Afwisseling en de wens van je Buddy leveren extra op.', icon: Sparkles },
  { title: 'Verzorgen', description: 'Voer, speel, was en laat je Buddy slapen. Morgen wacht hij weer op je.', icon: Heart },
];

const PARENT_POINTS = [
  'Aansluiting op het Vlaamse leerplan',
  'Zelf bepalen hoe ver je kind vooruit mag',
  'Voortgang per vak en trimester',
  'Ouderomgeving beschermd met een pincode',
];

/** Voorbeeld in de ouderportaal-mockup; geen echt kind. */
const PARENT_SUBJECTS = [
  { subject: 'Rekenen', status: 'Goed op weg', score: '82%' },
  { subject: 'Lezen', status: 'Blijven oefenen', score: '68%' },
  { subject: 'Schrijven', status: 'Sterke groei', score: '91%' },
];

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 font-lp-display text-2xl font-extrabold text-lp-cream" aria-label="Leapio startpagina">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-lp-gold text-lp-night shadow-md">
        <Sparkles className="h-5 w-5" />
      </span>
      Leapio
    </a>
  );
}

export function Landing() {
  const canonical = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://leapio.app/';

  return (
    <main id="top" className="overflow-hidden bg-lp-cream font-lp-body text-lp-night [&_h1]:font-lp-display [&_h2]:font-lp-display [&_h3]:font-lp-display">
      <SEO
        title="Leapio — Oefenen wordt een avontuur"
        description="Je kind oefent rekenen, lezen en schrijven voor het Vlaamse 1ste leerjaar, verdient Munten en zorgt daarmee voor een eigen Buddy die elke dag wacht."
        canonical={canonical}
      />

      {/* ───── HERO ───── */}
      <section className="relative min-h-[92svh] bg-lp-night text-lp-cream">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
          {STARS.map((position, i) => (
            <Star
              key={position}
              className={cn('absolute h-3 w-3 fill-lp-gold text-lp-gold motion-safe:animate-lp-twinkle', position)}
              style={{ animationDelay: `${i * 420}ms` }}
            />
          ))}
        </div>

        <nav className="relative z-20 mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-5 sm:flex sm:justify-between sm:px-8 lg:px-12">
          <Logo />
          <div className="hidden items-center gap-8 text-sm font-semibold text-lp-cream/80 md:flex">
            <a href="#zo-werkt-het" className="transition-colors hover:text-lp-gold">Zo werkt het</a>
            <a href="#buddies" className="transition-colors hover:text-lp-gold">De Buddy’s</a>
            <a href="#voor-ouders" className="transition-colors hover:text-lp-gold">Voor ouders</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hidden text-sm font-semibold text-lp-cream/80 transition-colors hover:text-lp-gold sm:inline">
              Inloggen
            </Link>
            <a href="#beta" className={cn(GOLD_BUTTON, 'h-10 shrink-0 px-4 text-sm sm:px-5')}>
              Naar de beta
            </a>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-3 px-5 pb-10 pt-5 sm:min-h-[calc(92svh-80px)] sm:gap-8 sm:px-8 sm:pb-16 sm:pt-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pb-10">
          <div className="max-w-2xl text-center lg:text-left">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-lp-gold/40 bg-lp-gold/10 px-3 py-2 text-xs font-bold text-lp-gold sm:mb-5 sm:px-4 sm:text-sm">
              <Sparkles className="h-4 w-4" /> Voor het Vlaamse 1ste leerjaar
            </p>
            <h1 className="text-[2.7rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl xl:text-8xl">
              Oefenen wordt een <span className="text-lp-gold">avontuur.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-lp-cream/80 sm:mt-6 sm:text-xl lg:mx-0">
              Je kind oefent rekenen, lezen en schrijven, verdient Munten en zorgt daarmee voor een eigen Buddy die elke dag wacht.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4 lg:justify-start">
              <a href="#beta" className={cn(GOLD_BUTTON, 'h-14 px-7 text-base sm:h-16 sm:px-9 sm:text-lg')}>
                Schrijf me in voor de beta <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-sm font-semibold text-lp-cream/60">Gratis inschrijven · geen account nodig</span>
            </div>
          </div>

          <div className="relative mx-auto h-[335px] w-full max-w-2xl sm:h-[520px]">
            <div className="absolute inset-x-6 bottom-4 h-56 rounded-[50%] bg-lp-leaf/20 blur-2xl" aria-hidden="true" />
            {/* Centred by the wrapper so the float animation's transform doesn't undo the centring. */}
            <div className="absolute bottom-0 left-1/2 z-10 w-[58%] max-w-[430px] -translate-x-1/2 sm:bottom-4 sm:w-[66%]">
              <img
                src={nootje}
                alt="Nootje, een vrolijke eekhoorn Buddy"
                className="w-full drop-shadow-[0_28px_28px_rgba(10,6,30,0.5)] motion-safe:animate-lp-float"
              />
            </div>
            <div className="absolute left-0 top-12 rounded-2xl border border-lp-gold/30 bg-lp-night-soft/85 p-3 shadow-xl backdrop-blur-sm sm:left-4 sm:top-24 sm:p-4">
              <p className="text-xs font-bold uppercase text-lp-gold">Vandaag verdien je</p>
              <p className="mt-1 font-lp-display text-2xl font-bold">8 Munten</p>
            </div>
            <div className="absolute right-0 top-2 rounded-2xl bg-lp-cream p-3 text-lp-night shadow-xl sm:right-8 sm:top-14 sm:p-4">
              <p className="text-sm font-bold">“Zullen we samen oefenen?”</p>
              <p className="mt-1 text-xs text-lp-night/60">Nootje praat en moedigt aan</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── DE BUDDY'S ───── */}
      <section id="buddies" className="bg-lp-mist px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-bold uppercase text-lp-night/55">Vier vrienden, één eigen verhaal</p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">Wie wordt de Buddy van jouw kind?</h2>
            <p className="mt-5 text-lg text-lp-night/70">
              Een Buddy is geen versiering. Hij begroet, praat, heeft wensen en groeit mee door het schooljaar.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {BUDDIES.map((buddy) => (
              <article
                key={buddy.name}
                className="group overflow-hidden rounded-[2rem] border-2 border-lp-night/10 bg-lp-cream p-3 text-center shadow-[0_12px_30px_hsl(var(--lp-night)/0.1)] transition-transform duration-300 hover:-translate-y-2 sm:p-5"
              >
                <div className="aspect-square overflow-hidden rounded-[1.4rem] bg-lp-gold/20">
                  <img
                    src={buddy.image}
                    alt={`${buddy.name}, de ${buddy.animal} Buddy`}
                    loading="lazy"
                    className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-4 text-xl font-bold sm:text-2xl">{buddy.name}</h3>
                <p className="text-sm font-semibold text-lp-night/55">de {buddy.animal}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───── DE BUDDY VERZORGEN ───── */}
      <section className="bg-lp-cream px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="order-2 lg:order-1" aria-hidden="true">
            {/* Een nagebouwd scherm van de Buddy-kamer, puur ter illustratie. */}
            <div className="mx-auto max-w-md rounded-[2.2rem] border-[5px] border-lp-night-soft bg-lp-night p-2 shadow-[12px_14px_0_hsl(var(--lp-gold))] sm:p-3">
              <div className="overflow-hidden rounded-[1.65rem] bg-lp-night">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-2 border-lp-gold/35 bg-lp-panel px-4 py-3 text-lp-cream sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-bold uppercase text-lp-gold">Jouw Buddy</p>
                    <p className="truncate font-lp-display text-lg font-extrabold">Baby Nootje</p>
                    <p className="flex items-center gap-1 text-xs font-semibold text-lp-teal">
                      <Sprout className="h-3.5 w-3.5" /> Groeit over 90 dagen
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-full border-2 border-lp-gold/45 px-2.5 py-2 font-lp-display text-sm font-extrabold">
                      <Coins className="h-4 w-4 text-lp-gold" /> 24
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-lp-teal px-3 py-2 font-lp-display text-sm font-extrabold text-lp-night">
                      <ShoppingBag className="h-4 w-4" /> Winkel
                    </div>
                  </div>
                </div>

                <div className="relative h-72 overflow-hidden bg-lp-night-soft sm:h-80">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--lp-leaf)),transparent_55%)] opacity-35" />
                  <div className="absolute inset-x-8 bottom-2 h-24 rounded-[50%] bg-lp-night/50" />
                  <div className="absolute left-1/2 top-4 z-10 grid w-[88%] -translate-x-1/2 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border-2 border-lp-night-soft bg-lp-panel px-3 py-2.5 text-lp-cream shadow-md">
                    <p className="min-w-0 text-sm font-bold leading-snug">Hoi! Ik ben Nootje. Tik eens op mij!</p>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lp-blue text-lp-night">
                      <Volume2 className="h-4 w-4" />
                    </span>
                  </div>
                  <img
                    src={nootje}
                    alt=""
                    loading="lazy"
                    className="absolute bottom-1 left-1/2 h-[67%] -translate-x-1/2 object-contain drop-shadow-xl"
                  />
                </div>

                <div className="border-2 border-lp-night-soft bg-lp-panel p-3 text-lp-cream sm:p-4">
                  <div className="mb-3 flex items-center gap-2 font-lp-display text-base font-extrabold">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-lp-violet">
                      <Heart className="h-4 w-4 fill-current" />
                    </span>
                    Zorg voor Nootje
                  </div>
                  <div className="space-y-2">
                    {CARE.map(({ label, action, icon: Icon, fill, bar }) => (
                      <div
                        key={label}
                        className="grid grid-cols-[minmax(0,1fr)_5.2rem] items-center gap-2 rounded-xl border-2 border-lp-night-soft bg-lp-night px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-xs font-bold">
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {label}
                          </p>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-lp-night-soft">
                            <div className={cn('h-full rounded-full', fill, bar)} />
                          </div>
                        </div>
                        <div className={cn('flex h-12 min-w-0 flex-col items-center justify-center rounded-lg px-1 text-center text-lp-night shadow-md', bar)}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="w-full truncate text-xs font-extrabold">{action}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-around border-t border-lp-cream/10 pt-3 text-xs font-bold">
                    <span className="flex flex-col items-center gap-1 text-lp-gold">
                      <Heart className="h-5 w-5 fill-current" />
                      Buddy
                    </span>
                    <span className="flex flex-col items-center gap-1 text-lp-cream/45">
                      <BookOpen className="h-5 w-5" />
                      Dashboard
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="font-bold uppercase text-lp-coral">De Buddy verzorgen</p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-6xl">Munten krijgen meteen betekenis.</h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-lp-night/70">
              Met verdiende Munten kan je kind eten, zeep en speelgoed kiezen. Zo voelt een oefening niet als een los taakje, maar als iets waarmee het voor een vriend zorgt.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="border-l-4 border-lp-coral pl-4">
                <p className="font-lp-display text-xl font-bold">Een eigen ritme</p>
                <p className="mt-1 text-sm leading-relaxed text-lp-night/60">De Buddy toont wat hij nodig heeft, zonder druk of straf.</p>
              </div>
              <div className="border-l-4 border-lp-leaf pl-4">
                <p className="font-lp-display text-xl font-bold">Elke dag anders</p>
                <p className="mt-1 text-sm leading-relaxed text-lp-night/60">Nieuwe wensen maken oefenen en verzorgen afwisselend.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── ZO WERKT HET ───── */}
      <section id="zo-werkt-het" className="bg-lp-mist px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-end gap-8 lg:grid-cols-2">
            <div>
              <p className="font-bold uppercase text-lp-coral">De dagelijkse leerlus</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-extrabold sm:text-6xl">Leren omdat er iemand op je rekent.</h2>
            </div>
            <p className="max-w-xl text-lg leading-relaxed text-lp-night/65 lg:justify-self-end">
              Leapio maakt van oefenen geen losse taak, maar een zorgzaam ritueel. Elke oefening helpt je kind én zijn Buddy vooruit.
            </p>
          </div>
          <div className="mt-14 grid overflow-hidden rounded-[2rem] border-2 border-lp-night/10 bg-lp-night text-lp-cream lg:grid-cols-3">
            {LOOP.map(({ title, description, icon: Icon }, i) => (
              <article
                key={title}
                className={cn(
                  'min-h-72 p-8 sm:p-10',
                  i < LOOP.length - 1 && 'border-b border-lp-cream/10 lg:border-b-0 lg:border-r',
                )}
              >
                <div className="flex items-center justify-between text-lp-gold">
                  <span className="font-lp-display text-sm font-bold">{String(i + 1).padStart(2, '0')}</span>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-20 text-3xl font-bold">{title}</h3>
                <p className="mt-3 leading-relaxed text-lp-cream/65">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───── VOOR OUDERS ───── */}
      <section id="voor-ouders" className="bg-lp-gold px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-bold uppercase text-lp-night/55">Voor ouders</p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-6xl">Plezier voor hen. Inzicht voor jou.</h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-lp-night/75">
              Je kind ziet een Buddy en Munten. Jij ziet wat er geoefend wordt, waar hulp nodig is en welke leerstof al klaarstaat.
            </p>
            <ul className="mt-8 space-y-4">
              {PARENT_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3 font-semibold">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lp-night text-lp-gold">
                    <Check className="h-4 w-4" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="relative mx-auto w-full max-w-2xl rounded-[2rem] border-4 border-lp-night bg-lp-cream p-5 shadow-[14px_14px_0_hsl(var(--lp-night))] sm:p-7"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between border-b border-lp-night/10 pb-5">
              <div>
                <p className="text-xs font-bold uppercase text-lp-night/45">Overzicht van</p>
                <h3 className="text-2xl font-bold">Lina</h3>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-lp-leaf/20 px-3 py-2 text-sm font-bold">
                <LockKeyhole className="h-4 w-4" /> Ouderportaal
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {PARENT_SUBJECTS.map(({ subject, status, score }) => (
                <div key={subject} className="rounded-xl border border-lp-night/10 bg-lp-cream p-4">
                  <p className="text-sm font-bold">{subject}</p>
                  <p className="mt-1 text-xs text-lp-night/55">{status}</p>
                  <p className="mt-5 font-lp-display text-3xl font-extrabold">{score}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-lp-night p-5 text-lp-cream">
              <p className="font-bold">Aandachtspunt</p>
              <p className="mt-1 text-sm text-lp-cream/65">Lina kan wat extra oefening gebruiken bij splitsingen tot 10.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── KLEINE HANDEN ───── */}
      <section className="bg-lp-coral px-5 py-16 text-lp-cream sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className="font-bold uppercase text-lp-cream/65">Ontworpen voor kleine handen</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-5xl">Duidelijk, hoorbaar en snel.</h2>
          </div>
          <div className="grid gap-5 text-sm font-semibold sm:grid-cols-3">
            {['Grote tikvlakken', 'Gesproken uitleg', 'Meteen feedback'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check className="h-5 w-5" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───── BETA ───── */}
      <section id="beta" className="relative bg-lp-night px-5 py-24 text-center text-lp-cream sm:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <img
            src={loeka}
            alt="Loeka nodigt je uit voor de Leapio-beta"
            loading="lazy"
            className="mx-auto mb-4 w-36 drop-shadow-xl motion-safe:animate-lp-float"
          />
          <p className="font-bold uppercase text-lp-gold">Beta start binnenkort</p>
          <h2 className="mt-3 text-4xl font-extrabold sm:text-6xl">Klaar om leren anders te laten voelen?</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-lp-cream/70">
            We laten gezinnen in golven toe. Schrijf je gratis in en we nemen contact op zodra er een plek vrij is.
          </p>
          <div className="mx-auto mt-9 max-w-lg text-left">
            <BetaSignupForm variant="inline" source="landing" />
          </div>
        </div>
      </section>

      <footer className="bg-lp-night-soft px-5 py-8 text-lp-cream/55 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <Logo />
          <p className="text-center">
            © {new Date().getFullYear()} Leapio · Gemaakt voor nieuwsgierige kinderen en betrokken ouders.
          </p>
          <Link to="/auth" className="font-semibold text-lp-cream/80 transition-colors hover:text-lp-gold">
            Inloggen
          </Link>
        </div>
      </footer>
    </main>
  );
}
