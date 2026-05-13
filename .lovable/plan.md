# Rebrand: EduWorld → Leapio

Scope: replace every user-facing and internal reference to "EduWorld" with **"Leapio"** (capitalised), including domain placeholders and contact emails. Visual theme, colours, fonts, and all functionality stay unchanged — text only.

## What gets changed

### 1. Sitewide head & PWA shell

- `index.html` — `<title>`, meta description, `apple-mobile-web-app-title`, `og:title`, `twitter:title`.
- `public/manifest.json` — `name` ("Leapio - Leren is een avontuur") and `short_name` ("Leapio").
- `public/sitemap.xml` — replace `https://edu-world.lovable.app` with `https://leapio.lovable.app` (placeholder; see "Domain" below).

### 2. Public marketing pages

- `src/screens/BetaLanding.tsx` — wordmark, FAQ copy (4 mentions), hero alt text, JSON-LD `name` (×2), SEO title/description, footer brand, canonical URL fallback.
- `src/screens/Landing.tsx` — wordmark (header + footer), 4 body-copy mentions, image alt, copyright line.

### 3. App shell (kid-facing)

- `src/screens/Auth.tsx` — brand title.
- `src/screens/AvatarSelection.tsx` — "Welkom bij Leapio".
- `src/screens/AddChild.tsx` — onboarding copy.
- `src/components/InstallPrompt.tsx` — "Voeg Leapio toe!".

### 4. Parent & admin portals

- `src/screens/parent/ParentLayout.tsx` — header brand.
- `src/screens/parent/ParentFeedback.tsx` — 2 copy mentions.
- `src/screens/admin/AdminDashboard.tsx` — "Leapio Admin".

### 5. Contact email addresses

Currently two distinct addresses appear:

- `hallo@eduworld.be` → `hallo@leapio.be` (BetaLanding footer)
- `support@eduworld.app` → `support@leapio.app` (ParentErrorBoundary, ParentSubscription ×2)

I'll keep the two TLDs as-is and just swap the brand. If you want them unified (e.g. both on `leapio.be` or `leapio.app`), tell me which and I'll consolidate.

### 6. Domain references in source

All hard-coded `edu-world.lovable.app` strings → `leapio.lovable.app` placeholder:

- `src/screens/BetaLanding.tsx` (canonical fallback)
- `public/sitemap.xml` (×2 entries)

Note: this only updates the URLs *referenced* in code/sitemap. The actual deployed Lovable subdomain (and any custom domain) must be changed by you in **Project Settings → Domains** — I can't rename the subdomain. Once you've done that, tell me the final URL and I'll align the strings if `leapio.lovable.app` isn't right.

### 7. Internal docs

- `CLAUDE.md`, `EXERCISES.md`, `SEO-AUDIT.md`, `README.md`, `docs/technical-spec.md` — replace EduWorld with Leapio.
- `.claude/settings.json`, `.claude/settings.local.json` — leave untouched (tool config, not user-facing content).

### 8. Memory

Update `mem://index.md` Core line so future sessions refer to "Leapio" instead of "EduWorld".

## What does NOT change

- Database schema, table names, RPCs, edge function names.
- Visual theme ("Magische Fluisterbos"), colours, fonts.
- `manifest.json` icon files (`/icon-192.png`, `/icon-512.png`) — same images, just app name changes. If you want a new logo, that's a separate request.
- The actual deployed domain (you handle that in Project Settings).
- OG/Twitter preview image URL (still hosted on the existing R2 bucket; if you want a new branded preview image, say so).

## Open follow-ups (optional, ask only if you want them now)

- New Leapio logo/icon files.
- New OG preview image with the Leapio name.
- Custom domain `leapio.be` or `leapio.app` (requires DNS setup in Project Settings → Domains).

## Files touched (summary)

~20 files: 2 in `public/`, `index.html`, ~13 in `src/screens/**`, 2 in `src/components/**`, plus 5 docs and the memory index.  
