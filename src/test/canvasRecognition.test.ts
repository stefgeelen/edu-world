import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canvasToRecognitionBase64, RECOGNITION_MAX_EDGE } from '@/lib/canvasRecognition';

// What recognition sees decides whether a child's correct answer is accepted,
// and its size is the bill: Claude charges an image at roughly (w x h) / 750
// tokens. These pin both the crop to the ink and the cap on what is sent.

interface InkBox { x: number; y: number; w: number; h: number }

/** A source canvas whose pixels are transparent except for one block of ink. */
function makeSource(width: number, height: number, ink: InkBox | null): HTMLCanvasElement {
  const data = new Uint8ClampedArray(width * height * 4);
  if (ink) {
    for (let y = ink.y; y < ink.y + ink.h; y++) {
      for (let x = ink.x; x < ink.x + ink.w; x++) data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return {
    width,
    height,
    getContext: () => ({ getImageData: () => ({ data }) }),
    toDataURL: () => `data:image/png;base64,SOURCE-${width}x${height}`,
  } as unknown as HTMLCanvasElement;
}

interface Target {
  width: number;
  height: number;
  drawImage: ReturnType<typeof vi.fn>;
  fills: { op: string; style: string }[];
}

let created: Target[] = [];
let failDraw = false;
let noContext = false;

beforeEach(() => {
  created = [];
  failDraw = false;
  noContext = false;
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag !== 'canvas') throw new Error(`unexpected ${tag}`);
    const t: Target = { width: 0, height: 0, drawImage: vi.fn(), fills: [] };
    const ctx = {
      globalCompositeOperation: 'source-over',
      fillStyle: '',
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: (...args: unknown[]) => {
        if (failDraw) throw new Error('tainted canvas');
        t.drawImage(...args);
      },
      fillRect() { t.fills.push({ op: this.globalCompositeOperation, style: this.fillStyle }); },
    };
    const canvas = {
      get width() { return t.width; }, set width(v: number) { t.width = v; },
      get height() { return t.height; }, set height(v: number) { t.height = v; },
      getContext: () => (noContext ? null : ctx),
      toDataURL: () => `data:image/png;base64,PREPARED-${t.width}x${t.height}`,
    };
    created.push(t);
    return canvas as unknown as HTMLElement;
  });
});

afterEach(() => vi.restoreAllMocks());

describe('canvasToRecognitionBase64', () => {
  it('crops to the ink with a white margin, so a small number in a corner fills the image', () => {
    // A 60x100 number in the top-left of the 800x600 write-number canvas.
    canvasToRecognitionBase64(makeSource(800, 600, { x: 20, y: 30, w: 60, h: 100 }));

    const [t] = created;
    // Margin is 20% of the longest side (20px), then scaled up 3x to fill.
    expect(t.width).toBe(300);
    expect(t.height).toBe(420);
    expect(t.drawImage).toHaveBeenCalledWith(expect.anything(), 20, 30, 60, 100, 60, 60, 180, 300);
  });

  it('draws the ink black on a white background', () => {
    canvasToRecognitionBase64(makeSource(800, 600, { x: 100, y: 100, w: 200, h: 200 }));

    expect(created[0].fills).toEqual([
      { op: 'source-in', style: '#000000' },
      { op: 'destination-over', style: '#ffffff' },
    ]);
  });

  it('caps a number drawn across the whole canvas at the long-edge limit', () => {
    canvasToRecognitionBase64(makeSource(900, 600, { x: 0, y: 0, w: 900, h: 600 }));

    const [t] = created;
    expect(Math.max(t.width, t.height)).toBe(RECOGNITION_MAX_EDGE);
    expect((t.width * t.height) / 750).toBeLessThan(250); // tokens
  });

  it('does not blow a tiny scribble up past 3x', () => {
    canvasToRecognitionBase64(makeSource(800, 600, { x: 400, y: 300, w: 10, h: 10 }));

    expect(created[0].width).toBe(42); // (10 + 2*2) * 3
  });

  it('returns the prepared payload, not the original', () => {
    expect(canvasToRecognitionBase64(makeSource(800, 600, { x: 0, y: 0, w: 450, h: 450 })))
      .toBe('PREPARED-450x450');
  });

  it('sends the whole canvas, flattened, when nothing was drawn', () => {
    canvasToRecognitionBase64(makeSource(900, 600, null));

    expect(created[0].width).toBe(RECOGNITION_MAX_EDGE);
  });

  // Preparing the image must never cost the child the answer they just drew.
  it('falls back to the original image when the 2d context is unavailable', () => {
    noContext = true;

    expect(canvasToRecognitionBase64(makeSource(900, 600, { x: 0, y: 0, w: 50, h: 50 })))
      .toBe('SOURCE-900x600');
  });

  it('falls back to the original image when drawing throws', () => {
    failDraw = true;

    expect(canvasToRecognitionBase64(makeSource(900, 600, { x: 0, y: 0, w: 50, h: 50 })))
      .toBe('SOURCE-900x600');
  });
});
