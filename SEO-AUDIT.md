# SEO Audit: Leapio

**Platform:** Flemish educational SaaS for children aged 6-8 (1ste & 2de leerjaar)
**Target audience for SEO:** Parents, teachers in Flanders/Belgium
**Curriculum:** Vlaamse leerplan (Flemish trimester system)
**Domain:** `leapio.lovable.app` (currently on Lovable subdomain)
**Audit date:** 2026-05-06

---

## 1. Technical SEO — Critical Issue

### Crawlability & Rendering
**The biggest problem:** This is a client-side rendered React SPA. Google can render JavaScript, but it requires a second pass through the rendering queue, which means:
- Delayed indexing (days to weeks)
- Unreliable crawl of dynamic content
- `SEO.tsx` injects meta tags via `useEffect` — by the time Googlebot's renderer fires, the initial HTML response contains only the Lovable placeholder tags from `index.html`

**What Googlebot sees on first fetch of `/`:**
```html
<title>Leapio Beta — Gamified Oefenen voor 1ste & 2de Leerjaar | Vlaanderen</title>
<meta property="og:description" content="Lovable Generated Project">
```
The Landing page (`/`) does **not use the SEO component at all** — no title, no description, no structured data are injected even after JS renders.

### index.html (line 7-31)
- `og:description`: **"Lovable Generated Project"** — placeholder left by the generator
- `og:title`: Generic "Leapio" — no keyword targeting
- `twitter:site`: **"@Lovable"** — not your account
- `twitter:description`: **"Lovable Generated Project"**
- `meta name="author"`: **"Lovable"** — should be your company
- Line 19: Literal `<!-- TODO: Update og:title -->` comment left in production HTML
- Missing: `og:url`, `og:locale`

### robots.txt
- No `Sitemap:` directive — search engines won't auto-discover the sitemap
- Allows crawling of `/app/*`, `/auth/*`, and every other route — these should be blocked (logged-in app content is not indexable)

### sitemap.xml
- Only 2 URLs (`/` and `/beta`)
- Hardcoded to `leapio.lovable.app` — will break when you move to your own domain
- Missing `<lastmod>` dates
- Homepage has priority 0.7, beta has 1.0 — homepage should be highest priority

### Canonical URLs
- No canonical tag in `index.html`
- BetaLanding sets canonical dynamically (`window.location.origin/beta`) — good, but depends on JS rendering
- Landing page has no canonical at all

### HTTPS & Domain
- Currently on `leapio.lovable.app` — a subdomain of Lovable's domain. You are building link equity and domain authority for Lovable, not for yourself. Moving to your own domain later means starting from zero.

### Recommendations
1. **Get your own domain immediately** (e.g., `leapio.be`) — every day on the Lovable subdomain is wasted SEO equity
2. Add a prerendering solution (e.g., `vite-plugin-prerender` or a service like Prerender.io) so crawlers get fully rendered HTML
3. Fix all placeholder meta tags in `index.html`
4. Add `Sitemap: https://yourdomain.be/sitemap.xml` to `robots.txt`
5. Add `Disallow: /app/` and `Disallow: /auth/` to `robots.txt`
6. Add `<link rel="canonical">` to `index.html`

---

## 2. On-Page SEO — Critical Issue

### Landing Page (`/`) — `src/screens/Landing.tsx`
**No SEO component is used.** This is your most important page and it has:
- No custom `<title>` — inherits the beta-focused title from `index.html`
- No meta description targeting parent/teacher keywords
- No canonical URL
- No structured data (no SoftwareApplication, no Organization, no Review schema)
- No JSON-LD at all

**Heading hierarchy:**
- H1 (line 207): "Maak van huiswerk een avontuur" — good emotional hook, but missing target keyword. Should include "leerapp" or "oefenplatform"
- H2 (line 303): "Alles wat je kind nodig heeft" — purely emotional, no keyword signal
- H2 (line 341): "In 3 stappen van start" — procedural, not keyword-targeted
- H2 (line 389): "Ouders & leerkrachten zijn enthousiast" — good audience signal
- H2 (line 436): "Klaar om leren leuk te maken?" — CTA, fine
- No H3 usage on landing page

**Content gaps:**
- No mention of "Vlaanderen", "Vlaams", "leerjaar", or "basisschool" on the landing page — the exact terms parents search for
- BetaLanding has all the Flemish-specific content; the main landing page is generic

