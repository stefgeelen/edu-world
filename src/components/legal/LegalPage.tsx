import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import leapioLogo from '@/assets/brand/leapio-logo-donker.svg';

const CONTACT_EMAIL = 'info@leapio.be';

/** Shared frame for the privacy statement and the terms: header, title, date and intro. */
export function LegalPage({
  title,
  seoTitle,
  description,
  canonical,
  updated,
  intro,
  children,
}: {
  title: string;
  seoTitle: string;
  description: string;
  canonical: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-lp-cream font-lp-body text-lp-night/85 [&_h1]:font-lp-display [&_h2]:font-lp-display">
      <SEO title={seoTitle} description={description} canonical={canonical} />

      <header className="bg-lp-night px-5 py-6 pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.5rem))] sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" aria-label="Leapio startpagina">
            <img src={leapioLogo} alt="" className="h-9 w-auto" />
          </Link>
          <Link to="/" className="text-sm font-semibold text-lp-cream/80 hover:text-lp-gold">
            Terug naar Leapio
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-10 px-5 py-12 leading-relaxed sm:px-8 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-lp-night">{title}</h1>
          <p className="text-sm text-lp-night/60">Laatst bijgewerkt op {updated}</p>
          <p>{intro}</p>
        </div>
        {children}
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold text-lp-night">{title}</h2>
      {children}
    </section>
  );
}

export const ContactMail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-lp-night underline underline-offset-2">
    {CONTACT_EMAIL}
  </a>
);

export const InlineLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className="font-semibold text-lp-night underline underline-offset-2">
    {children}
  </Link>
);
