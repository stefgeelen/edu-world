/**
 * Prepares a drawing canvas for the recognize-digit edge function.
 *
 * What the model gets is what a handwriting reader expects: the child's number
 * in black on white, cropped to the ink with a white margin around it.
 *
 * - Cropped: a child often writes a small number in one corner of the canvas.
 *   Sent whole and downscaled, that number was a few dozen pixels in a big
 *   empty image, and a 1 read as a 7 or nothing at all. Cropped, the number
 *   fills the image whatever size it was written.
 * - Black on white: the canvas itself is light purple strokes on a transparent
 *   background. How transparency is shown to the model is up to the API (on
 *   white, the purple has little contrast), so the image is flattened here.
 * - Capped: Claude bills an image at roughly (width x height) / 750 tokens, so
 *   the long edge stays at RECOGNITION_MAX_EDGE (~200 tokens at most; the raw
 *   900x600 canvas would be ~720).
 */
export const RECOGNITION_MAX_EDGE = 450;

/** White space around the ink, as a share of the ink's longest side. */
const MARGIN_RATIO = 0.2;
/** A tiny scribble is not blown up past this, so a dot stays a dot. */
const MAX_UPSCALE = 3;
/** Alpha above which a pixel counts as ink (skips faint anti-aliasing). */
const INK_ALPHA = 40;

/** Strips the `data:image/png;base64,` prefix; null if the URL is malformed. */
function toBase64(canvas: HTMLCanvasElement): string | null {
  return canvas.toDataURL('image/png').split(',')[1] ?? null;
}

interface Rect { x: number; y: number; w: number; h: number }

/** The bounding box of the ink, or null when nothing was drawn. */
function inkBounds(source: HTMLCanvasElement): Rect | null {
  const ctx = source.getContext('2d');
  if (!ctx) return null;
  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > INK_ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Returns the drawing as base64 PNG: cropped to the ink, black on white, with
 * neither edge above RECOGNITION_MAX_EDGE. Falls back to the original canvas
 * whenever this can't be done, so a failure here costs accuracy rather than
 * breaking the exercise.
 */
export function canvasToRecognitionBase64(source: HTMLCanvasElement): string | null {
  try {
    const ink = inkBounds(source) ?? { x: 0, y: 0, w: source.width, h: source.height };
    const margin = Math.round(Math.max(ink.w, ink.h) * MARGIN_RATIO);
    const paddedW = ink.w + margin * 2;
    const paddedH = ink.h + margin * 2;
    const scale = Math.min(RECOGNITION_MAX_EDGE / Math.max(paddedW, paddedH), MAX_UPSCALE);

    const target = document.createElement('canvas');
    target.width = Math.max(1, Math.round(paddedW * scale));
    target.height = Math.max(1, Math.round(paddedH * scale));
    const ctx = target.getContext('2d');
    if (!ctx) return toBase64(source);

    // Thin strokes vanish under nearest-neighbour scaling.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      source, ink.x, ink.y, ink.w, ink.h,
      margin * scale, margin * scale, ink.w * scale, ink.h * scale,
    );

    // Recolour the ink black (keeping its alpha), then put white behind it.
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target.width, target.height);

    return toBase64(target);
  } catch {
    // Preparing the image must never cost us the answer the child just drew.
    return toBase64(source);
  }
}
