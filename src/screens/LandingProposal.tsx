import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Instagram, RotateCcw } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { LOGIN_PATH } from '@/routes/paths';
import { cn } from '@/lib/utils';
import logo from '@/assets/brand/leapio-logo-licht.svg';
import nootje from '@/assets/landing/nootje.png';
import vosje from '@/assets/landing/vosje.png';
import prikkel from '@/assets/landing/prikkel.png';
import loeka from '@/assets/landing/loeka.png';
import nootjeHappy from '@/assets/buddy/buddy-happy.png';
import nootjeNeutral from '@/assets/buddy/buddy-neutral.png';
import nootjeSad from '@/assets/buddy/buddy-sad.png';
import appClip from '@/assets/landing/app-opname.mp4';
import appPoster from '@/assets/landing/app-opname-poster.jpg';

/**
 * VOORSTEL — not linked from the site. A mock-up of a homepage that moves
 * away from the generic look: a Flemish school notebook, a sum you can play,
 * a real recording of the app and a letter from the makers. Open signup
 * instead of the beta. Lives at /voorstel until a decision is made.
 */

const INSTAGRAM_URL = 'https://www.instagram.com/leapio.be/';
const SIGNUP = LOGIN_PATH;
const LOGIN = LOGIN_PATH;

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bitter:wght@600;800&family=Playwrite+BE+VLG:wght@300;400&display=swap';

const STYLES = `
.lv { --ink:#2a1a6b; --pencil:#5d5878; --paper:#fbf7ec; --grid:rgba(66,118,196,.16); --margin:#e0533d; --marker:#ffe36e;
  font-family:'Atkinson Hyperlegible',system-ui,sans-serif; color:var(--ink); background:var(--paper); }
.lv h1,.lv h2,.lv h3,.lv .lv-display { font-family:'Bitter',Georgia,serif; letter-spacing:-0.01em; }
.lv .lv-hand { font-family:'Playwrite BE VLG',cursive; font-weight:300; letter-spacing:0; }
.lv-squared { background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
  background-size:28px 28px; background-position:-1px -1px; }
.lv-lined { background-color:#fffdf6; background-image:repeating-linear-gradient(transparent 0 33px,rgba(66,118,196,.28) 33px 34px);
  background-position:0 1px; }
.lv-margin { position:absolute; top:0; bottom:0; width:2px; background:var(--margin); opacity:.55; left:16px; }
@media (min-width:768px){ .lv-margin { left:56px; } }
.lv-marker { background:linear-gradient(100deg,transparent 0 1%,var(--marker) 3% 96%,transparent 99%);
  padding:0 .15em; margin:0 -.05em; -webkit-box-decoration-break:clone; box-decoration-break:clone; }
.lv-tape { position:absolute; width:92px; height:26px; background:rgba(255,236,170,.75); box-shadow:0 1px 2px rgba(0,0,0,.08); }
.lv-key { box-shadow:0 6px 0 var(--shade); transition:transform .08s, box-shadow .08s; }
.lv-key:active:not(:disabled) { transform:translateY(4px); box-shadow:0 2px 0 var(--shade); }
@keyframes lv-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
@keyframes lv-pop { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1)} }
@media (prefers-reduced-motion:no-preference){ .lv-shake{animation:lv-shake .3s} .lv-pop{animation:lv-pop .35s ease-out} }
`;

function useProposalFonts() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return () => {
      link.remove();
      robots.remove();
    };
  }, []);
}

/** A loose pencil arrow, drawn once by hand rather than taken from an icon set. */
function HandArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 12c22-6 52-4 70 10 14 11 20 26 22 44"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M86 56l12 12 9-15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrimaryButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link
      to={SIGNUP}
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-[var(--ink)] px-6 font-bold text-[var(--paper)] transition-transform',
        'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--marker)]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/* ───────────────────────── Try-it exercise ───────────────────────── */

type Question = { a: number; op: '+' | '−'; b: number; options: number[] };

const QUESTIONS: Question[] = [
  { a: 7, op: '+', b: 5, options: [11, 12, 13, 15] },
  { a: 8, op: '+', b: 6, options: [16, 13, 14, 12] },
  { a: 10, op: '−', b: 3, options: [6, 13, 8, 7] },
];

