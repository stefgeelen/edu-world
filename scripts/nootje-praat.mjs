#!/usr/bin/env node
/**
 * Maakt een filmpje waarin Nootje meepraat met een geluidsbestand (bv. een
 * ElevenLabs-mp3). Voor Instagram/TikTok: 1080x1920, 30 fps, H.264 + AAC.
 *
 *   node scripts/nootje-praat.mjs <geluid.mp3> [uit.mp4] [--titel "Hoi, ik ben Nootje!"]
 *
 * Hoe het werkt: het volume van het geluid bepaalt per beeldje hoe ver de mond
 * open staat. De mond uit de tekening wordt daarvoor verticaal samengedrukt over
 * een "dichte" mond (huidkleur + glimlachlijn). Daarbovenop wipt Nootje mee op
 * de stem, ademt hij zacht en knippert hij af en toe. Achtergrond: de nachtlucht
 * van de app. Vraagt ffmpeg (brew install ffmpeg) en Playwright WebKit.
 *
 * De coördinaten hieronder horen bij src/assets/landing/nootje.png (768x768).
 * Een andere Buddy vraagt eigen coördinaten voor mond en ogen.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;
const W = 1080;
const H = 1920;
const STAGE = 1080; // canvas waarop Nootje beweegt, met marge voor wippen en draaien

const NOOTJE = {
  art: join(ROOT, 'src/assets/landing/nootje.png'),
  // Rechthoek rond de open mond; de bovenlip ligt op y = mouth.y.
  mouth: { x: 316, y: 396, w: 118, h: 58 },
  // Ovaal dat de open mond helemaal bedekt (de "dichte" mond).
  mouthCover: { cx: 375, cy: 424, rx: 56, ry: 29 },
  // Glimlachlijn van de dichte mond: hoeken en het laagste punt.
  smile: { from: [321, 396], via: [375, 420], to: [429, 398] },
  // Ogen: middelpunt en halve breedte/hoogte, voor het knipperen.
  eyes: [
    { cx: 304, cy: 348, rx: 35, ry: 37 },
    { cx: 451, cy: 353, rx: 35, ry: 37 },
  ],
};

function parseArgs(argv) {
  const args = { title: '' };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--titel') args.title = argv[++i] ?? '';
    else rest.push(argv[i]);
  }
  if (!rest[0]) {
    console.error('Gebruik: node scripts/nootje-praat.mjs <geluid.mp3> [uit.mp4] [--titel "..."]');
    process.exit(1);
  }
  args.audio = resolve(rest[0]);
  args.out = resolve(rest[1] ?? join(dirname(args.audio), basename(args.audio, extname(args.audio)) + '.mp4'));
  return args;
}

/** Hoe ver de mond open staat per beeldje (0..1), uit het volume van het geluid. */
function mouthOpenness(audioPath) {
  const RATE = 48000;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', audioPath, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-'], {
    maxBuffer: 1024 * 1024 * 1024,
  });
  const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const perFrame = RATE / FPS;
  const frames = Math.ceil(samples.length / perFrame);
  const rms = [];
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = Math.floor(f * perFrame);
    const end = Math.min(samples.length, Math.floor((f + 1) * perFrame));
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    rms.push(Math.sqrt(sum / Math.max(1, end - start)));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.95)] || 1;
  // Snel open, iets trager dicht: zo klappert de mond niet bij elke trilling.
  let level = 0;
  return rms.map(v => {
    const target = Math.min(1, Math.max(0, (v / loud - 0.12) / 0.75));
    level += (target - level) * (target > level ? 0.7 : 0.35);
    return level < 0.06 ? 0 : level;
  });
}

