#!/usr/bin/env node
/**
 * Zet opnames van klanken (public/klanken/<klank>.m4a) om naar de mp3 die de
 * app afspeelt (public/klanken/<klank>.mp3).
 *
 * Per opname: enkel de klank zelf (het luidste stuk; adem en klikjes ervoor
 * en erna vallen weg), mono 44,1 kHz, even luid als de andere klanken
 * (gemiddeld -17,5 dB, piek hoogstens -0,5 dB), met een korte in- en uitfade.
 *
 *   node scripts/klanken.mjs          # alle .m4a
 *   node scripts/klanken.mjs s aa     # enkel s.m4a en aa.m4a
 *
 * Vraagt ffmpeg (brew install ffmpeg). Daarna de klank toevoegen aan
 * RECORDED_SOUNDS in src/data/letterSounds.ts.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', 'public', 'klanken');
const TARGET_MEAN = -17.5;
const MAX_PEAK = -0.5;
const PAD_BEFORE = 0.04;
const PAD_AFTER = 0.08;

const stderr = (args) => spawnSync('ffmpeg', ['-hide_banner', ...args, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;

function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));
}

/** Stukken geluid boven -35 dB, als [begin, einde] in seconden. */
function segments(file) {
  const total = duration(file);
  const log = stderr(['-i', file, '-af', 'silencedetect=n=-35dB:d=0.08']);
  const out = [];
  let from = 0;
  for (const [, kind, at] of log.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (kind === 'start') { if (Number(at) - from > 0.02) out.push([from, Number(at)]); }
    else from = Number(at);
  }
  if (total - from > 0.02) out.push([from, total]);
  return { total, out };
}

function levels(file, from, to) {
  const log = stderr(['-ss', String(from), '-to', String(to), '-i', file, '-af', 'volumedetect']);
  // Geen meting (een stukje van enkele samples): telt als stil.
  const read = (key) => Number(log.match(new RegExp(`${key}: (-?[\\d.]+)`))?.[1] ?? -Infinity);
  return { mean: read('mean_volume'), max: read('max_volume') };
}

const wanted = process.argv.slice(2);
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.m4a'))
  .filter((f) => wanted.length === 0 || wanted.includes(f.replace(/\.m4a$/, '')));

const tmp = mkdtempSync(join(tmpdir(), 'klanken-'));
for (const name of files) {
  const src = join(DIR, name);
  const { total, out } = segments(src);
  if (out.length === 0) { console.error(`${name}: geen klank gevonden, overgeslagen`); continue; }

  // De klank is het stuk met de meeste energie (lengte × luidheid).
  const scored = out.map(([a, b]) => {
    const { mean } = levels(src, a, b);
    return { a, b, energy: (b - a) * 10 ** (mean / 10) };
  });
  const main = scored.reduce((best, s) => (s.energy > best.energy ? s : best));
  const from = Math.max(0, main.a - PAD_BEFORE);
  const to = Math.min(total, main.b + PAD_AFTER);

  // Eerst knippen en naar mono, dan pas meten: een stereo-opname klinkt in
  // mono anders luid dan de meting op twee kanalen zegt.
  const length = to - from;
  const fade = `afade=t=in:d=0.01,afade=t=out:st=${(length - 0.03).toFixed(3)}:d=0.03`;
  const cut = join(tmp, name.replace(/\.m4a$/, '.wav'));
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', src,
    '-af', fade, '-ac', '1', '-ar', '44100', cut,
  ]);
  const { mean, max } = levels(cut, 0, length);
  const gain = Math.min(TARGET_MEAN - mean, MAX_PEAK - max);

  const dest = join(DIR, name.replace(/\.m4a$/, '.mp3'));
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', cut, '-af', `volume=${gain.toFixed(2)}dB`,
    '-c:a', 'libmp3lame', '-q:a', '2', dest,
  ]);
  console.log(`${name} → ${name.replace(/\.m4a$/, '.mp3')}  ${from.toFixed(2)}–${to.toFixed(2)} s, ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB`);
}
rmSync(tmp, { recursive: true, force: true });
