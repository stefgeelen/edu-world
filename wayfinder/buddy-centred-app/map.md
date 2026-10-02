# Map: De Buddy als middelpunt van de app

## Destination

Het verzorgen van de Buddy is het spel, en oefeningen maken is hoe je voor hem zorgt. Er is één lus: oefeningen → Munten → verzorgen, en daarnaast groeit de Buddy mee door de schooljaren. Gebouwd in oktober 2026 (migratie `20261001120000_buddy_centred_practice.sql`).

## Waarom

De app had twee spellen naast elkaar: groeien (XP, levels, daily quests, badges, kaart) en verzorgen (Needs, Munten, winkel). Een kind van 6 kreeg twee munten, twee redenen om te oefenen en vier tabs. De kaart vertraagde de weg naar een oefening.

## Beslissingen (door Stef, brainstorm 2026-10-01)

- **Startscherm = de kamer van de Buddy.** Geen kaart. (Eerst ook zonder tabbalk — op 2026-10-02 bijgestuurd naar twee tabs, zie hieronder.)
- **Het kind kiest altijd zelf** een oefening, uit één lijst per type oefening.
- **Herhaling per type oefening** levert minder Munten op: 8, 8, 4, 2, 1, 1… Elke dag begint het opnieuw. Geen harde limiet: de sturing gaat via beloning. De Buddy zegt "Ken ik al!".
- **Wensen van de Buddy** vervangen de daily quests: tot 3 types per dag, +5 Munten de eerste keer vandaag.
- **Evolutie op vaste momenten**: een nieuwe vorm per leerjaar, een kleine verandering per trimester (sep-dec, jan-mrt, apr-aug). Verzorging heeft **geen** invloed: elke Buddy evolueert hetzelfde.
- **XP, levels en streak verdwijnen** uit het zicht van het kind. De streak leeft verder als badge ("Vijf Dagen Trouw").
- **Beloningen van ouders blijven** en tellen het aantal oefeningen. **Herhaalde oefeningen tellen voluit mee**, ook al levert herhaling minder Munten op. Bewust geaccepteerd: een kind dat voor de beloning werkt, kan bij één type blijven.
- **Het kind ziet de teller van zijn beloning** op het dashboard ("Nog 12 rekenoefeningen tot: IJsje").
- **Het kind ziet geen voortgang in de leerstof.** Dat blijft in het ouderportaal.

## Bijgestuurd op 2026-10-02

Na het testen vond Stef de opzet zonder tabs te rommelig. Terug naar **twee tabs**:
- **Tab 1 — Buddy** (de app opent hier): de kamer van de Buddy, verzorgen, winkel, groei.
- **Tab 2 — Dashboard** in de oude donkere sterrenstijl: snel naar een oefening springen ("Snel starten", wensen eerst) of naar de lijst met alle oefeningen, plus de wensen van de Buddy, de trofeeënkamer en de beloningen.
- De lijst met alle oefeningen en de prijzenkast staan ook in die donkere stijl.
- Na een oefening kom je terug op het dashboard.

De andere beslissingen hierboven (geen kaart, geen XP voor het kind, herhaling, wensen, groei) blijven gelden.

## Technische keuzes (zelf beslist)

- Alles wat Munten waard is, beslist de server: `practice_menu` (kiesbare oefeningen, uitbetaling per type, Wensen) en `complete_exercise`. De client toont het alleen, zodat getoonde en verdiende Munten nooit verschillen.
- Het openzetten van trimesters (5× elke oefening van het vorige, of een ouder die het opent) is van de browser naar de server verhuisd (`_child_practice_options`).
- Wensen worden één keer per dag gekozen en bewaard op `buddy_states`, zodat ze de hele dag hetzelfde blijven.
- Groei wordt bewaard (`buddy_states.growth_stage`) omdat hij binnen een leerjaar niet terug mag springen (september, voordat een ouder het leerjaar verhoogt).
- XP/level/streak-kolommen blijven bestaan: het ouderportaal en de badges rekenen ermee, en de app die live staat moest blijven werken tijdens de overgang.

## Nog open

- **Tekeningen per groeivorm.** Er is één Buddy-tekening per stemming. Een vorm is voorlopig grootte + accessoire-emoji (`src/lib/buddy/growth.ts`). Echte tekeningen per leerjaar horen daar.
- **Promotie naar het volgende leerjaar** gebeurt nog via XP-trimesters en een ouder die het leerjaar aanpast. Met vaste groeimomenten ligt het voor de hand dat ook dat kalendergebonden wordt — niet beslist.
- **Opruimen**: de XP/level-kolommen en de trimester-XP kunnen weg zodra het ouderportaal er niet meer op steunt.
