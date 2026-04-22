

# Studiebuddy & kindbetrokkenheid — implementatie

Ik implementeer voorstellen **1, 2, 3, 5 en 6** in één iteratie. #4 (buddy hernoemen) sla ik over.

## Wat de gebruiker krijgt

1. **Persoonlijke begroeting** op Dashboard, QuestMap en Badges met naam van het kind + tijdsgebonden variant ("Goedemorgen Lotte!").
2. **Persistente buddy-companion**: kleine avatar in een hoek van Dashboard, QuestMap en Badges. Tap → contextuele hint met idle-animatie.
3. **Buddy reageert op mijlpalen**: streak (3, 5, 7, 10 dagen), level-up, en eerste oefening van de dag → buddy-toast.
4. **"Mijn reis" kaartje** op Dashboard: aantal sterren, badges en favoriete vak met persoonlijke buddy-quote.
5. **Taaldetails**: knoppen, lege staten en loading-teksten gepersonaliseerd ("Start Lotte's avontuur", "Lotte, hier komen jouw badges!").

## Technische aanpak

**Nieuwe bestanden**
- `src/hooks/useChildGreeting.ts` — geeft `{ greeting, childName, buddyName, timeOfDay }` op basis van `useCurrentChild()` + `useGame()`.
- `src/components/BuddyCompanion.tsx` — kleine avatar (48–56px), props: `position` ('inline' | 'floating-tr' | 'floating-br')`, `situation`, `onTap?`. Hergebruikt `MOOD_AVATAR_ANIMATION` + idle-float. Tap toont `BuddyBubble` met bericht uit `useBuddyMessage`.
- `src/components/JourneyCard.tsx` — Dashboard-kaartje met sterren-, badge- en favoriet-vak-stats (uit `useChildProgress`).

**Uitbreidingen**
- `src/data/buddyMessages.ts` — nieuwe situaties per avatar (3-4 varianten elk):
  - `dashboard_welcome`, `quest_map_idle`, `badges_overview`
  - `streak_milestone`, `level_up`, `first_exercise_of_day`
  - Ondersteuning voor `{name}` placeholder.
- `src/hooks/useBuddyMessage.ts` — placeholder-vervanging (`{name}` → kindnaam) bij het ophalen van een bericht.
- `src/context/CelebrationContext.tsx` (of `useCompleteExercise`) — trigger buddy-toast bij level-up en streak-milestones (3/5/7/10/14/30).

**Aangepaste schermen**
- `src/screens/Dashboard.tsx` — header gebruikt `useChildGreeting`, voegt inline `BuddyCompanion` + `JourneyCard` toe; CTA-tekst "Start [naam]'s avontuur".
- `src/screens/QuestMap.tsx` — floating `BuddyCompanion` (rechtsboven, onder safe area) met `quest_map_idle` situatie.
- `src/screens/BadgeOverview.tsx` — gepersonaliseerde header + `BuddyCompanion` inline; lege state met naam.

**Geen DB-wijzigingen.** Alle data (naam, avatar, streak, level, sterren, badges) is al beschikbaar via bestaande hooks.

## Bestand-impact

Nieuw (3): `useChildGreeting.ts`, `BuddyCompanion.tsx`, `JourneyCard.tsx`
Aangepast (6): `buddyMessages.ts`, `useBuddyMessage.ts`, `CelebrationContext.tsx`, `Dashboard.tsx`, `QuestMap.tsx`, `BadgeOverview.tsx`

