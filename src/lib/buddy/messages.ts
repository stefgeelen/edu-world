import type { BuddyCue, BuddyMood } from "./state";
import type { CareActionId } from "./catalog";

const MESSAGES: Record<BuddyMood, string[]> = {
  happy: [
    "Wat fijn dat je er bent! Zullen we spelen?",
    "Ik voel me kiplekker vandaag!",
    "Jij zorgt supergoed voor me.",
  ],
  neutral: [
    "Hoi! Wil je even bij me blijven?",
    "Ik heb wel zin in iets lekkers.",
    "Alles gaat oké hier.",
  ],
  sad: [
    "Ik voel me niet zo blij... help je me?",
    "Mijn buikje knort en ik ben moe.",
    "Een beetje aandacht zou fijn zijn.",
  ],
  ill: ["Ik ben ziek geworden... geef me alsjeblieft medicijn.", "Brr, ik voel me echt niet goed."],
  sleeping: ["Zzz... ik droom van munten.", "Sst, ik slaap lekker."],
  gone: ["Je Buddy heeft rust nodig. Een ouder kan helpen."],
};

/** Berichten die horen bij één kritieke Need. */
const CUE_MESSAGES: Partial<Record<BuddyCue, string[]>> = {
  hunger: ["Mijn buik knort... heb je iets te eten?", "Mijn bordje is helemaal leeg!"],
  fun: ["Ik verveel me zó... spelen we iets?", "Mijn speeltje ligt al de hele dag stil."],
  energy: ["Ik ben zó moe... mag ik even slapen?", "Mijn oogjes vallen bijna dicht."],
  hygiene: ["Ik voel me plakkerig, ik wil in bad!", "Jeuk! Er vliegen vliegjes om me heen."],
};

/** Zinnetje tijdens de animatie van een Care Action. */
const CARE_ACTION_MESSAGES: Record<CareActionId, string> = {
  feed: "Mmm, lekker!",
  play: "Joepie, spelen!",
  sleep: "Welterusten...",
  medicine: "Pfff, ik voel me beter!",
  wash: "Lekker fris!",
};

export function careActionMessage(action: CareActionId) {
  return CARE_ACTION_MESSAGES[action];
}

export function buddyMessage(mood: BuddyMood, seed = 0, cue?: BuddyCue) {
  const cueList = cue ? CUE_MESSAGES[cue] : undefined;
  const list = cueList ?? MESSAGES[mood];
  return list[seed % list.length];
}
