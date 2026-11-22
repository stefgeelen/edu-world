# Flowkaart

De flows die in Leapio nooit mogen breken, wat er moet gebeuren, en welke test ze bewaakt. De QA-flow-agent (`.claude/agents/qa-flow.md`) houdt deze kaart bij; de complexiteitsbudgetten staan in `budgets.json`.

**Hoe het draait.** Na elke commit start `.githooks/post-commit` het script `scripts/qa-flow.sh`. Dat zet de lokale Supabase (Docker) terug op alle migraties + `supabase/seed.sql`, draait alle flowtests in een echte (mobiele) browser en stuurt een macOS-melding. Werkt er iets niet, of werd een flow complexer, dan zoekt de agent de oorzaak en schrijft `e2e/.results/rapport.md`. In GitHub draait dezelfde set bij elke push (`.github/workflows/flows.yml`).

**Met de hand.** `npm run test:flows` (alles, met reset) · `npx playwright test --ui` (meekijken) · `/qa-flow` in Claude Code · `/qa-flow verken ouderportaal` (verkennend klikken).

**Veiligheid.** De tests praten alleen met `127.0.0.1`: `e2e/support/localSupabase.ts` weigert elke andere Supabase-URL, en de browser blokkeert alles wat niet lokaal is. Productie is onbereikbaar.

**Wat telt als complex.** Per flow: tikken (knoppen die de gebruiker moet indrukken), velden (invullen) en schermen (verschillende URL's onderweg, redirects inbegrepen). Antwoorden in een oefening tellen niet. Boven het budget = waarschuwing "te complex"; meer dan bij de vorige groene run = waarschuwing "complexer geworden". De test faalt er niet op.

## Flows

| Flow (budget-sleutel) | Wie | Wat moet er gebeuren | Test |
|---|---|---|---|
| `onboarding` | nieuwe ouder | Account aanmaken → PIN kiezen en bevestigen → meldingen-vraag (overslaan) → kind toevoegen (6 jaar = 1ste leerjaar) → Buddy kiezen → Buddy-kamer. Kind en Buddy staan in de database. | `flows/onboarding.spec.ts` |
| — | ouder | Fout wachtwoord: foutmelding, blijft op `/toegang`. | `flows/onboarding.spec.ts` |
| — | terugkerende ouder | `/app` gaat meteen naar de Buddy-kamer (geen onboarding opnieuw). | `flows/onboarding.spec.ts` |
| `oefening-starten` | kind | Vanaf het openen van de app: Dashboard → Alle oefeningen → Sommen → de oefening staat open. | `flows/oefenen.spec.ts` |
| `oefening-afmaken` | kind | 5 juiste antwoorden → terug naar Alle oefeningen; Munten stijgen in de database én op het scherm; precies één poging bewaard. | `flows/oefenen.spec.ts` |
| `game-over` | kind | 3 fouten → terug; geen Munten, geen afgewerkte poging; wel één onvolledige poging (Aandachtspunten). | `flows/oefenen.spec.ts` |
| `ouderportaal` | ouder | Dashboard → Ouderportaal → PIN → "Mijn Kinderen" met het kind. | `flows/ouder.spec.ts` |
| — | ouder | Nieuw tabblad: het ouderportaal vraagt de PIN opnieuw. | `flows/ouder.spec.ts` |
| `wie-speelt-er` | gezin, 2 kinderen | Pakket Basis, tweede kind: de app opent op "Wie speelt er?", één tik → Buddy-kamer; het tweede kind (nog geen Buddy) gaat eerst naar de Buddy-keuze. | `flows/ouder.spec.ts` |

## Nog geen test

- Registratie dicht (wachtlijst): aanmelden met een adres dat niet op de lijst staat wordt geweigerd. Vraagt een globale schakelaar; moet apart van de andere tests draaien.
- Buddy verzorgen en de Winkel (Munten uitgeven).
- Wensen: een wens vervullen geeft +5.
- Ouderportaal: kind-detail (Aandachtspunten, Leerstof), beloningen instellen.
- Admin: Test/Live, registratie open/dicht, gebruikers.
- Schrijfoefeningen (canvas + handschriftherkenning via een edge function: lokaal niet beschikbaar).

## Bekende gaten in de lokale database

Gevonden bij de eerste run op een lege database (22 nov 2026): productie had gegevens die in geen enkele migratie stonden (ooit rechtstreeks in het dashboard aangemaakt).

- **Badges** (`public.badges`): zonder rijen faalde `complete_exercise` op een foreign key, dus geen Munten. Lokaal opgelost in `supabase/seed.sql` (uit `src/data/badges.ts`, identiek aan productie).
- **Oefeningencatalogus** (`public.exercises`): 32 rijen ontbraken, waaronder de hele 1ste-leerjaarreeks; een nieuw kind van 6 zag "Hier staan nog geen oefeningen". Opgelost met migratie `20261122150000_exercise_catalogue_backfill.sql` (overgenomen uit productie; voegt alleen toe wat ontbreekt, in productie 0 rijen).
- Wat nog verschilt met productie is alleen beheerstatus (Test/Live, actief), die de admin zet. Lokaal geldt de status uit de migraties.
