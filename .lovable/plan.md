# Beta Landing One-Pager voor EduWorld

## Doel

Een aparte, conversiegerichte one-pager waar Vlaamse ouders zich kunnen inschrijven voor de beta (lancering begin augustus). Snel, duidelijk, met sterke SEO en email capture die opgeslagen wordt in een aparte database tabel.

---

## 1. Route & navigatie

- Nieuwe publieke route: `**/beta**` (apart van de bestaande `/` Landing — die blijft ongemoeid voor de productapp)
- Toegevoegd in `src/routes/publicRoutes.tsx`
- Optioneel later: `/` redirecten naar `/beta` tot na launch (vraag: zie onderaan)

## 2. Database — `beta_signups` tabel

Migratie via Lovable Cloud:

```sql
create table public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  child_grade text,           -- '1ste leerjaar' | '2de leerjaar' | 'kleuter' | 'ander'
  source text,                -- referral / utm bron
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.beta_signups enable row level security;

-- Iedereen (anon + authenticated) mag inschrijven
create policy "Anyone can sign up for beta"
  on public.beta_signups for insert
  to anon, authenticated
  with check (true);

-- Alleen admins mogen lezen
create policy "Admins can view beta signups"
  on public.beta_signups for select
  to authenticated
  using (has_role(auth.uid(), 'admin'));
```

Email validatie via Zod client-side + `unique` constraint server-side (duplicaat = vriendelijke "je staat al op de lijst" boodschap).

## 3. One-pager structuur (`src/screens/BetaLanding.tsx`)

Mobile-first, single-scroll, snelle laadtijd. Secties:

1. **Hero** — Kop "Jouw kind oefent elke dag. Zonder gezeur." + subkop over Vlaams curriculum. Inline email-formulier (email + optioneel naam + leerjaar dropdown) met grote CTA "Schrijf me in voor de beta". Badge: "Lancering begin augustus 2026 · Eerste maand gratis".
2. **Social proof / urgentie** — "Beperkte plaatsen voor de beta" + counter (statisch of live van DB count).
3. **3 voordelen** (uit GTM doc):
  - Voor het kind: gamified avontuur (XP, badges, quest map)
  - Voor de ouder: pincode-portaal met voortgang per vak + eigen beloningen
  - Belgisch curriculum: trimestersysteem 1ste/2de leerjaar, Nederlandse spraak
4. **Hoe werkt het** — 3 stappen met screenshots/illustraties
5. **Voor wie** — Eerste & tweede leerjaar (6-8 jaar), Vlaanderen
6. **FAQ** — Wat kost het na de beta? Wanneer start het? Op welke toestellen? Privacy?
7. **Tweede CTA-blok** — Email capture herhalen + "Wat krijg je: 1 maand gratis bij lancering, vroege toegang, directe lijn met de maker"
8. **Footer** — privacy, contact

## 4. Form flow

- React Hook Form + Zod schema (email required + valid, leerjaar optioneel)
- Submit: `supabase.from('beta_signups').insert(...)`
- Bij `unique` violation (code `23505`): toast "Je staat al op onze lijst — bedankt!"
- Bij succes: state wisselt naar bedankscherm (geen redirect) met deel-knoppen (WhatsApp, Facebook) — past bij Fase 2 van de GTM (peer sharing)
- Geen authenticatie nodig — anonieme insert via RLS policy

## 5. SEO strategie

**Technisch (in `index.html` + per-page met react-helmet-async):**

- Title: `EduWorld Beta — Gamified Oefenen voor 1ste & 2de Leerjaar | Vlaanderen`
- Meta description: 155 tekens, focus op "oefenen thuis", "Vlaams", "1ste leerjaar", "rekenen lezen schrijven"
- Canonical URL naar `/beta`
- Open Graph + Twitter Card met hero-afbeelding (1200x630) — voor delen in Facebook-groepen (kanaal #1 in GTM)
- `lang="nl-BE"`
- Favicon + apple-touch-icon

**Structured data (JSON-LD):**

- `SoftwareApplication` schema (naam, prijsrange, doelgroep)
- `FAQPage` schema gekoppeld aan FAQ-sectie → rich snippets in Google
- `Organization` schema

**On-page:**

- Eén `<h1>` met primaire keyword: "Online oefenen voor het 1ste en 2de leerjaar"
- `<h2>`/`<h3>` hiërarchie semantisch
- Alt-tekst op alle afbeeldingen (Nederlands)
- Interne ankerlinks (`#voordelen`, `#hoe-werkt-het`, `#faq`)
- Snelle LCP: hero-afbeelding `loading="eager"`, rest `lazy`
- Semantische HTML (`<main>`, `<section>`, `<article>`)

**Off-page voorbereid:**

- Update `public/robots.txt` (al ok, allow all)
- Nieuwe `public/sitemap.xml` met `/beta` als prioriteit 1.0
- `public/manifest.json` titel/description checken

**Keyword focus** (Vlaams, low-competition long-tail):

- "oefenen 1ste leerjaar online"
- "rekenen oefenen tweede leerjaar"
- "leerapp Vlaanderen kinderen"
- "Bingel alternatief gamified"

## 6. Admin uitbreiding (klein)

Optionele tab in `AdminDashboard` om beta-aanmeldingen te zien (lijst + CSV export). Vraag onderaan of dit nu of later moet.

## 7. Bestanden

**Nieuw:**

- `src/screens/BetaLanding.tsx` — de one-pager
- `src/components/beta/BetaSignupForm.tsx` — herbruikbaar formulier
- `src/components/beta/BetaFAQ.tsx`
- `src/components/SEO.tsx` — herbruikbare helmet wrapper
- `public/sitemap.xml`
- DB migratie voor `beta_signups`

**Aangepast:**

- `src/routes/publicRoutes.tsx` — route toevoegen
- `index.html` — default meta tags + react-helmet-async setup
- `src/main.tsx` — `HelmetProvider`
- `package.json` — `react-helmet-async` toevoegen

## 8. Buiten scope (tenzij je vraagt)

- Email confirmatie / double opt-in (bvb via Resend)
- A/B testing varianten van de kop
- Analytics (Plausible/GA4)

---

## Vragen voor jou

1. **Wat moet `/` (de huidige Landing) doen?** Onveranderd laten, of redirect naar `/beta` tot na de launch? 
  1. Onveranderd.
2. **Email confirmatie nodig?** Wil je dat aanmelders een bevestigingsmail krijgen (via Resend connector) of houden we het puur op DB-opslag voor nu?  
1. Puur op DB opslag
3. **Admin-overzicht van beta-aanmeldingen meteen meeleveren** in deze iteratie, of later?  
Direct meenemen.