/** Deterministic 32-bit string hash (djb2-style), for turning a string key into a PRNG seed. */
export function hashStringToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** mulberry32 PRNG — given a seed, returns a function that yields floats in [0, 1) deterministically on each call. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: build a ready-to-use seeded RNG directly from a string key. */
export function createSeededRng(seedKey: string): () => number {
  return mulberry32(hashStringToSeed(seedKey));
}

/** Deterministically picks one element from `items` using `rng()`. */
export function pickSeeded<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}
