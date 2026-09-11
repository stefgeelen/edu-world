# Leapio

A gamified, Dutch-language learning app where children complete exercises to progress through school subjects, set in the "Magische Fluisterbos" (magical whispering forest) world.

## Language

**Avatar**:
The cosmetic character type a child picks during onboarding (e.g. Fia, Delta, Milo, Cog, Ollie), each tied to one school subject. Purely a skin/identity choice, stored once per child.
_Avoid_: Buddy (when referring to the character type/catalog itself), character

**Buddy**:
The child's own Avatar instance in its companion/care role — the thing the child feeds, plays with, puts to bed, and receives motivational messages from. One per child, skinned by their chosen Avatar.
_Avoid_: Pet, companion, avatar (when meaning the interactive care-mechanic entity, not the cosmetic pick)

**Need**:
An internal Buddy stat that decays over time and is restored by a specific Care Action. The five Needs are Hunger, Fun, Energy, Hygiene, and Health.
_Avoid_: Stat, meter

**Care Action**:
One of the five actions a child performs on their Buddy: Feed, Play, Sleep, Medicine, Wash.
_Avoid_: Interaction, activity

**Health**:
The Need that reflects overall neglect. It does not decay on its own independent timer; it drops only as a consequence of Hunger, Fun, Energy, or Hygiene staying critical for too long.
_Avoid_: HP, life

**Eikel** (pl. Eikels):
The currency earned by completing exercises (alongside XP) and spent in the Shop on Care Items. Named for Leapio's existing "Magische Fluisterbos" forest setting; distinct from XP, niveau, streak, sterren, and beloningen, which already mean other things in the app.
_Avoid_: Punt/punten (points), munt (coin) — Eikel is the canonical term

**Care Item**:
A single-use, consumable object bought with Eikels and spent on one Care Action. Each of the five categories (Food, Toy, Sleep-comfort, Medicine, Hygiene) has a fixed catalog of exactly three items at different strengths. Feed, Play, Medicine, and Wash each strictly require spending a Care Item; Sleep is the exception — it always works for free at a normal recovery rate, and a Sleep-comfort item, if spent, only makes that same rest complete faster.
_Avoid_: Reward, prize (already used for the parent-defined `rewards` goal system, a different concept)

**Illness**:
The Buddy's state once Health bottoms out from sustained neglect. Cured instantly by the Medicine Care Action.
_Avoid_: Sickness (fine informally, but Illness is the canonical term)

**Death**:
The end-state reached when Health stays at zero for a sustained period. Reversible only by a parent using Revival in the Parent Portal, which partially (not fully) restores Needs. Never blocks the child's exercises, XP, or Eikels earning.
_Avoid_: Game over

**Buddy Room**:
The dedicated screen (separate from Dashboard) showing Need status and the five Care Actions, with the Shop reachable from inside it as its own screen.
_Avoid_: Habitat, pet screen
