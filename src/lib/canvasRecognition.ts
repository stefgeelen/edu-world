/**
 * Shrinks a drawing canvas before it goes to the recognize-digit edge function.
 *
 * The exercise canvases are 900x600 and 800x600, and Claude bills an image at
 * roughly (width x height) / 750 tokens — so the raw canvas is ~720 and ~640
 * tokens, around 80% of the cost of every recognition call. A single
 * handwritten digit survives a 2x downscale with room to spare (the stroke is
 * 16px on the source canvas), so capping the long edge at 450 cuts the image
 * to ~200 tokens and the whole call by roughly half.
 *
 * Deliberately NOT changed: the canvas keeps its transparent background. The
 * strokes-on-transparent image is what recognition has always received, and
 * flattening it onto white here would quietly change what the model sees.
 */
export const RECOGNITION_MAX_EDGE = 450;

/** Strips the `data:image/png;base64,` prefix; null if the URL is malformed. */
function toBase64(canvas: HTMLCanvasElement): string | null {
  return canvas.toDataURL('image/png').split(',')[1] ?? null;
}

/**
 * Returns the canvas as base64 PNG, downscaled so neither edge exceeds
 * RECOGNITION_MAX_EDGE. Falls back to the full-size image whenever the
 * downscale can't be performed, so a failure here costs money rather than
 * breaking the exercise.
 */
export function canvasToRecognitionBase64(source: HTMLCanvasElement): string | null {
  const longestEdge = Math.max(source.width, source.height);
  if (longestEdge <= RECOGNITION_MAX_EDGE) return toBase64(source);

  const scale = RECOGNITION_MAX_EDGE / longestEdge;
  const target = document.createElement('canvas');
  target.width = Math.round(source.width * scale);
  target.height = Math.round(source.height * scale);

  try {
    const ctx = target.getContext('2d');
    if (!ctx) return toBase64(source);

    // Thin strokes vanish under nearest-neighbour downscaling.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, target.width, target.height);

    return toBase64(target);
  } catch {
    // Saving tokens must never cost us the answer the child just drew.
    return toBase64(source);
  }
}
