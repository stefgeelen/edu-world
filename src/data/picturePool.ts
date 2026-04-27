export type PictureCategory = 'dieren' | 'voertuigen' | 'eten' | 'natuur';

export interface PictureItem {
  word: string;
  imageUrl: string;
  category: PictureCategory;
}

/**
 * Curated word + image pool for the "Prent & Woord" reading exercise.
 * Each entry uses an Unsplash image cropped square for consistent rendering.
 */
export const PICTURE_POOL: PictureItem[] = [
  // Dieren
  { word: 'kat', category: 'dieren', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80' },
  { word: 'hond', category: 'dieren', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80' },
  { word: 'vis', category: 'dieren', imageUrl: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=600&q=80' },
  { word: 'koe', category: 'dieren', imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=600&q=80' },
  { word: 'paard', category: 'dieren', imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80' },
  { word: 'kip', category: 'dieren', imageUrl: 'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?auto=format&fit=crop&w=600&q=80' },
  { word: 'konijn', category: 'dieren', imageUrl: 'https://images.unsplash.com/photo-1535241749838-299277b6305f?auto=format&fit=crop&w=600&q=80' },

  // Voertuigen
  { word: 'auto', category: 'voertuigen', imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80' },
  { word: 'bus', category: 'voertuigen', imageUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80' },
  { word: 'fiets', category: 'voertuigen', imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80' },
  { word: 'trein', category: 'voertuigen', imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=80' },
  { word: 'boot', category: 'voertuigen', imageUrl: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=600&q=80' },
  { word: 'vliegtuig', category: 'voertuigen', imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80' },

  // Eten
  { word: 'appel', category: 'eten', imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=600&q=80' },
  { word: 'brood', category: 'eten', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
  { word: 'kaas', category: 'eten', imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80' },
  { word: 'ei', category: 'eten', imageUrl: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=600&q=80' },
  { word: 'banaan', category: 'eten', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80' },
  { word: 'taart', category: 'eten', imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80' },
  { word: 'pizza', category: 'eten', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },

  // Natuur
  { word: 'boom', category: 'natuur', imageUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80' },
  { word: 'bloem', category: 'natuur', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=80' },
  { word: 'zon', category: 'natuur', imageUrl: 'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?auto=format&fit=crop&w=600&q=80' },
  { word: 'maan', category: 'natuur', imageUrl: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=600&q=80' },
  { word: 'wolk', category: 'natuur', imageUrl: 'https://images.unsplash.com/photo-1532178324009-6b6adeca1741?auto=format&fit=crop&w=600&q=80' },
  { word: 'berg', category: 'natuur', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80' },
  { word: 'ster', category: 'natuur', imageUrl: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=600&q=80' },
];

export const CATEGORIES: PictureCategory[] = ['dieren', 'voertuigen', 'eten', 'natuur'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a question round.
 * - When mixed=false: pick `optionCount` words from a single random category.
 * - When mixed=true: pick `optionCount` words, each from a different category.
 * Returns the correct word + options (already shuffled).
 */
export function generatePictureRound(
  optionCount: 3 | 4,
  mixed: boolean,
  excludeWord?: string,
): { correct: PictureItem; options: PictureItem[] } {
  let pool: PictureItem[];

  if (mixed) {
    const cats = shuffle(CATEGORIES).slice(0, optionCount);
    pool = cats.map((c) => {
      const candidates = PICTURE_POOL.filter((p) => p.category === c && p.word !== excludeWord);
      return shuffle(candidates)[0];
    });
  } else {
    const cat = shuffle(CATEGORIES)[0];
    const candidates = PICTURE_POOL.filter((p) => p.category === cat && p.word !== excludeWord);
    pool = shuffle(candidates).slice(0, optionCount);
  }

  const correct = pool[Math.floor(Math.random() * pool.length)];
  return { correct, options: shuffle(pool) };
}
