# Map: Het 2de leerjaar openzetten

## Destination

Kinderen uit het 2de leerjaar kunnen Leapio gebruiken met oefeningen op hun niveau, per trimester (sep-dec, jan-mrt, apr-aug). Rekenen gaat eerst open; taal volgt in een tweede stap.

## Waar we vandaag staan (2026-10-13)

- Een kind in het 2de leerjaar is technisch al mogelijk: oefeninginstellingen, Buddy-groei (vormen 4–6) en het ouderportaal kennen het leerjaar.
- **Wat het tegenhoudt:** `MAX_SUPPORTED_GRADE = 1` (`src/data/difficultyConfig.ts`) zet elk nieuw kind in het 1ste leerjaar en blokkeert de knop "Volgend leerjaar" in het ouderportaal. Er zijn geen oefeningen voor leerjaar 2 in de `exercises`-tabel, dus `practice_menu` zou een lege lijst geven.
- Taal en Zinsdokter hebben al een proefreeks woorden/zinnen voor leerjaar 2 (niet nagekeken).

## Beslissingen (door Stef, 2026-10-13)

- **De ouder kiest het leerjaar.** Bij het aanmaken stelt de app het leerjaar voor op basis van de leeftijd; de ouder kan het aanpassen. Bestaande kinderen verplaatst de ouder in het ouderportaal.
- **Eerst rekenen.** Het 2de leerjaar gaat open met rekenoefeningen. Taal (Taal, Zinsdokter, Woordplaatjes, Klankhuis) volgt in een tweede stap.
- **Herhaling van het 1ste leerjaar mag.** Een kind uit het 2de leerjaar kan ook oefeningen van het 1ste leerjaar doen, als herhaling.
- **Leerstof: Claude stelt voor volgens de Vlaamse leerplannen, Stef keurt goed** voordat er iets gebouwd wordt.

## Leerstof rekenen (goedgekeurd door Stef, 2026-10-13)

| Trimester | Getallen | Optellen/aftrekken | Tafels | Geld |
|---|---|---|---|---|
| 1 (sep-dec) | tot 100: tientallen en eenheden, getallenlijn, vergelijken, even/oneven | herhaling tot 20 met brug | tafels van 2, 5, 10 | tot €20 |
| 2 (jan-mrt) | tot 100, even/oneven, dubbel/helft | tot 100 zonder brug (34 + 5, 34 + 20, 34 + 25) | + tafels van 3, 4; deeltafels van 2, 5, 10 | tot €50 |
| 3 (apr-aug) | tot 100 | tot 100 met brug (38 + 5, 52 − 7, 38 + 25) | alle tafels tot 10 + deeltafels | tot €100 |

- **De klok staat het hele 2de leerjaar alleen bij Herhalen** (hele en halve uren zoals in het 1ste leerjaar). Geen kwartieren in het 2de leerjaar.
- **Tafels: één tafel per keer.** Het kind oefent telkens één tafel (bv. "de tafel van 5"), niet alles door elkaar.
- **Buddy blijft zoals hij is.** De tijdelijke groeivormen volstaan voorlopig; geen nieuwe tekeningen voor deze stap.
- Typische oefeningen van het 1ste leerjaar (stippen tellen, objecten vergelijken, cijfers schrijven, klok) zitten bij Herhalen.

- **Tafels: het kind kiest zelf** welke tafel het oefent, uit de tafels die dit trimester open staan.
- **De app onthoudt welke tafels gekend zijn** en toont dat met een sticker per tafel. Ouders zien het ook in het ouderportaal.

## Bouwvolgorde

1. Bestaande rekenoefeningen instellen voor leerjaar 2 (getallen tot 100, geld), Rekensom met/zonder brug, nieuwe kleine oefening even/oneven.
2. Nieuwe oefening Tafels (tafel kiezen, maal- en deeltafels, stickers, ouderportaal).
3. Groep "Herhalen" in de oefenlijst met de oefeningen van het 1ste leerjaar.
4. Ouder kiest het leerjaar bij het aanmaken en in het ouderportaal; het slot op leerjaar 1 gaat open.

## Stap 1: gebouwd op 2026-10-13

- Rekenregels in `src/lib/mathQuestions.ts` (getest in `src/test/mathQuestionsGrade2.test.ts`). Rekensom heeft `bridge: 'with' | 'without'`, Getallenlijn heeft `steps` en `length`, en Splitsen werkt ook over het tiental (38 + 6).
- Vergelijken toont getallen boven de 20 als staven van tien en losse blokjes ("5 tientallen en 8 eenheden").
- Geld boven de €20 gebruikt duurdere spullen (step, boekentas …).
- Nieuwe oefening **Even of oneven** (`/exercises/even-odd`). Trimester 1: even/oneven tot 20 met paartjes. Trimester 2: ook dubbel en helft.
- De handschriftherkenning (`recognize-digit`) leest nu 0–100 in plaats van 1–10.
- De oefeningen van leerjaar 2 staan in `supabase/migrations/20261013120000_grade_2_maths.sql`. Dat is één rij per oefening per trimester; Vergelijken heeft er alleen een in trimester 1 en blijft daarna staan.
- Let op voor stap 3 (Herhalen): de app zoekt een oefening op route + leerjaar van het kind (`useExerciseId`, `useExerciseConfig`). Een oefening van het 1ste leerjaar openen als kind uit het 2de leerjaar vraagt dus dat de app weet welk leerjaar bedoeld is.

## Nog open

- Tekeningen per groeivorm van de Buddy (later).
- Taal voor het 2de leerjaar (stap 2).
