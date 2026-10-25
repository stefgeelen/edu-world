#!/usr/bin/env node
/**
 * Monteert de gameplay-Reel uit de schermopnames in marketing/gameplay en een
 * voice-over (ElevenLabs-mp3, alle zinnen na elkaar met korte pauzes).
 *
 *   node scripts/gameplay-reel.mjs <voice-over.mp3> [uit.mp4]
 *
 * De voice-over wordt op de stiltes in zinnen geknipt; elke zin hoort bij een
 * shot (zie SHOTS, `vo`). Er moeten er precies VO_LINES zijn: staan er meer
 * pauzes in, dan worden de kortste pauzes samengevoegd.
 *
 * Elke opname wordt bijgesneden (zonder statusbalk), in een gsm-kader op de
 * nachtlucht van Leapio gezet, met een korte tekst erboven. De naam van het
 * kind op het dashboard wordt vervangen door een verzonnen naam.
 * Vraagt ffmpeg (brew install ffmpeg) en Playwright WebKit.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLIPS = join(ROOT, 'marketing/gameplay');
const W = 1080, H = 1920, FPS = 30;
const STATUS_BAR = 186; // pixels bovenaan de opname (klok, batterij) die wegvallen
const SRC_W = 1206, SRC_H = 2622;
const PHONE = { x: 180, y: 330, w: 720, h: 1454 }; // het scherm in beeld
const FAKE_NAME = 'Lotte!';

const clip = name => join(CLIPS, `ScreenRecording_10-20-2026 ${name}_1.MP4`);

/** Volgorde van de Reel. vo = welke zin van de voice-over, voAt = wanneer (s). */
const SHOTS = [
  { src: '22-58-04', start: 6.0, dur: 2.8, caption: 'POV: je kind vraagt zelf om te oefenen', vo: 0, voAt: 0.3 },
  { src: '22-58-04', start: 9.0, dur: 2.8, caption: 'Je kind zorgt voor een eigen Buddy', vo: 1, voAt: 0.2 },
  { src: '22-59-02', start: 5.5, dur: 3.5, caption: 'Het kiest zelf een oefening', vo: 2, voAt: 0.3, hideName: true },
  { src: '22-59-02', start: 10.8, dur: 3.5, caption: 'Tellen en vergelijken', vo: 3, voAt: 1.1, app: 0.6 },
  { src: '23-02-41', start: 1.5, dur: 7.0, caption: 'Sommen maken', app: 0.6 },
  { src: '23-02-41', start: 19.4, dur: 1.6, caption: 'Elke oefening levert munten op', app: 0.6 },
  // De echte uitleg van Vosje in de app loopt van 3,9 tot 12,8 s in de opname: volledig laten horen.
  { src: '23-03-24', start: 2.9, dur: 10.2, caption: 'Vast? De Buddy legt het uit', vo: 4, voAt: 0, app: 1.0, appSpeechAt: 1.0, ring: true },
  { src: '23-03-24', start: 16.0, dur: 4.5, caption: 'Vast? De Buddy legt het uit', app: 0.6 },
  { src: '23-04-13', start: 25.5, dur: 5.8, caption: 'Met munten zorgt je kind voor de Buddy', vo: 5, voAt: 0.3, app: 0.5 },
  // Vosje krijgt de thee: ingezoomd op de Buddy in zijn kamer.
  { src: '23-04-13', start: 31.3, dur: 4.0, caption: 'Met munten zorgt je kind voor de Buddy', app: 0.8, zoom: { x: 200, y: 300, w: 806 } },
  { src: '23-05-26', start: 6.5, dur: 3.5, caption: 'Jij ziet waar je kind hulp nodig heeft' },
];
const VO_LINES = 6;
const END_CARD = 3.0;

// Naam in de begroeting op het dashboard, in pixels van de bijgesneden opname.
const NAME_BOX = { x: 262, y: 190, w: 300, h: 70 };
// De Buddy rechtsboven in een oefening, in pixels van het eindbeeld.
const RING = { cx: 813, cy: 430, r: 70 };

const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });

/** Zinnen in de voice-over: [start, einde] in seconden. */
function voiceLines(audio) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', audio, '-af', 'silencedetect=n=-38dB:d=0.3', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]).toString());
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => Number(m[1]));
  // Spraak = tussen het einde van een stilte en het begin van de volgende.
  let speech = [];
  let cursor = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] > cursor + 0.05) speech.push([cursor, starts[i]]);
    cursor = ends[i] ?? duration;
  }
  if (cursor < duration - 0.05) speech.push([cursor, duration]);
  speech = speech.filter(([a, b]) => b - a > 0.15);
  while (speech.length > VO_LINES) {
    let best = 0;
    for (let i = 1; i < speech.length - 1; i++) {
      if (speech[i + 1][0] - speech[i][1] < speech[best + 1][0] - speech[best][1]) best = i;
    }
    speech.splice(best, 2, [speech[best][0], speech[best + 1][1]]);
  }
  if (speech.length < VO_LINES) {
    throw new Error(`De voice-over heeft ${speech.length} zinnen, ik verwacht er ${VO_LINES}. Laat tussen elke zin een korte pauze.`);
  }
  return speech.map(([a, b]) => [Math.max(0, a - 0.05), b + 0.08]);
}