### BetaLanding (`/beta`) — `src/screens/BetaLanding.tsx`
**This is actually the better-optimized page:**
- SEO component used correctly with title, description, canonical, OG image, JSON-LD
- Title: "Leapio Beta — Gamified Oefenen voor 1ste & 2de Leerjaar | Vlaanderen" — strong keyword coverage
- Description targets "gamified leerapp", "rekenen, lezen en schrijven", "Vlaamse 1ste en 2de leerjaar"
- 3 structured data blocks (SoftwareApplication, FAQPage, Organization)
- FAQ section with 6 questions targeting real user queries

### Image Alt Text
- Landing hero: `"Leapio gamified learning dashboard met badges en oefeningen"` — good but English-mixed
- Beta hero: `"Vlaams kind oefent rekenen en lezen op de Leapio leerapp"` — excellent, fully Dutch, keyword-rich

### Footer Links (Landing.tsx:463-466)
```html
<a href="#">Privacy</a>
<a href="#">Voorwaarden</a>
<a href="#">Contact</a>
```
All three point to `#` — dead links. Google sees these as broken internal links, and the missing privacy/terms pages are a trust signal failure.

### Recommendations
1. Add `<SEO>` to Landing page with proper title/description/structured data
2. Rework the H1 to include a target keyword: e.g., "Maak van huiswerk een avontuur met de slimste leerapp van Vlaanderen"
3. Add Flemish-specific copy to the landing page (curriculum alignment, leerjaar mentions)
4. Create real `/privacy`, `/voorwaarden`, and `/contact` pages and link to them
5. Add Review/AggregateRating schema to the testimonials section

---

## 3. Keyword Strategy — Needs Improvement

### Current Keyword Targeting
The BetaLanding targets well:
- "gamified oefenen"
- "1ste en 2de leerjaar"
- "Vlaanderen" / "Vlaams curriculum"
- "rekenen, lezen en schrijven"

The main Landing page targets almost nothing — it's generic SaaS copy that could be for any educational app in any country.

### Missing High-Value Keywords
Based on the Flemish market, these parent-intent keywords are not targeted anywhere:

| Keyword cluster | Search intent | Current coverage |
|---|---|---|
| "leerapp basisschool" / "educatieve app kinderen" | Transactional | Missing |
| "oefenen rekenen 1ste leerjaar" / "oefenen lezen 2de leerjaar" | Transactional | Missing (only in beta description) |
| "huiswerk app kinderen" | Transactional | Partially in H1 |
| "Vlaamse leerdoelen 1ste leerjaar" | Informational | Only in beta FAQ |
| "kind motiveren om te oefenen" | Informational | Not covered |
| "gamification onderwijs" | Informational | Not covered |
| "beste leerapp Vlaanderen" | Comparison | Not covered |
| "oefenplatform basisonderwijs" | Transactional | Not covered |
| "trimester oefeningen 1ste leerjaar" | Specific curriculum | Not covered |

### Curriculum Alignment
The platform targets the **Vlaamse leerplan** (Flemish curriculum). This is correctly stated in the beta page, but there are no dedicated pages for:
- Individual subjects (rekenen, lezen, schrijven)
- Individual grades (1ste leerjaar, 2de leerjaar)
- Trimester-specific content
- Specific exercise types (getallenkennis, kloklezen, splitsingen)

These subject/grade pages are the single biggest SEO opportunity — they capture long-tail traffic from parents searching for specific practice needs.

### Recommendations
1. Create subject landing pages: `/rekenen`, `/lezen`, `/schrijven`
2. Create grade-specific pages: `/1ste-leerjaar`, `/2de-leerjaar`
3. Add a `/curriculum` page explaining Vlaamse leerplan alignment
4. Start a blog targeting informational queries parents search for (see Content section)
5. Build keyword-targeted H1s and copy into all public pages

---

## 4. Content & E-E-A-T — Needs Improvement

### Experience
- 3 testimonials on landing page (parent x2, teacher x1) — a start but thin
- No case studies, no video testimonials, no school partnership showcases
- No "our story" or "built by a parent" narrative (if applicable) — E-E-A-T rewards first-person experience

### Expertise
- No pedagogy rationale anywhere — why gamification works, what research backs the approach
- No curriculum alignment details beyond a single FAQ answer
- No credentials or team bios
- No advisory board or educational consultant mentioned

### Authoritativeness
- Domain is `leapio.lovable.app` — zero domain authority, built on someone else's brand
- No press mentions, awards, or partnerships
- No `.be` domain signals Belgian market focus
- `meta name="author"` is "Lovable" — not your brand

