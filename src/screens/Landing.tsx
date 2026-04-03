import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Trophy, BarChart3, Play, ArrowRight,
  BookOpen, Target, Flame, Star, Users, Shield,
  CheckCircle2, Menu, X, Zap, GraduationCap
} from 'lucide-react';
import heroIllustration from '@/assets/hero-illustration.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Interactief Leren',
    description: 'Slimme oefeningen die zich aanpassen aan het niveau van je kind.',
    color: 'bg-edu-blue/10 text-edu-blue',
    border: 'border-edu-blue/20',
  },
  {
    icon: Trophy,
    title: 'Gamified Beloningen',
    description: 'Badges, punten en streaks houden de motivatie hoog.',
    color: 'bg-edu-orange/10 text-edu-orange',
    border: 'border-edu-orange/20',
  },
  {
    icon: BarChart3,
    title: 'Ouder Dashboard',
    description: 'Volg eenvoudig de voortgang en voltooide taken van je kind.',
    color: 'bg-edu-teal/10 text-edu-teal',
    border: 'border-edu-teal/20',
  },
  {
    icon: Shield,
    title: 'Veilig & Betrouwbaar',
    description: 'Geen advertenties, geen afleidingen. Een veilige leeromgeving.',
    color: 'bg-edu-purple/10 text-edu-purple',
    border: 'border-edu-purple/20',
  },
];

const STEPS = [
  {
    number: '1',
    icon: Users,
    title: 'Maak een profiel',
    description: 'Stel een profiel in voor je kind met naam en leeftijd. EduWorld bepaalt automatisch het juiste niveau.',
    color: 'from-edu-blue to-edu-purple',
  },
  {
    number: '2',
    icon: Zap,
    title: 'Kind speelt & leert',
    description: 'Je kind maakt speelse oefeningen, verdient badges en klimt levels. Leren voelt als een avontuur!',
    color: 'from-edu-orange to-edu-pink',
  },
  {
    number: '3',
    icon: BarChart3,
    title: 'Bekijk de voortgang',
    description: 'Volg de resultaten, streaks en groei van je kind via het overzichtelijke ouder-dashboard.',
    color: 'from-edu-teal to-edu-green',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Mijn dochter kijkt nu uit naar haar huiswerk! De badges en beloningen houden haar super gemotiveerd.',
    name: 'Sarah de Vries',
    role: 'Moeder van Emma (7)',
    avatar: '👩',
  },
  {
    quote: 'Als leerkracht zie ik een duidelijk verschil bij leerlingen die EduWorld thuis gebruiken. Ze zijn zelfverzekerder.',
    name: 'Pieter Janssen',
    role: 'Leerkracht groep 4',
    avatar: '👨‍🏫',
  },
  {
    quote: 'Eindelijk een app die écht werkt. Geen gezeur meer, mijn zoon wil zelf oefenen. Dat had ik nooit verwacht!',
    name: 'Lisa Bakker',
    role: 'Moeder van Daan (9)',
    avatar: '👩‍🦰',
  },
];