const sky = (seed, extra = '') => {
  let s = seed;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const stars = Array.from({ length: 60 }, (_, i) => {
    const big = i % 9 === 0;
    const st = big ? 'width:9px;height:9px;background:#fde68a;opacity:.85;box-shadow:0 0 14px #fde68a' : 'width:6px;height:6px;background:#fff;opacity:.5';
    return `<i style="position:absolute;border-radius:50%;${st};left:${(r() * 100).toFixed(1)}%;top:${(r() * H * 0.9).toFixed(0)}px"></i>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; position: relative; font-family: 'Nunito', sans-serif; color: #fff;
    background: radial-gradient(ellipse 70% 40% at 50% 50%, rgba(253,230,138,.14), transparent 70%),
                linear-gradient(180deg, #3f2a7a 0%, #241650 55%, #120b2b 100%); }
  .cap { position: absolute; top: 70px; left: 50px; right: 50px; height: 230px; display: flex; align-items: center; justify-content: center;
    text-align: center; font-weight: 900; font-size: 66px; line-height: 1.08; text-shadow: 0 4px 18px rgba(0,0,0,.45); }
  .bezel { position: absolute; left: ${PHONE.x - 14}px; top: ${PHONE.y - 14}px; width: ${PHONE.w + 28}px; height: ${PHONE.h + 28}px;
    border-radius: 70px; background: #0b0720; box-shadow: 0 30px 80px rgba(0,0,0,.55), 0 0 0 3px rgba(255,255,255,.12); }
</style></head><body>${stars}${extra}</body></html>`;
};

async function renderStills(work) {
  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const shot = async (html, path, size) => {
    await page.setViewportSize(size ?? { width: W, height: H });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path, omitBackground: true });
  };
  for (const [i, s] of SHOTS.entries()) {
    await shot(sky(11 + i, `<div class="cap">${s.caption}</div><div class="bezel"></div>`), join(work, `bg${i}.png`));
  }
  await shot(`<body style="margin:0;background:transparent"><div style="width:${PHONE.w}px;height:${PHONE.h}px;border-radius:56px;background:#fff"></div></body>`,
    join(work, 'mask.png'), { width: PHONE.w, height: PHONE.h });
  await shot(`<html><head><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap" rel="stylesheet"></head>
    <body style="margin:0;background:transparent"><div style="font-family:Nunito;font-weight:900;font-size:52px;line-height:${NAME_BOX.h}px;color:#fcd34d;padding-left:6px">${FAKE_NAME}</div></body></html>`,
    join(work, 'name.png'), { width: NAME_BOX.w, height: NAME_BOX.h });
  const d = RING.r * 2 + 20;
  await shot(`<body style="margin:0;background:transparent"><div style="position:absolute;left:10px;top:10px;width:${RING.r * 2}px;height:${RING.r * 2}px;border-radius:50%;border:8px solid #fcd34d;box-shadow:0 0 24px #fcd34d"></div></body>`,
    join(work, 'ring.png'), { width: d, height: d });
  const vosje = readFileSync(join(ROOT, 'src/assets/landing/vosje.png')).toString('base64');
  const logo = readFileSync(join(ROOT, 'src/assets/brand/icon-leapio.svg')).toString('base64');
  await shot(sky(5, `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-bottom:80px">
      <img src="data:image/png;base64,${vosje}" style="width:620px;height:620px;object-fit:contain;filter:drop-shadow(0 24px 40px rgba(0,0,0,.45))">
      <div style="font-weight:900;font-size:104px;margin-top:10px">Leapio</div>
      <div style="font-weight:800;font-size:44px;color:#c7bdf0;margin-top:12px">Oefenen voor het 1ste en 2de leerjaar</div>
      <div style="margin-top:56px;padding:20px 46px;border-radius:999px;background:#facc15;color:#241650;font-weight:900;font-size:50px">Beta: link in bio</div>
      <div style="display:flex;align-items:center;gap:16px;margin-top:60px;font-weight:800;font-size:36px">
        <img src="data:image/svg+xml;base64,${logo}" style="width:60px;height:60px;border-radius:14px">leapio.be</div>
    </div>`), join(work, 'end.png'));
  await browser.close();
}

