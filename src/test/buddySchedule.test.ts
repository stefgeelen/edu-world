import { describe, it, expect } from 'vitest';
import { elapsedWindows, isCareWindowOpen, isNightTime } from '@/lib/buddy/schedule';

/**
 * Het Care Window bepaalt welke verstreken tijd de Buddy iets kost. Klopt dit
 * rooster niet, dan vervalt een Buddy 's nachts of in het weekend alsnog door —
 * precies het probleem dat dit venster moest oplossen. De server rekent met
 * hetzelfde rooster in supabase/migrations/20260914120000_buddy_care_window.sql.
 *
 * Alle timestamps hieronder staan in UTC; Europe/Amsterdam loopt in de winter
 * een uur voor en in de zomer twee.
 */

const utc = (y: number, m: number, d: number, h: number, min = 0) => Date.UTC(y, m - 1, d, h, min);

describe('elapsedWindows — actieve uren', () => {
  it('telt een schooldag overdag volledig als actieve tijd', () => {
    // Donderdag 1 januari 2026, 09:00 -> 13:00 lokaal.
    expect(elapsedWindows(utc(2026, 1, 1, 8), utc(2026, 1, 1, 12))).toEqual({
      activeH: 4,
      nightH: 0,
    });
  });

  it('telt een volle schooldag als twaalf actieve uren', () => {
    // Donderdag 07:00 -> 19:00 lokaal.
    expect(elapsedWindows(utc(2026, 1, 1, 6), utc(2026, 1, 1, 18)).activeH).toBe(12);
  });

  it('knipt de randen van het venster af', () => {
    // Donderdag 05:00 -> 21:00 lokaal: alleen 07:00-19:00 telt.
    expect(elapsedWindows(utc(2026, 1, 1, 4), utc(2026, 1, 1, 20)).activeH).toBe(12);
  });

  it('telt een volle schoolweek als zestig actieve uren', () => {
    // Maandag 5 januari 07:00 -> zaterdag 10 januari 07:00 lokaal.
    expect(elapsedWindows(utc(2026, 1, 5, 6), utc(2026, 1, 10, 6)).activeH).toBe(60);
  });
});

describe('elapsedWindows — gratis uren', () => {
  it('rekent de nacht als slaaptijd, niet als actieve tijd', () => {
    // Donderdag 21:00 -> vrijdag 06:00 lokaal.
    expect(elapsedWindows(utc(2026, 1, 1, 20), utc(2026, 1, 2, 5))).toEqual({
      activeH: 0,
      nightH: 9,
    });
  });

  it('laat een weekenddag overdag voor geen van beide tellen', () => {
    // Zaterdag 3 januari, 10:00 -> 17:00 lokaal.
    expect(elapsedWindows(utc(2026, 1, 3, 9), utc(2026, 1, 3, 16))).toEqual({
      activeH: 0,
      nightH: 0,
    });
  });

  it('kost een heel weekend maar één actief uur', () => {
    // Vrijdag 18:00 -> maandag 07:00 lokaal: alleen het laatste schooluur van
    // vrijdag telt, de drie nachten laden Energie op.
    expect(elapsedWindows(utc(2026, 1, 2, 17), utc(2026, 1, 5, 6))).toEqual({
      activeH: 1,
      nightH: 36,
    });
  });
});

describe('elapsedWindows — randgevallen', () => {
  it('geeft nul terug als er geen tijd verstreken is of de klok terugliep', () => {
    expect(elapsedWindows(utc(2026, 1, 1, 12), utc(2026, 1, 1, 12))).toEqual({ activeH: 0, nightH: 0 });
    expect(elapsedWindows(utc(2026, 1, 1, 12), utc(2026, 1, 1, 10))).toEqual({ activeH: 0, nightH: 0 });
  });

  it('volgt de zomertijdsprong in plaats van blind 24 uur per dag te rekenen', () => {
    // Zaterdag 28 maart 12:00 CET -> maandag 30 maart 12:00 CEST. In de nacht
    // van zaterdag op zondag verdwijnt een uur, dus het weekend levert 23
    // nachturen op in plaats van 24.
    expect(elapsedWindows(utc(2026, 3, 28, 11), utc(2026, 3, 30, 10))).toEqual({
      activeH: 5,
      nightH: 23,
    });
  });

  it('kapt een absurd lang gat af op 400 dagen', () => {
    const to = utc(2026, 1, 1, 12);
    const tenYears = to - 3650 * 86_400_000;

    expect(elapsedWindows(tenYears, to).activeH).toBeLessThan(400 * 12);
  });
});

describe('isNightTime / isCareWindowOpen', () => {
  it('slaapt van 19:00 tot 07:00 lokale tijd', () => {
    expect(isNightTime(utc(2026, 1, 1, 20))).toBe(true); // 21:00 lokaal
    expect(isNightTime(utc(2026, 1, 1, 18))).toBe(true); // 19:00 lokaal, net welterusten
    expect(isNightTime(utc(2026, 1, 1, 5))).toBe(true); // 06:00 lokaal
    expect(isNightTime(utc(2026, 1, 1, 6))).toBe(false); // 07:00 lokaal, net wakker
    expect(isNightTime(utc(2026, 1, 1, 12))).toBe(false); // 13:00 lokaal
  });

  it('opent het Care Window alleen op schooldagen overdag', () => {
    expect(isCareWindowOpen(utc(2026, 1, 1, 12))).toBe(true); // donderdagmiddag
    expect(isCareWindowOpen(utc(2026, 1, 3, 12))).toBe(false); // zaterdagmiddag
    expect(isCareWindowOpen(utc(2026, 1, 4, 12))).toBe(false); // zondagmiddag
    expect(isCareWindowOpen(utc(2026, 1, 1, 21))).toBe(false); // donderdagnacht
  });
});
