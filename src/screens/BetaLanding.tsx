import { motion } from 'framer-motion';
import {
  Sparkles, Trophy, BookOpen, Shield, BarChart3, Gift, Clock,
  CheckCircle2, MapPin, Smartphone, Heart, Star, ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import heroImg from '@/assets/beta-hero.jpg';
import { BetaSignupForm } from '@/components/beta/BetaSignupForm';
import { SEO } from '@/components/SEO';

const FAQ_ITEMS = [
  {
    q: 'Wanneer start de beta?',
    a: 'De beta opent begin augustus 2026. Je krijgt een mailtje zodra je toegang hebt.',
  },
  {
    q: 'Wat kost Leapio na de beta?',
    a: 'Beta-deelnemers krijgen 1 maand gratis bij de officiële lancering. Daarna start de Basis-formule vanaf €5,99/maand voor één kind, of €8,99/maand voor het Gezinsplan tot 3 kinderen.',
  },
  {
    q: 'Op welke toestellen werkt het?',
    a: 'Leapio is een PWA — installeer het rechtstreeks op smartphone, tablet of laptop, zonder app store. Werkt op iPhone, iPad, Android en computers.',
  },
  {
    q: 'Voor welke leeftijden is het bedoeld?',
    a: 'Leapio is ontworpen voor kinderen van 6 tot 8 jaar — het 1ste en 2de leerjaar in Vlaanderen. De moeilijkheidsgraad past zich automatisch aan per trimester.',
  },
  {
    q: 'Is het ook in lijn met het Vlaamse curriculum?',
    a: 'Ja. Leapio is specifiek gebouwd rond het Vlaamse trimestersysteem en de leerdoelen voor het 1ste en 2de leerjaar. Geen Nederlandse aanpassing — echt Belgisch.',
  },
  {
    q: 'Hoe zit het met privacy?',
    a: 'Je e-mail wordt enkel gebruikt om je over de beta te informeren. We verkopen geen data en delen niets met derden.',
  },
];

const FEATURES = [
  {
    icon: Trophy,
    title: 'Voor je kind: een echt avontuur',
    description: 'Een gamified questkaart met XP, levels, badges en streaks. Geen werkboekje — een spel waarvoor ze elke dag terugkomen.',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Voor jou: volledige controle',
    description: 'Pincode-beveiligd ouderportaal met voortgang per vak. Stel je eigen beloningen in, gekoppeld aan oefeningen die je kind voltooit.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: MapPin,
    title: 'Echt Vlaams curriculum',
    description: 'Trimestersysteem, Vlaamse leerdoelen, Nederlandstalige spraak. Ontworpen voor jouw kind — niet halfslachtig aangepast vanuit Nederland.',
    color: 'from-emerald-500 to-teal-600',
  },
];

const STEPS = [
  {
    icon: Heart,
    title: 'Je kind kiest een avatar',
    description: 'En komt terecht op de Magische Fluisterbos kaart vol oefeningen.',
  },
  {
    icon: BookOpen,
    title: 'Oefenen voelt als spelen',
    description: 'Rekenen, lezen en schrijven met directe feedback en AI-handschriftherkenning.',
  },
  {
    icon: Trophy,
    title: 'Jij stelt de beloningen in',
    description: 'IJsje na 10 oefeningen? Filmavond na een trimester? Jij beslist, zij blijven gemotiveerd.',
  },
];

export default function BetaLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const canonical = typeof window !== 'undefined' ? `${window.location.origin}/beta` : 'https://leapio.lovable.app/beta';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Leapio',
      operatingSystem: 'Web, iOS, Android',
      applicationCategory: 'EducationalApplication',
      description: 'Gamified leerplatform voor het 1ste en 2de leerjaar in Vlaanderen. Rekenen, lezen en schrijven met XP, badges en een Vlaams curriculum.',
      inLanguage: 'nl-BE',
      offers: {
        '@type': 'Offer',
        price: '5.99',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/PreOrder',
      },
      audience: {
        '@type': 'EducationalAudience',
        educationalRole: 'student',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Leapio',
      url: canonical,
    },
  ];

  return (
    <>
      <SEO
        title="Leapio Beta — Gamified Oefenen voor 1ste & 2de Leerjaar | Vlaanderen"
        description="Schrijf je in voor de Leapio beta. Een gamified leerapp voor rekenen, lezen en schrijven, gebouwd voor het Vlaamse 1ste en 2de leerjaar. Lancering augustus 2026."
        canonical={canonical}
        ogImage={heroImg}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-900 to-indigo-950 text-white overflow-x-hidden">
        {/* HERO */}
        <section className="relative px-6 pt-10 pb-16 md:pt-16 md:pb-24 max-w-7xl mx-auto">
          {/* Background blobs */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-violet-500/30 rounded-full blur-3xl pointer-events-none" />

          {/* Top brand bar */}
          <div className="relative flex items-center justify-between mb-10 md:mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-black tracking-tight">Leapio</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-xs font-bold">
              <Clock className="w-3.5 h-3.5" /> Lancering augustus 2026
            </span>
          </div>

          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-300/40 rounded-full text-amber-200 font-bold text-sm mb-6"
              >
                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                Beperkte plaatsen voor de beta
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-5"
              >
                Jouw kind oefent <span className="text-amber-300">elke dag</span>.
                <br className="hidden md:block" /> Zonder gezeur.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg md:text-xl text-violet-100/90 mb-8 max-w-xl leading-relaxed"
              >
                Het eerste echt Vlaamse leerplatform voor het 1ste en 2de leerjaar.
                Gamified rekenen, lezen en schrijven, afgestemd op het trimestersysteem.
                Schrijf je in voor de beta en krijg <strong className="text-white">1 maand gratis</strong> bij lancering.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <BetaSignupForm source="hero" />
              </motion.div>

              <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-violet-200/80">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Geen kredietkaart</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1 maand gratis</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Op elk moment opzegbaar</div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-gradient-to-br from-amber-400/30 to-violet-500/30 rounded-[3rem] blur-2xl" />
              <img
                src={heroImg}
                alt="Vlaams kind oefent rekenen en lezen op de Leapio leerapp"
                width={1280}
                height={960}
                loading="eager"
                fetchPriority="high"
                className="relative rounded-[2rem] shadow-2xl shadow-purple-950/50 border-4 border-white/10"
              />
            </motion.div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="voordelen" className="px-6 py-16 md:py-24 bg-white text-slate-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                Waarom ouders kiezen voor Leapio
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Drie redenen waarom Leapio werkt waar werkboekjes en huiswerkapps falen.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.article
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-slate-50 rounded-3xl p-7 border-2 border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <f.icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black mb-2">{f.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{f.description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="hoe-werkt-het" className="px-6 py-16 md:py-24 bg-slate-50 text-slate-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                Zo werkt het
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Eén keer instellen, elke dag plezier.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((s, i) => (
                <article key={s.title} className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 relative">
                  <div className="absolute -top-4 -left-2 w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {i + 1}
                  </div>
                  <s.icon className="w-8 h-8 text-violet-600 mb-4 mt-3" strokeWidth={2} />
                  <h3 className="text-lg font-black mb-2">{s.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{s.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FOR WHOM */}
        <section className="px-6 py-16 md:py-20 bg-gradient-to-br from-violet-100 to-amber-50 text-slate-900">
          <div className="max-w-4xl mx-auto text-center">
            <Smartphone className="w-12 h-12 mx-auto text-violet-700 mb-4" />
            <h2 className="text-2xl md:text-3xl font-black mb-4 tracking-tight">
              Voor Vlaamse kinderen van 6 tot 8 jaar
            </h2>
            <p className="text-lg text-slate-700 leading-relaxed">
              Speciaal ontworpen voor het <strong>1ste en 2de leerjaar</strong>.
              Werkt op tablet, smartphone en computer — installeer als app zonder app store.
              In het <strong>Nederlands</strong>, met spraakondersteuning voor kinderen die nog leren lezen.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 py-16 md:py-24 bg-white text-slate-900">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-12 tracking-tight">
              Veelgestelde vragen
            </h2>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <article key={item.q} className="border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                    aria-expanded={openFaq === i}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-slate-600 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SECONDARY CTA */}
        <section className="px-6 py-16 md:py-24 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <Gift className="w-12 h-12 mx-auto text-amber-300 mb-4" />
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
              Word één van de eerste 100 gezinnen
            </h2>
            <p className="text-lg md:text-xl text-violet-100/90 mb-8">
              Vroege toegang. Eén maand gratis. Een directe lijn naar de maker om mee te bouwen aan Leapio.
            </p>
            <div className="max-w-xl mx-auto">
              <BetaSignupForm variant="inline" source="footer" />
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="px-6 py-10 bg-slate-950 text-slate-400 text-sm">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">Leapio</span>
              <span>© 2026</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="mailto:hallo@leapio.be" className="hover:text-white transition-colors">Contact</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