function renderShot(i, s, vo, work) {
  const voLen = vo ? vo[1] - vo[0] : 0;
  const dur = Math.max(s.dur, vo ? s.voAt + voLen + 0.35 : 0);
  // Duurt de zin langer dan de uitleg in de app op zich laat wachten: uitleg later laten beginnen.
  const appDelay = s.appSpeechAt != null && vo ? Math.max(0, s.voAt + voLen + 0.25 - s.appSpeechAt) : 0;
  const total = dur + appDelay;
  const args = ['-ss', String(s.start), '-t', String(s.dur + appDelay), '-i', clip(s.src), '-loop', '1', '-i', join(work, `bg${i}.png`), '-i', join(work, 'mask.png')];
  let n = 3;
  const extra = {};
  if (s.hideName) { args.push('-i', join(work, 'name.png')); extra.name = n++; }
  if (s.ring) { args.push('-loop', '1', '-i', join(work, 'ring.png')); extra.ring = n++; }
  if (vo) { args.push('-ss', String(vo[0]), '-t', String(voLen), '-i', vo.file); extra.vo = n++; }
  args.push('-f', 'lavfi', '-t', String(total), '-i', 'anullsrc=r=48000:cl=stereo'); const silence = n++;

  let v = `[0:v]fps=${FPS},crop=${SRC_W}:${SRC_H - STATUS_BAR}:0:${STATUS_BAR}`;
  if (s.hideName) {
    v += `,delogo=x=${NAME_BOX.x}:y=${NAME_BOX.y}:w=${NAME_BOX.w}:h=${NAME_BOX.h}[c];[c][${extra.name}:v]overlay=${NAME_BOX.x}:${NAME_BOX.y}`;
  }
  if (s.zoom) {
    // Inzoomen: een stuk van het scherm met dezelfde verhouding als het gsm-kader.
    const zh = Math.round(s.zoom.w * PHONE.h / PHONE.w);
    v += `,crop=${s.zoom.w}:${zh}:${s.zoom.x}:${s.zoom.y}`;
  }
  v += `,scale=${PHONE.w}:${PHONE.h},setsar=1,format=rgba,tpad=stop_mode=clone:stop_duration=${total}[ph];`;
  v += `[2:v]format=gray,scale=${PHONE.w}:${PHONE.h}[m];[ph][m]alphamerge[phm];`;
  v += `[1:v][phm]overlay=${PHONE.x}:${PHONE.y}:shortest=0[v1];`;
  let last = 'v1';
  if (s.ring) {
    v += `[${last}][${extra.ring}:v]overlay=${RING.cx - RING.r - 10}:${RING.cy - RING.r - 10}:enable='lt(t,${(s.voAt + voLen).toFixed(2)})*lt(mod(t,0.7),0.45)'[v2];`;
    last = 'v2';
  }
  v += `[${last}]trim=duration=${total},format=yuv420p[v];`;

  const app = `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${s.app ?? 0}`;
  let a;
  if (appDelay > 0) {
    const cut = s.appSpeechAt - 0.2;
    a = `${app},asplit[x1][x2];[x1]atrim=0:${cut},apad=pad_dur=${appDelay}[a0a];[x2]atrim=start=${cut},asetpts=PTS-STARTPTS[a0b];[a0a][a0b]concat=n=2:v=0:a=1[a0];`;
  } else {
    a = `${app}[a0];`;
  }
  let mix = `[a0][${silence}:a]`;
  let inputs = 2;
  if (vo) {
    const ms = Math.round(s.voAt * 1000);
    a += `[${extra.vo}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.4,adelay=${ms}|${ms}[vo];`;
    mix += '[vo]';
    inputs = 3;
  }
  a += `${mix}amix=inputs=${inputs}:normalize=0:duration=longest,atrim=0:${total}[a]`;

  const out = join(work, `shot${String(i).padStart(2, '0')}.mp4`);
  ff([...args, '-filter_complex', v + a, '-map', '[v]', '-map', '[a]', '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k', '-t', String(total), out]);
  return out;
}

async function main() {
  const voice = process.argv[2] && resolve(process.argv[2]);
  if (!voice) { console.error('Gebruik: node scripts/gameplay-reel.mjs <voice-over.mp3> [uit.mp4]'); process.exit(1); }
  const out = resolve(process.argv[3] ?? join(CLIPS, 'gameplay-reel.mp4'));
  const work = mkdtempSync(join(tmpdir(), 'reel-'));
  try {
    const lines = voiceLines(voice);
    console.log('Zinnen in de voice-over:', lines.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}s`).join(', '));
    await renderStills(work);
    const parts = SHOTS.map((s, i) => {
      const vo = s.vo != null ? Object.assign([...lines[s.vo]], { file: voice }) : null;
      console.log(`shot ${i + 1}/${SHOTS.length}: ${s.caption}`);
      return renderShot(i, s, vo, work);
    });
    const end = join(work, 'shot99.mp4');
    ff(['-loop', '1', '-t', String(END_CARD), '-i', join(work, 'end.png'), '-f', 'lavfi', '-t', String(END_CARD), '-i', 'anullsrc=r=48000:cl=stereo',
      '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k', '-shortest', end]);
    parts.push(end);
    const list = join(work, 'list.txt');
    writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
    ff(['-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
    console.log(`Klaar: ${out}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch(err => { console.error(err.message ?? err); process.exit(1); });