export function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background font-body overflow-x-hidden">
      {/* ───── HEADER ───── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-edu-blue to-edu-teal flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-display font-black text-foreground tracking-tight">EduWorld</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {['features', 'how-it-works', 'testimonials'].map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors capitalize"
              >
                {id === 'how-it-works' ? 'Hoe werkt het' : id === 'features' ? 'Functies' : 'Ervaringen'}
              </button>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Inloggen
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-5 py-2.5 bg-gradient-to-r from-edu-orange to-edu-pink text-white rounded-full font-bold text-sm shadow-lg shadow-edu-orange/25 hover:shadow-xl hover:shadow-edu-orange/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              Gratis Starten
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-foreground">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-3"
          >
            {[
              { id: 'features', label: 'Functies' },
              { id: 'how-it-works', label: 'Hoe werkt het' },
              { id: 'testimonials', label: 'Ervaringen' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="block w-full text-left py-2 text-sm font-semibold text-muted-foreground"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => navigate('/auth')}
              className="w-full px-5 py-3 bg-gradient-to-r from-edu-orange to-edu-pink text-white rounded-2xl font-bold text-sm shadow-lg"
            >
              Gratis Starten
            </button>
          </motion.div>
        )}
      </header>

      {/* ───── HERO ───── */}
      <section id="hero" className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-edu-blue/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-edu-orange/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <motion.div
                variants={fadeUp} custom={0} initial="hidden" animate="visible"
                className="inline-flex items-center gap-2 px-4 py-2 bg-edu-yellow/15 text-edu-orange rounded-full text-sm font-bold mb-6 border border-edu-yellow/30"
              >
                <Sparkles className="w-4 h-4" />
                Nieuw: Fluisterbos-avontuur beschikbaar!
              </motion.div>

              <motion.h1
                variants={fadeUp} custom={1} initial="hidden" animate="visible"
                className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-foreground leading-[1.1] tracking-tight mb-6"
              >
                Maak van huiswerk{' '}
                <span className="bg-gradient-to-r from-edu-blue via-edu-teal to-edu-green bg-clip-text text-transparent">
                  een avontuur
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp} custom={2} initial="hidden" animate="visible"
                className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed"
              >
                EduWorld houdt je kinderen gemotiveerd en betrokken bij hun schoolwerk door{' '}
                <strong className="text-foreground">leuk, interactief leren</strong> met beloningen, badges en avonturen.
              </motion.p>

              <motion.div
                variants={fadeUp} custom={3} initial="hidden" animate="visible"
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <button
                  onClick={() => navigate('/auth')}
                  className="px-8 py-4 bg-gradient-to-r from-edu-orange to-edu-pink text-white rounded-2xl font-extrabold text-lg shadow-xl shadow-edu-orange/25 hover:shadow-2xl hover:shadow-edu-orange/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Gratis Starten
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="px-8 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold text-lg hover:bg-accent transition-colors flex items-center justify-center gap-2 border-2 border-border"
                >
                  <Play className="w-5 h-5" strokeWidth={2.5} />
                  Bekijk Demo
                </button>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                variants={fadeUp} custom={4} initial="hidden" animate="visible"
                className="flex items-center gap-6 mt-10 justify-center lg:justify-start"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-edu-green" />
                  <span className="font-medium">Geen creditcard nodig</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-edu-green" />
                  <span className="font-medium">Geschikt voor groep 1-6</span>
                </div>
              </motion.div>
            </div>

            {/* Right: Hero image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-edu-blue/15 border-2 border-border/50">
                <img
                  src={heroIllustration}
                  alt="EduWorld gamified learning dashboard met badges en oefeningen"
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>
              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-edu-yellow rounded-2xl shadow-lg flex items-center justify-center rotate-12"
              >
                <Star className="w-8 h-8 text-white" fill="white" />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -bottom-4 -left-4 w-14 h-14 bg-edu-teal rounded-2xl shadow-lg flex items-center justify-center -rotate-6"
              >
                <Flame className="w-7 h-7 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section id="features" className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-edu-blue/10 text-edu-blue rounded-full text-sm font-bold mb-4">
              Functies
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-foreground mb-4">
              Alles wat je kind nodig heeft
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Van adaptieve oefeningen tot motiverende beloningen — EduWorld maakt leren leuk én effectief.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}
                className={`bg-card rounded-3xl p-6 border-2 ${feat.border} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}
              >
                <div className={`w-14 h-14 rounded-2xl ${feat.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feat.icon className="w-7 h-7" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-display font-extrabold text-card-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-edu-teal/10 text-edu-teal rounded-full text-sm font-bold mb-4">
              Hoe werkt het
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-foreground mb-4">
              In 3 stappen van start
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Binnen 2 minuten is je kind klaar om te beginnen met leren.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative text-center group"
              >
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-border to-transparent" />
                )}

                <div className={`w-24 h-24 bg-gradient-to-br ${step.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-105 transition-transform duration-300`}>
                  <step.icon className="w-10 h-10 text-white" strokeWidth={2} />
                </div>

                <span className="inline-block px-3 py-1 bg-secondary text-muted-foreground rounded-full text-xs font-bold mb-3">
                  Stap {step.number}
                </span>

                <h3 className="text-xl font-display font-extrabold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── TESTIMONIALS ───── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-edu-pink/10 text-edu-pink rounded-full text-sm font-bold mb-4">
              Ervaringen
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-foreground mb-4">
              Ouders & leerkrachten zijn enthousiast
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-card rounded-3xl p-8 border-2 border-border/50 hover:shadow-xl transition-shadow duration-300 relative"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-edu-yellow" fill="hsl(var(--edu-yellow))" />
                  ))}
                </div>

                <p className="text-foreground leading-relaxed mb-6 italic">"{t.quote}"</p>

                <div className="flex items-center gap-3">
                  <span className="text-3xl">{t.avatar}</span>
                  <div>
                    <p className="font-display font-bold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-br from-edu-blue via-edu-purple to-edu-pink rounded-[2.5rem] p-10 sm:p-16 text-center overflow-hidden"
          >
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white mb-4 relative z-10">
              Klaar om leren leuk te maken?
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto mb-8 relative z-10">
              Start vandaag nog gratis en ontdek waarom duizenden gezinnen kiezen voor EduWorld.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-10 py-4 bg-white text-edu-blue rounded-2xl font-extrabold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative z-10"
            >
              Start Gratis Proefperiode
            </button>
          </motion.div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="border-t border-border bg-secondary/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-edu-blue to-edu-teal flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-black text-foreground">EduWorld</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Voorwaarden</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} EduWorld. Alle rechten voorbehouden.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
