import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import nootje from "@/assets/landing/nootje.png";
import leapioLogo from "@/assets/brand/leapio-logo-donker.svg";

/** Same night sky as the landing page hero. */
const STARS = [
  'left-[8%] top-[14%]',
  'left-[22%] top-[38%]',
  'right-[12%] top-[18%]',
  'right-[26%] top-[42%]',
  'left-[46%] top-[8%]',
  'right-[6%] top-[64%]',
  'left-[10%] top-[72%]',
];

/** The landing page's gold "press me" button and its outlined partner. */
const BUTTON = 'inline-flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cream';
const GOLD_BUTTON =
  'bg-lp-gold text-lp-night shadow-[0_8px_0_hsl(var(--lp-gold-shadow))] hover:-translate-y-0.5 hover:shadow-[0_10px_0_hsl(var(--lp-gold-shadow))] ' +
  'active:translate-y-1 active:shadow-[0_4px_0_hsl(var(--lp-gold-shadow))]';
const OUTLINE_BUTTON = 'border-2 border-lp-cream/40 text-lp-cream hover:border-lp-gold hover:text-lp-gold';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-lp-night font-lp-body text-lp-cream">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        {STARS.map((position, i) => (
          <Star
            key={position}
            className={cn('absolute h-3 w-3 fill-lp-gold text-lp-gold motion-safe:animate-lp-twinkle', position)}
            style={{ animationDelay: `${i * 420}ms` }}
          />
        ))}
      </div>

      <header className="relative z-10 mx-auto w-full max-w-7xl px-5 py-5 pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.5rem))] sm:px-8 lg:px-12">
        <Link to="/" className="inline-flex items-center" aria-label="Leapio startpagina">
          <img src={leapioLogo} alt="" className="h-9 w-auto" />
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
        <div className="relative mb-6 w-40 sm:w-48">
          <div className="absolute inset-x-2 bottom-0 h-16 rounded-[50%] bg-lp-leaf/20 blur-2xl" aria-hidden="true" />
          <img
            src={nootje}
            alt=""
            className="relative w-full drop-shadow-[0_20px_20px_rgba(10,6,30,0.5)] motion-safe:animate-lp-float"
          />
        </div>

        <p className="text-sm font-bold uppercase tracking-wide text-lp-gold">Fout 404</p>
        <h1 className="mt-2 font-lp-display text-4xl font-bold sm:text-5xl">Oei, hier is niets</h1>
        <p className="mt-3 text-lp-cream/70">
          Nootje zocht overal, maar de pagina{' '}
          <span className="break-all font-semibold text-lp-cream">{location.pathname}</span> bestaat niet.
        </p>

        <div className="mt-10 flex w-full flex-col gap-4 sm:flex-row">
          <button type="button" onClick={() => navigate(-1)} className={cn(BUTTON, OUTLINE_BUTTON)}>
            <ArrowLeft className="h-5 w-5" /> Terug
          </button>
          <Link to="/" replace className={cn(BUTTON, GOLD_BUTTON)}>
            <Home className="h-5 w-5" /> Naar de startpagina
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