function backgroundHtml(title) {
  const logo = readFileSync(join(ROOT, 'src/assets/brand/icon-leapio.svg')).toString('base64');
  let seed = 7;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const stars = Array.from({ length: 60 }, (_, i) => {
    const big = i % 9 === 0;
    const style = big
      ? 'width:9px;height:9px;background:#fde68a;opacity:.85;box-shadow:0 0 14px #fde68a'
      : 'width:6px;height:6px;background:#fff;opacity:.55';
    return `<i style="position:absolute;border-radius:50%;${style};left:${(r() * 100).toFixed(1)}%;top:${(r() * H * 0.62).toFixed(0)}px"></i>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; font-family: 'Nunito', sans-serif; color: #fff;
    background: radial-gradient(ellipse 70% 40% at 50% 52%, rgba(253,230,138,.16), transparent 70%),
                linear-gradient(180deg, #3f2a7a 0%, #241650 55%, #120b2b 100%); }
  .hills { position: absolute; left: -10%; right: -10%; bottom: -60px; height: 300px; opacity: .9;
    background: radial-gradient(ellipse 60% 100% at 30% 100%, #0f5f4f 0 60%, transparent 61%),
                radial-gradient(ellipse 60% 100% at 78% 100%, #0b4a3e 0 60%, transparent 61%); }
  h1 { position: absolute; top: 330px; left: 60px; right: 60px; text-align: center; font-weight: 900; font-size: 96px; line-height: 1.05; }
  .footer { position: absolute; bottom: 52px; left: 0; right: 0; display: flex; justify-content: center; align-items: center;
    gap: 16px; font-weight: 800; font-size: 32px; }
  .footer img { width: 56px; height: 56px; border-radius: 14px; }
</style></head><body>${stars}<div class="hills"></div>
${title ? `<h1>${title.replace(/</g, '&lt;')}</h1>` : ''}
<div class="footer"><img src="data:image/svg+xml;base64,${logo}">leapio.be</div></body></html>`;
}

/** Tekent in de browser: één beeldje van Nootje als PNG (data-URL). */
function setupStage(cfg) {
  const src = new Image();
  return new Promise(done => {
    src.onload = () => {
      const S = src.width;
      const mk = () => { const c = document.createElement('canvas'); c.width = S; c.height = S; return c; };
      const orig = mk().getContext('2d', { willReadFrequently: true });
      orig.drawImage(src, 0, 0);
      const px = orig.getImageData(0, 0, S, S).data;
      const at = (x, y) => {
        // Gemiddelde van 3x3 pixels, tegen de korrel van de tekening.
        let r = 0, g = 0, b = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const k = ((y + j) * S + (x + i)) * 4;
          r += px[k]; g += px[k + 1]; b += px[k + 2];
        }
        return [r / 9, g / 9, b / 9];
      };
      const luma = c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

      /**
       * Vult een ovaal op met wat er links en rechts naast ligt, per pixelrij
       * van links naar rechts overvloeiend. Zo loopt de schaduw van het gezicht
       * door en is er geen vlek te zien. Donkere randen (lijnen) worden
       * overgeslagen: dan geldt de kleur van de rij erboven.
       */
      const inpaint = (ctx, cx, cy, rx, ry) => {
        const img = ctx.getImageData(0, 0, S, S);
        const d = img.data;
        const rows = [];
        let lastL = at(Math.floor(cx - rx) - 10, Math.round(cy)), lastR = at(Math.ceil(cx + rx) + 10, Math.round(cy));
        for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
          const half = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
          const xl = Math.floor(cx - half) - 5, xr = Math.ceil(cx + half) + 5;
          let L = at(xl, y), R = at(xr, y);
          if (luma(L) < 0.9 * luma(lastL)) L = lastL;
          if (luma(R) < 0.9 * luma(lastR)) R = lastR;
          lastL = L; lastR = R;
          rows.push({ y, xl, xr, L, R });
        }
        // Over 5 rijen uitmiddelen, anders zie je strepen.
        rows.forEach((row, i) => {
          const near = rows.slice(Math.max(0, i - 2), i + 3);
          const avg = key => [0, 1, 2].map(c => near.reduce((s, r) => s + r[key][c], 0) / near.length);
          const L = avg('L'), R = avg('R');
          for (let x = row.xl + 1; x < row.xr; x++) {
            const t = (x - row.xl) / (row.xr - row.xl);
            const k = (row.y * S + x) * 4;
            for (let c = 0; c < 3; c++) d[k + c] = L[c] + (R[c] - L[c]) * t;
            d[k + 3] = 255;
          }
        });
        ctx.putImageData(img, 0, 0);
      };
      const curve = (ctx, x0, y0, xm, ym, x1, y1, width) => {
        ctx.strokeStyle = '#2b1610'; ctx.lineWidth = width; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(xm, 2 * ym - (y0 + y1) / 2, x1, y1);
        ctx.stroke();
      };

      // Basis met dichte mond: de open mond weg, een glimlachlijn erop.
      const closed = mk();
      const cctx = closed.getContext('2d', { willReadFrequently: true });
      cctx.drawImage(src, 0, 0);
      const { cx, cy, rx, ry } = cfg.mouthCover;
      inpaint(cctx, cx, cy, rx, ry);
      const { from, via, to } = cfg.smile;
      curve(cctx, ...from, ...via, ...to, 5);

      // Dezelfde basis met dichte ogen (vrolijke boogjes), voor het knipperen.
      const shutEyes = mk();
      const ectx = shutEyes.getContext('2d', { willReadFrequently: true });
      ectx.drawImage(closed, 0, 0);
      cfg.eyes.forEach(e => {
        // Het oog ligt in een lichte vlek, met aan sommige kanten bruine vacht:
        // de lichtste helft van een ring rond het oog geeft de kleur van het ooglid.
        const ring = Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return at(Math.round(e.cx + Math.cos(a) * (e.rx + 9)), Math.round(e.cy + Math.sin(a) * (e.ry + 9)));
        }).sort((p, q) => luma(q) - luma(p)).slice(2, 12);
        const lid = [0, 1, 2].map(c => Math.round(ring.reduce((s, r) => s + r[c], 0) / ring.length));
        ectx.fillStyle = `rgb(${lid.join(',')})`;
        ectx.beginPath(); ectx.ellipse(e.cx, e.cy, e.rx + 4, e.ry + 4, 0, 0, Math.PI * 2); ectx.fill();
        curve(ectx, e.cx - e.rx * 0.85, e.cy + 4, e.cx, e.cy + e.ry * 0.35, e.cx + e.rx * 0.85, e.cy + 4, 6);
      });

      const face = mk();
      const fctx = face.getContext('2d');
      const stage = document.createElement('canvas');
      stage.width = stage.height = window.STAGE;
      const sctx = stage.getContext('2d');

      window.drawFrame = (open, t, blink, amp) => {
        fctx.clearRect(0, 0, S, S);
        fctx.drawImage(blink < 0.3 ? shutEyes : closed, 0, 0);
        if (open > 0) {
          // De echte mond, verticaal samengedrukt vanaf de bovenlip.
          const m = cfg.mouth;
          const h = Math.max(4, m.h * (0.25 + 0.75 * open));
          fctx.save();
          fctx.beginPath(); fctx.ellipse(cx, m.y + h / 2, rx, h / 2 + 3, 0, 0, Math.PI * 2); fctx.clip();
          fctx.drawImage(src, m.x, m.y, m.w, m.h, m.x, m.y, m.w, h);
          fctx.restore();
        }
        if (blink >= 0.3 && blink < 1) {
          // Half dicht: de bovenste helft van de dichte ogen over de open ogen.
          cfg.eyes.forEach(e => {
            const edge = e.cy - e.ry - 5 + (2 * e.ry + 10) * (1 - blink);
            fctx.save();
            fctx.beginPath(); fctx.ellipse(e.cx, e.cy, e.rx + 5, e.ry + 5, 0, 0, Math.PI * 2); fctx.clip();
            fctx.beginPath(); fctx.rect(e.cx - e.rx - 6, e.cy - e.ry - 6, 2 * e.rx + 12, edge - (e.cy - e.ry - 6)); fctx.clip();
            fctx.drawImage(shutEyes, 0, 0);
            fctx.restore();
            curve(fctx, e.cx - e.rx * 0.9, edge, e.cx, edge + 4, e.cx + e.rx * 0.9, edge, 5);
          });
        }
        // Beweging: ademen, zacht wiegen, meewippen op de stem.
        const size = window.STAGE * 1.08;
        const breathe = Math.sin(t * Math.PI * 2 / 3.2);
        const bob = -amp * 16 + breathe * 4;
        const squash = amp * 0.025 + breathe * 0.008;
        const tilt = (Math.sin(t * Math.PI * 2 / 4.5) * 1.4 + amp * Math.sin(t * 7.3) * 2.2) * Math.PI / 180;
        sctx.clearRect(0, 0, stage.width, stage.height);
        sctx.save();
        sctx.translate(stage.width / 2, stage.height * 0.95 + bob);
        sctx.rotate(tilt);
        sctx.scale(1 - squash * 0.5, 1 + squash);
        sctx.drawImage(face, -size / 2, -size * 0.92, size, size);
        sctx.restore();
        return stage.toDataURL('image/png');
      };
      done(true);
    };
    src.src = cfg.artData;
  });
}