const KEYS = [
  { bg: '#3d6ef0', shade: '#2546b5' },
  { bg: '#8b4fea', shade: '#6030b8' },
  { bg: '#14a086', shade: '#0b6f5c' },
  { bg: '#e3344b', shade: '#a71d31' },
];

const MUNTEN_PER_RUN = 8;

function answerOf(q: Question) {
  return q.op === '+' ? q.a + q.b : q.a - q.b;
}

function TryExercise() {
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [wrong, setWrong] = useState<number[]>([]);
  const [lastPick, setLastPick] = useState<{ value: number; ok: boolean } | null>(null);
  const [explaining, setExplaining] = useState(false);

  const done = index >= QUESTIONS.length;
  const lost = hearts === 0;
  const q = QUESTIONS[Math.min(index, QUESTIONS.length - 1)];

  const reset = () => {
    setIndex(0);
    setHearts(3);
    setWrong([]);
    setLastPick(null);
    setExplaining(false);
  };

  const pick = (value: number) => {
    setExplaining(false);
    if (value === answerOf(q)) {
      setLastPick({ value, ok: true });
      window.setTimeout(() => {
        setIndex((i) => i + 1);
        setWrong([]);
        setLastPick(null);
      }, 700);
    } else {
      setLastPick({ value, ok: false });
      setWrong((w) => [...w, value]);
      setHearts((h) => h - 1);
    }
  };

  let bubble = 'Tik op mij als je hulp wil.';
  let face = nootjeNeutral;
  if (explaining) bubble = `Reken de som uit. Tik dan op het juiste antwoord. Hoeveel is ${q.a} ${q.op === '+' ? 'plus' : 'min'} ${q.b}?`;
  else if (lastPick?.ok) {
    bubble = `Ja! ${lastPick.value}.`;
    face = nootjeHappy;
  } else if (lastPick && !lastPick.ok) {
    bubble = 'Bijna. Probeer nog eens.';
    face = nootjeSad;
  }

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <span className="lv-tape -top-3 left-6 -rotate-6" aria-hidden="true" />
      <span className="lv-tape -top-3 right-6 rotate-3" aria-hidden="true" />
      <div className="rotate-[1.2deg] rounded-[28px] bg-[#1b1638] p-4 text-white shadow-[0_18px_40px_-12px_rgba(42,26,107,.45)] sm:p-5">
        {/* header, like the app: hearts and the Buddy who explains */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1" aria-label={`${hearts} hartjes over`}>
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={cn('h-5 w-5', i < hearts ? 'fill-[#e3344b] text-[#e3344b]' : 'text-white/25')}
                aria-hidden="true"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setExplaining((e) => !e)}
            disabled={done || lost}
            className="grid h-14 w-14 place-items-center rounded-full bg-[#f2bf3c]/25 ring-2 ring-[#f2bf3c] transition-transform hover:scale-105 disabled:opacity-60"
            aria-label="Nootje legt uit"
          >
            <img src={face} alt="" className="h-12 w-12 object-contain" />
          </button>
        </div>

        {done || lost ? (
          <div className="py-6 text-center">
            <img src={done ? nootjeHappy : nootjeSad} alt="" className="lv-pop mx-auto h-28 w-28 object-contain" />
            {done ? (
              <>
                <p className="lv-display mt-3 text-2xl font-extrabold">Klaar! +{MUNTEN_PER_RUN} Munten</p>
                <p className="mt-2 text-sm text-white/70">
                  In de app koopt je kind daar eten, zeep of speelgoed mee voor zijn eigen Buddy.
                </p>
              </>
            ) : (
              <>
                <p className="lv-display mt-3 text-2xl font-extrabold">Oei, de hartjes zijn op.</p>
                <p className="mt-2 text-sm text-white/70">
                  Geen straf: je begint gewoon opnieuw. Munten zijn er pas als de oefening af is.
                </p>
              </>
            )}
            <div className="mt-5 flex flex-col items-center gap-3">
              <Link
                to={SIGNUP}
                className="inline-flex h-12 items-center rounded-xl bg-[#f2bf3c] px-6 font-bold text-[#2a1a6b]"
              >
                Speel verder met een eigen Buddy
              </Link>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Nog eens
              </button>
            </div>
          </div>
        ) : (
          <>
            <p
              className="mt-3 min-h-[3.25rem] rounded-2xl rounded-tr-sm bg-[var(--paper)] px-4 py-2.5 text-sm font-bold leading-snug text-[var(--ink)]"
              aria-live="polite"
            >
              {bubble}
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 px-3 py-5 text-center">
              <p className="text-xs font-bold text-white/60">
                Vraag {index + 1} van {QUESTIONS.length}
              </p>
              <p className="lv-display mt-1 text-5xl font-extrabold sm:text-6xl">
                <span className="text-[#4cc9f0]">{q.a}</span>
                <span className="text-[#f2bf3c]"> {q.op} </span>
                <span className="text-[#3ddc97]">{q.b}</span>
                <span className="text-white/50"> = ?</span>
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 pb-2">
              {q.options.map((value, i) => {
                const isWrong = wrong.includes(value);
                const isRight = lastPick?.ok && lastPick.value === value;
                return (
                  <button
                    key={`${index}-${value}`}
                    type="button"
                    disabled={isWrong || Boolean(lastPick?.ok)}
                    onClick={() => pick(value)}
                    style={{ background: KEYS[i].bg, ['--shade' as string]: KEYS[i].shade }}
                    className={cn(
                      'lv-key lv-display h-16 rounded-2xl text-2xl font-extrabold',
                      isWrong && 'lv-shake opacity-30',
                      isRight && 'ring-4 ring-white',
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

const FOR_CHILD = [
  'Kiest zelf uit 18 soorten oefeningen: rekenen, lezen en schrijven.',
  'Krijgt 8 Munten voor een afgewerkte oefening. Dezelfde nog eens op één dag levert minder op, dus afwisselen loont.',
  'Heeft drie hartjes per oefening. Zijn ze op? Gewoon opnieuw, zonder straf.',
  'Tikt op de Buddy als het vastzit. Die legt de opdracht uit en leest rekenvragen voor. Bij lezen leest je kind zelf.',
  'Ziet zijn Buddy groeien met het schooljaar, niet met hoeveel het oefent.',
];

const FOR_PARENT = [
  'Wat je kind de voorbije 7 dagen oefende, per vak.',
  'Aandachtspunten: oefeningen waar het de laatste keren moeilijk ging.',
  '1ste leerjaar: leesoefeningen met alleen de letters die al aan bod kwamen.',
  '2de leerjaar: de tafels gaan open op het ritme van het schooljaar. Jij kan er eentje vroeger openzetten.',
  'Jouw deel zit achter een pincode, zodat je kind er niet zomaar in kan.',
];

const BUDDIES = [
  { name: 'Nootje', animal: 'eekhoorn', image: nootje, tilt: '-rotate-3' },
  { name: 'Vosje', animal: 'vos', image: vosje, tilt: 'rotate-2' },
  { name: 'Prikkel', animal: 'egel', image: prikkel, tilt: '-rotate-1' },
  { name: 'Loeka', animal: 'uil', image: loeka, tilt: 'rotate-3' },
];

function Notebook({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="lv-lined relative rounded-sm border border-[rgba(42,26,107,.12)] px-6 pb-[34px] shadow-[0_10px_30px_-18px_rgba(42,26,107,.5)] sm:px-8">
      <h3 className="lv-hand text-2xl leading-[68px] sm:text-[1.7rem]">{title}</h3>
      <ul className="text-[1.05rem] leading-[34px]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="lv-hand shrink-0 text-[var(--margin)]" aria-hidden="true">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingProposal() {
  useProposalFonts();

  return (
    <main className="lv lv-squared relative min-h-screen overflow-hidden">
      <style>{STYLES}</style>
      <SEO
        title="Leapio — oefenen voor het 1ste en 2de leerjaar"
        description="Je kind oefent rekenen, lezen en schrijven en zorgt met de verdiende Munten voor een eigen Buddy. Gratis te gebruiken."
      />
      <div className="lv-margin" aria-hidden="true" />

      {/* ───── nav ───── */}
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 py-5 pl-8 pr-4 md:pl-20 md:pr-8">
        <img src={logo} alt="Leapio" className="h-8 w-auto sm:h-9" />
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to={LOGIN} className="font-bold underline decoration-2 underline-offset-4 hover:decoration-[var(--margin)]">
            Inloggen
          </Link>
          <PrimaryButton className="h-11 px-4 text-sm sm:px-5">Begin gratis</PrimaryButton>
        </div>
      </nav>

      {/* ───── hero: try it ───── */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 pb-16 pl-8 pr-4 pt-6 md:pl-20 md:pr-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-12">
        <div>
          <p className="lv-hand text-lg text-[var(--pencil)]">voor het 1ste en 2de leerjaar</p>
          <h1 className="mt-3 text-[2.6rem] font-extrabold leading-[1.08] sm:text-6xl">
            Je kind oefent.
            <br />
            <span className="lv-marker">Nootje krijgt eten.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--pencil)]">
            Leapio is een app om rekenen, lezen en schrijven te oefenen. Elke afgewerkte oefening levert Munten op. Daarmee
            zorgt je kind voor een eigen Buddy: eten geven, spelen, wassen, laten slapen.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <PrimaryButton className="h-14 text-lg">Begin gratis</PrimaryButton>
            <span className="text-[var(--pencil)]">Geen betaalgegevens nodig.</span>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none mb-2 flex items-end gap-1 text-[var(--margin)] lg:absolute lg:-left-28 lg:-top-6 lg:mb-0 lg:block">
            <span className="lv-hand text-xl">probeer maar</span>
            <HandArrow className="h-12 w-20 lg:ml-10 lg:h-16 lg:w-24" />
          </div>
          <TryExercise />
        </div>
      </section>

      {/* ───── real recording ───── */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 py-16 pl-8 pr-4 md:pl-20 md:pr-8 lg:grid-cols-[auto_1fr] lg:gap-20 lg:py-24">
        <figure className="mx-auto w-[240px] sm:w-[270px]">
          <div className="rounded-[34px] bg-[#1b1638] p-2 shadow-[0_18px_40px_-14px_rgba(42,26,107,.5)]">
            <video
              src={appClip}
              poster={appPoster}
              className="block aspect-[400/802] w-full rounded-[27px] bg-[#1b1638] object-cover"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
            />
          </div>
          <figcaption className="lv-hand mt-4 text-center text-sm text-[var(--pencil)]">echte opname uit de app</figcaption>
        </figure>

        <div>
          <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">Zo ziet het eruit.</h2>
          <ol className="mt-8 space-y-6 text-lg">
            {[
              ['De Buddy wacht thuis.', 'Je kind opent de app en ziet meteen wat Vosje nodig heeft: honger, spelen, wassen of slapen.'],
              ['Je kind kiest een oefening.', 'Sommen, tellen, stippen zetten, woorden lezen. Wat de Buddy vandaag wil, levert iets extra op.'],
              ['Vast? Tik op de Buddy.', 'Die vertelt in kindertaal wat de bedoeling is. Wie het al snapt, oefent gewoon door.'],
              ['Munten worden hazelnoten.', 'Of beukenzeep, een mosbal of een sterrenhangmat. In de winkel kiest je kind zelf wat zijn Buddy krijgt.'],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="lv-hand grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--margin)] text-lg text-[var(--margin)]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-[var(--pencil)]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── notebooks: child / parent ───── */}
      <section className="relative mx-auto max-w-6xl py-16 pl-8 pr-4 md:pl-20 md:pr-8 lg:py-24">
        <h2 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Je kind ziet een Buddy. <br className="hidden sm:block" />
          Jij ziet de rest.
        </h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="lg:-rotate-[0.6deg]">
            <Notebook title="Wat je kind doet" items={FOR_CHILD} />
          </div>
          <div className="lg:mt-10 lg:rotate-[0.8deg]">
            <Notebook title="Wat jij ziet" items={FOR_PARENT} />
          </div>
        </div>
      </section>

      {/* ───── buddies as stickers ───── */}
      <section className="relative mx-auto max-w-6xl py-16 pl-8 pr-4 md:pl-20 md:pr-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">Vier Buddy&rsquo;s. Je kind kiest er één.</h2>
          <p className="lv-hand text-lg text-[var(--pencil)]">wisselen mag één keer per schooljaar</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {BUDDIES.map((b) => (
            <figure
              key={b.name}
              className={cn(
                'relative rounded-[22px] bg-white p-3 pb-4 text-center shadow-[0_8px_18px_-10px_rgba(42,26,107,.45)] transition-transform hover:rotate-0',
                b.tilt,
              )}
            >
              <span className="lv-tape -top-3 left-1/2 w-16 -translate-x-1/2 rotate-2" aria-hidden="true" />
              <img src={b.image} alt={`${b.name}, de ${b.animal}`} loading="lazy" className="mx-auto aspect-square w-full object-contain" />
              <figcaption className="mt-1">
                <span className="lv-hand block text-xl">{b.name}</span>
                <span className="text-sm text-[var(--pencil)]">de {b.animal}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ───── letter from the makers ───── */}
      <section className="relative mx-auto max-w-6xl py-16 pl-8 pr-4 md:pl-20 md:pr-8 lg:py-24">
        <div className="relative mx-auto max-w-2xl">
          <p className="mb-4 inline-block rotate-[-1deg] rounded bg-[var(--marker)] px-3 py-1 text-sm font-bold">
            Voorstel: herschrijf deze brief in jullie eigen woorden
          </p>
          <article className="lv-lined relative -rotate-[0.4deg] rounded-sm border border-[rgba(42,26,107,.12)] px-6 pb-[34px] text-[1.08rem] leading-[34px] shadow-[0_14px_36px_-20px_rgba(42,26,107,.55)] sm:px-10">
            <span className="lv-tape -top-3 left-10 -rotate-3" aria-hidden="true" />
            <p className="lv-hand text-2xl leading-[68px]">Beste ouder,</p>
            <p>
              Leapio is nieuw. We maken het voor kinderen in het Vlaamse 1ste en 2de leerjaar, en we werken er nog volop aan.
            </p>
            <p className="mt-[34px]">
              Daarom is Leapio voorlopig <span className="lv-marker font-bold">gratis</span>. Later komt er een betaalde
              versie. Als het zover is, hoor je dat ruim op voorhand, en beslis je zelf of je verder doet.
            </p>
            <p className="mt-[34px]">
              Loopt er iets mis, of mist je kind een oefening? Laat het ons weten via{' '}
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
                Instagram
              </a>
              .
            </p>
            <p className="lv-hand mt-[34px] text-xl">[jullie namen]</p>
          </article>
        </div>
      </section>

      {/* ───── final call ───── */}
      <section className="relative mx-auto max-w-6xl py-20 pl-8 pr-4 text-center md:pl-20 md:pr-8 lg:py-28">
        <img src={nootjeHappy} alt="" className="mx-auto h-28 w-28 object-contain" />
        <h2 className="mt-4 text-4xl font-extrabold sm:text-5xl">Nootje heeft honger.</h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-[var(--pencil)]">
          Maak een account, voeg je kind toe en het kiest zelf zijn Buddy. Dat duurt een paar minuten.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <PrimaryButton className="h-14 px-8 text-lg">Begin gratis</PrimaryButton>
          <p className="text-[var(--pencil)]">
            Al een account?{' '}
            <Link to={LOGIN} className="font-bold text-[var(--ink)] underline underline-offset-4">
              Inloggen
            </Link>
          </p>
        </div>
      </section>

      <footer className="relative border-t border-[rgba(42,26,107,.12)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-8 pl-8 pr-4 text-sm text-[var(--pencil)] sm:flex-row md:pl-20 md:pr-8">
          <span>© {new Date().getFullYear()} Leapio</span>
          <div className="flex items-center gap-6 font-bold">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-[var(--ink)]">
              <Instagram className="h-4 w-4" aria-hidden="true" /> Instagram
            </a>
            <Link to="/voorwaarden" className="hover:text-[var(--ink)]">Voorwaarden</Link>
            <Link to="/privacy" className="hover:text-[var(--ink)]">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
