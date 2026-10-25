# Design systeem

De doorbladerbare versie (kleuren, lettertypes, componenten met voorbeeld, logo's en Buddy's) staat op claude.ai: **Leapio Design System**, https://claude.ai/artifact/W4C5xjjZq6AdSz4zZnwMRq. Dit bestand is de korte versie voor wie in de code werkt. Verandert de stijl, pas dan beide aan.

Leapio heeft drie looks. Kies eerst bij welke een scherm hoort en meng ze niet.

| Look | Schermen | Kleuren in de code | Lettertype |
|---|---|---|---|
| **Kinderapp** (sterrenhemel) | `/app/*` behalve het ouderportaal | vaste hexwaarden (zie hieronder) + Tailwind `amber`/`emerald`/`red` | Nunito (`style={{ fontFamily: "'Nunito', sans-serif" }}`); oefeningen: systeemlettertype via `font-sans` in `ExerciseShell` |
| **Ouder en admin** (licht) | `/app/parent/*`, `/admin/*` | Tailwind `slate`, `blue` (ouder), `indigo` (admin), `amber`/`rose` (meldingen) | systeemlettertype |
| **Website** | `Landing`, `BetaLanding`, `LegalPage`, `NotFound` | `lp-*` (`src/index.css`, `tailwind.config.ts`) | `font-lp-display` (Outfit) voor titels, `font-lp-body` (Figtree) |

Het oude palet `edu-*` staat nog in 4 bestanden (`BuddyRoom`, `BuddyShop`, `CarePanel`, `InstallPrompt`). Gebruik het niet in nieuw werk.

## Kinderapp

| Naam | Hex | Waarvoor |
|---|---|---|
| `app-night-top` | `#2d1b54` | bovenkant schermverloop, Wis-knop, sluitkruis |
| `app-night` | `#1a103c` | midden schermverloop, vitrine, onderbalk, tekstballon |
| `app-night-deep` | `#0a0618` | onderkant schermverloop |
| `app-vitrine-mid` | `#241650` | middenstop vitrine en tabbalk, dialogen |
| `app-well` | `#0f0828` (op 60%) | rij binnen een vitrine |
| `app-disabled` | `#1c1134` | uitgeschakelde knop, spoor voortgangsbalk |
| `app-line` | `#3b2d71` | randen; tekst van een uitgeschakelde knop |
| `app-line-strong` | `#4c3b82` | rand Wis-knop |
| `app-ink-muted` | `#9d8bce` | stille tekst, niet-actieve tab |
| `app-ink-soft` | `#c9bdf0` | tweede tekstregel |
| `app-violet` | `#a78bfa` | naam van de Buddy in de ballon |

Goud (`amber-400` → `orange-500`) betekent *hier ben je* of *beloning*: actieve tab, Munten, rand rond de Buddy. Groen (`emerald-500` → `emerald-600`) betekent *nakijken of doorgaan*.

Herbruik deze stukken in plaats van ze na te bouwen:

- Schermgrond: `bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618]` met `StarryBackground` (`src/components/dashboard/Vitrine.tsx`).
- Kaarten: `VITRINE`, `DARK_ROW`, `DARK_DIALOG` (`src/components/dashboard/vitrineStyles.ts`), `Ornaments`, `Payout`.
- Oefeningen: `ExerciseShell`, `ExercisePrompt`, `ExerciseActionBar`, `CheckButton` ("Controleer"), `ClearButton` ("Wis") (`src/components/exercise/ExerciseParts.tsx`).
- De Buddy die praat: `BuddyBubble`. Tabs: `TabBar`.

Maten: knoppen 48px hoog (`h-12`), `rounded-2xl` (16px) voor knoppen en rijen, `rounded-3xl` (24px) voor vitrines, randen `border-[3px]` (vitrine) en `border-2` (rij).

## Ouder en admin

Grond `bg-slate-50`, kaarten `bg-white border border-slate-200 rounded-2xl p-5 shadow-sm`. Titels `text-2xl font-black text-slate-900`, uitleg `text-sm font-medium text-slate-500`. Knoppen en tabs `rounded-xl`; actieve tab en hoofdknop blauw (`bg-blue-500`/`bg-blue-600`, wit). Admin gebruikt indigo (`indigo-600`, `indigo-50`). Meldingen: amber (`bg-amber-50 border-amber-200 text-amber-800`) voor aandacht, rose (`bg-rose-50 border-rose-200 text-rose-800`) voor ernstig. Geen sterrenhemel, goud of emoji.

Bekende contrastzwaktes, zo gelaten in de code: `text-slate-400` als tekst (2,6:1), witte tekst op `bg-blue-500` (3,7:1) en op `bg-amber-500` (2,1:1).

## Website

`bg-lp-night` en `bg-lp-cream` wisselen elkaar af. De hoofdknop is `GOLD_BUTTON` in `Landing.tsx`: gouden pil, tekst `lp-night`, harde schaduw `lp-gold-shadow`. Zorgbalken: Honger `lp-orange`, Plezier `lp-pink`, Energie `lp-violet`, Hygiëne `lp-blue`.

## Logo en Buddy's

Logo-bestanden en regels: `brand/leapio-logo/README.md`. Buddy-afbeeldingen: `src/assets/buddy/` (zes stemmingen per Buddy), via `BUDDY_SPECIES` in `src/lib/buddy/species.ts`.

## Tekst

Nederlands (Vlaams), *je* voor kind en ouder. Een opdracht is één zin zonder emoji (de Buddy leest ze voor). Vaste woorden: Controleer, Wis, Munten, Wens, Snel starten, Oefenen, Prijzenkast. Iconen: Lucide.