/** Knipperen: elke 2,5 tot 5 seconden, 5 beeldjes dicht-open. */
function blinkCurve(frames) {
  const out = new Array(frames).fill(1);
  let seed = 3;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  let f = Math.round(FPS * 1.5);
  while (f < frames) {
    [0.5, 0.1, 0.1, 0.5].forEach((v, i) => { if (f + i < frames) out[f + i] = v; });
    f += Math.round(FPS * (2.5 + r() * 2.5));
  }
  return out;
}

async function main() {
  const { audio, out, title } = parseArgs(process.argv.slice(2));
  const work = mkdtempSync(join(tmpdir(), 'nootje-'));
  try {
    const openness = mouthOpenness(audio);
    const tail = FPS; // 1 seconde stilte na de laatste zin
    const total = openness.length + tail;
    const blinks = blinkCurve(total);
    console.log(`${(total / FPS).toFixed(1)} s, ${total} beeldjes`);

    const browser = await webkit.launch();
    const page = await browser.newPage({ viewport: { width: W, height: H } });

    await page.setContent(backgroundHtml(title), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(work, 'achtergrond.png') });

    await page.setContent('<html><body></body></html>');
    const artData = 'data:image/png;base64,' + readFileSync(NOOTJE.art).toString('base64');
    await page.evaluate(s => { window.STAGE = s; }, STAGE);
    await page.evaluate(setupStage, { ...NOOTJE, artData });

    for (let f = 0; f < total; f++) {
      const open = openness[f] ?? 0;
      const url = await page.evaluate(([o, t, b, a]) => window.drawFrame(o, t, b, a), [open, f / FPS, blinks[f], open]);
      writeFileSync(join(work, `f${String(f).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
      if (f % 150 === 0) console.log(`beeldje ${f}/${total}`);
    }
    await browser.close();

    const y = Math.round(H * 0.5 - STAGE * 0.5);
    execFileSync('ffmpeg', [
      '-v', 'error', '-y',
      '-loop', '1', '-framerate', String(FPS), '-i', join(work, 'achtergrond.png'),
      '-framerate', String(FPS), '-i', join(work, 'f%05d.png'),
      '-i', audio,
      '-filter_complex', `[0][1]overlay=0:${y}:shortest=1,format=yuv420p[v]`,
      '-map', '[v]', '-map', '2:a', '-af', `apad=pad_dur=1`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
      out,
    ], { stdio: 'inherit' });
    console.log(`Klaar: ${out}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch(err => { console.error(err); process.exit(1); });
