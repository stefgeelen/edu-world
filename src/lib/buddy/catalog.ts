export type CareActionId = "feed" | "play" | "sleep" | "medicine" | "wash";

export type CareItemCategory = "food" | "toy" | "sleep-comfort" | "medicine" | "hygiene";

export interface CareItem {
  id: string;
  name: string;
  category: CareItemCategory;
  price: number;
  /** Herstelkracht in Need-punten (voor slaapcomfort: versnelling in procent). */
  strength: number;
  emoji: string;
  description: string;
}

export const CARE_ACTIONS: Record<
  CareActionId,
  { label: string; category: CareItemCategory; need: string; emoji: string; color: string }
> = {
  feed: { label: "Voeren", category: "food", need: "hunger", emoji: "🍽️", color: "orange" },
  play: { label: "Spelen", category: "toy", need: "fun", emoji: "🎈", color: "pink" },
  sleep: { label: "Slapen", category: "sleep-comfort", need: "energy", emoji: "🌙", color: "purple" },
  medicine: { label: "Medicijn", category: "medicine", need: "health", emoji: "💊", color: "teal" },
  wash: { label: "Wassen", category: "hygiene", need: "hygiene", emoji: "🫧", color: "blue" },
};

export const CATEGORY_LABEL: Record<CareItemCategory, string> = {
  food: "Voedsel",
  toy: "Speelgoed",
  "sleep-comfort": "Slaapcomfort",
  medicine: "Medicijn",
  hygiene: "Hygiëne",
};

export const CARE_ITEMS: CareItem[] = [
  // Voedsel
  { id: "bes", name: "Bosbes", category: "food", price: 5, strength: 15, emoji: "🫐", description: "Een klein hapje tussendoor." },
  { id: "noot", name: "Hazelnoot", category: "food", price: 12, strength: 35, emoji: "🌰", description: "Stevig en voedzaam." },
  { id: "taart", name: "Feesttaart", category: "food", price: 25, strength: 70, emoji: "🍰", description: "Een compleet feestmaal." },
  // Speelgoed
  { id: "dennenappel", name: "Dennenappel", category: "toy", price: 5, strength: 15, emoji: "🌲", description: "Rollen en gooien maar." },
  { id: "bal", name: "Mosbal", category: "toy", price: 12, strength: 35, emoji: "⚽", description: "Samen overgooien." },
  { id: "vlieger", name: "Blaadjesvlieger", category: "toy", price: 25, strength: 70, emoji: "🪁", description: "Uren speelplezier." },
  // Slaapcomfort
  { id: "blad", name: "Blaadjesdeken", category: "sleep-comfort", price: 6, strength: 25, emoji: "🍃", description: "Rust 25% sneller klaar." },
  { id: "kussen", name: "Mospluk-kussen", category: "sleep-comfort", price: 14, strength: 50, emoji: "🛏️", description: "Rust 50% sneller klaar." },
  { id: "hangmat", name: "Sterrenhangmat", category: "sleep-comfort", price: 28, strength: 80, emoji: "✨", description: "Rust 80% sneller klaar." },
  // Medicijn
  { id: "kruid", name: "Kruidenthee", category: "medicine", price: 8, strength: 20, emoji: "🍵", description: "Zachte opkikker." },
  { id: "siroop", name: "Bosbessiroop", category: "medicine", price: 18, strength: 45, emoji: "🧴", description: "Werkt goed door." },
  { id: "toverdrank", name: "Fluisterdrank", category: "medicine", price: 32, strength: 80, emoji: "🧪", description: "Sterke bosmagie." },
  // Hygiëne
  { id: "doekje", name: "Bladdoekje", category: "hygiene", price: 5, strength: 15, emoji: "🍂", description: "Snel even afvegen." },
  { id: "zeep", name: "Beukenzeep", category: "hygiene", price: 12, strength: 35, emoji: "🧼", description: "Fris en schoon." },
  { id: "bad", name: "Bronbad", category: "hygiene", price: 25, strength: 70, emoji: "🛁", description: "Een heerlijk lang bad." },
];

export const itemsByCategory = (category: CareItemCategory) =>
  CARE_ITEMS.filter((i) => i.category === category);

export const getItem = (id: string) => CARE_ITEMS.find((i) => i.id === id);