### Trustworthiness
- **No privacy policy page** — critical for a children's platform under GDPR-K
- **No terms of service page** — footer links are dead (`href="#"`)
- No safeguarding statement
- No data security information (beyond a one-line FAQ mention)
- No cookie consent mechanism (even though there appear to be no cookies currently, the absence of the mechanism itself is a trust signal gap)

### Blog / Content Hub
**Does not exist.** There is no blog, no resource section, no informational content targeting parent/teacher queries. This is a major missed opportunity for:
- "Hoe motiveer ik mijn kind voor huiswerk?" (how do I motivate my child for homework)
- "Oefeningen rekenen 1ste leerjaar thuis" (math exercises grade 1 at home)
- "Schermtijd kinderen productief maken" (making kids' screen time productive)
- "Verschil 1ste leerjaar Nederland Vlaanderen" (differences in curriculum)

### Recommendations
1. Create a `/privacy` page compliant with GDPR-K and index it
2. Create a `/voorwaarden` (terms) page
3. Add an `/over-ons` (about us) page with team, mission, educational philosophy
4. Start a blog at `/blog` with 2-4 articles per month targeting parent queries
5. Add more testimonials — aim for 10+ with photos, school names where possible
6. Add a "Waarom gamification werkt" (why gamification works) content page with research citations

---

## 5. Local & Niche SEO — Needs Improvement

### Geographic Targeting
The platform explicitly targets **Flanders, Belgium**. This is correctly stated in BetaLanding copy, but:
- No `hreflang` tag (even a self-referencing `hreflang="nl-BE"` helps signal locale)
- No `og:locale` meta tag
- `manifest.json` uses `"lang": "nl"` instead of `"nl-BE"` — inconsistent with `index.html`'s `lang="nl-BE"`
- Sitemap URLs use `leapio.lovable.app` — not a `.be` domain

### EdTech Directory Presence
Not assessed (requires external checks), but the platform should be listed on:
- **Klascement** (Flemish teacher resource platform — this is the #1 priority for Flemish EdTech)
- **KlasCement-certificaat** if available
- Common Sense Education
- EdTech directories for Belgian/European markets

### Local Backlink Opportunities
- Flemish school networks (Katholiek Onderwijs Vlaanderen, GO! Onderwijs)
- Parent associations (ouderverenigingen)
- Belgian EdTech communities
- `.be` university education departments

### Recommendations
1. Register `leapio.be` and host the site there
2. Add `hreflang="nl-BE"` self-referencing tag
3. Add `og:locale` content `nl_BE`
4. Register on Klascement as a teacher resource
5. Pursue partnerships with Flemish school networks for `.be` backlinks

---

## 6. Backlink Profile — Critical Issue

### Current State
The site is on `leapio.lovable.app` — a subdomain of Lovable's domain. This means:
- **Any backlinks point to Lovable's domain**, not yours
- Domain authority is effectively zero
- You cannot build backlink equity until you have your own domain
- When you migrate, all existing backlinks (if any) would need 301 redirects from Lovable — which you likely can't control

This is the most urgent strategic issue in the entire audit.

### Recommendations
1. Move to your own domain before any link-building efforts
2. After migration, pursue links from: Flemish education blogs, parent communities (e.g., Flair, Libelle), teacher resource sites, school newsletters
3. Create linkable content assets (free printable worksheets, curriculum checklists) that teachers and parent bloggers would naturally link to

---

## 7. Competitor Benchmarking — Assessment

Direct competitors in the Flemish primary education space likely include:

| Competitor | Strengths to Watch |
|---|---|
| **Bingel** (VAN IN) | Dominant in Flemish schools, curriculum-aligned, school partnerships, massive `.be` DA |
| **Squla** | Strong SEO, subject/grade pages, blog content, parent testimonials, NL-focused but present in BE |
| **Rekentuin / Taalzee** | Game-based, widely used, dedicated per-subject SEO |
| **Gynzy / Prowise** | Teacher-facing tools with high `.be`/`.nl` authority |
| **Khan Academy Kids** | Global authority, free model, massive content library |

**What competitors do that Leapio doesn't:**
- Dedicated subject and grade-level landing pages
- Blog content targeting parent informational queries
- School partnership pages with logos/testimonials
- Curriculum alignment documentation
- Own domain with years of backlink equity
- Privacy/safeguarding pages prominently linked
- Directory listings on Klascement and similar platforms

---

## 8. Compliance & Risk — Critical Issue

### GDPR-K (Children's Data)
- **No privacy policy page exists** — this is a legal requirement before collecting any data from or about children
- The beta signup collects parent email addresses — requires explicit consent and privacy notice
- BetaLanding FAQ says "We verkopen geen data" — this is not a substitute for a GDPR-compliant privacy policy
- No Data Processing Agreement (DPA) information
- No age verification mechanism visible
- No cookie consent banner (currently no cookies detected, but Supabase auth uses localStorage which may have GDPR implications depending on interpretation)

### Google YMYL Signals
Education + children = higher E-E-A-T scrutiny. Currently:
- No author/company credentials
- No privacy policy (a direct quality signal for YMYL)
- No safeguarding statement
- "Lovable" branding in meta tags undermines authority

### Tracking Scripts
- **No analytics scripts detected** — this is actually good for privacy compliance but means you have zero visibility into traffic and conversions
- No third-party tracking pixels
- No retargeting scripts (good — retargeting around children's content is risky)

### Recommendations
1. Create and publish a GDPR-K compliant privacy policy **before launch** — this is non-negotiable
2. Add a Terms of Service page
3. Add a safeguarding/child protection statement
4. Implement privacy-friendly analytics (Plausible, Fathom, or self-hosted Matomo — all GDPR-compliant without cookie consent)
5. If you add Google Analytics, you'll need a cookie consent mechanism

---

## Top 10 Priority Actions

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| **1** | **Get your own domain (`leapio.be`)** and migrate off `leapio.lovable.app` | Critical — every day builds equity for Lovable, not you | Medium |
| **2** | **Create privacy policy, terms, and safeguarding pages** | Critical — legal requirement for children's platform, YMYL trust signal | Medium |
| **3** | **Add prerendering** so Googlebot sees fully rendered HTML with meta tags | Critical — without this, Google may index placeholder content | Medium |
| **4** | **Add `<SEO>` component to Landing page** with keyword-rich title, description, structured data | High — your homepage currently has zero on-page optimization | Low |
| **5** | **Fix `index.html` placeholders** — remove "Lovable Generated Project", update `@Lovable` references, remove TODO comment | High — these show in social shares and initial crawl | Low |
| **6** | **Create subject/grade landing pages** (`/rekenen`, `/lezen`, `/1ste-leerjaar`, etc.) | High — captures long-tail parent search traffic | Medium |
| **7** | **Fix `robots.txt`** — add Sitemap directive, disallow `/app/` and `/auth/` | Medium — prevents crawl waste, helps sitemap discovery | Low |
| **8** | **Expand sitemap** with all public pages and correct domain | Medium — proper crawl guidance | Low |
| **9** | **Implement privacy-friendly analytics** (Plausible/Fathom) | Medium — you need traffic data to iterate on SEO | Low |
| **10** | **Start a blog** targeting parent informational queries in Dutch | Medium-High — long-term organic traffic driver | High (ongoing) |

---

## Quick Wins (under 1 week)

1. **Fix `index.html` meta tags** — replace all "Lovable" references, update OG/Twitter descriptions, remove TODO comment (30 min)
2. **Add `<SEO>` to Landing page** with title "Leapio — Leerapp voor Rekenen, Lezen & Schrijven | 1ste & 2de Leerjaar Vlaanderen" (1 hour)
3. **Fix `robots.txt`** — add `Sitemap:` line, add `Disallow: /app/` and `Disallow: /auth/` (15 min)
4. **Update `sitemap.xml`** with correct domain and all public routes (30 min)
5. **Fix dead footer links** — create minimal `/privacy` and `/voorwaarden` placeholder pages (2-3 hours)
6. **Add `hreflang` and `og:locale`** to `index.html` (15 min)
7. **Add Review schema** to Landing testimonials section (1-2 hours)
8. **Fix `manifest.json`** `lang` from `"nl"` to `"nl-BE"` (5 min)

---

## Red Flags Needing Immediate Attention

1. **No privacy policy on a children's education platform** — this is a compliance blocker and a YMYL ranking risk. Do not launch publicly without one.
2. **Building on `leapio.lovable.app`** — you are investing effort into someone else's domain. Secure your own domain now.
3. **`og:description: "Lovable Generated Project"`** — if anyone shares your site on LinkedIn, Facebook, WhatsApp, or Slack right now, this is what appears. Fix today.
4. **Landing page has zero SEO** — your most important page has no custom title, description, structured data, or keyword targeting. The BetaLanding is better optimized than your homepage.
