import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canvasToRecognitionBase64, RECOGNITION_MAX_EDGE } from '@/lib/canvasRecognition';

// The downscale is a cost control: Claude bills an image at roughly
// (w x h) / 750 tokens, so the raw 900x600 canvas is ~720 tokens — about 80% of
// every recognition call. These pin the dimensions actually sent, because a
// silent regression here shows up as a bill, not as a failing feature.

function makeCanvas(width: number, height: number, ctx: unknown = {}): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: () => ctx,
    toDataURL: () => `data:image/png;base64,PAYLOAD-${width}x${height}`,
  } as unknown as HTMLCanvasElement;
}

let created: HTMLCanvasElement[] = [];
let drawImage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  created = [];
  drawImage = vi.fn();
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag !== 'canvas') throw new Error(`unexpected ${tag}`);
    const c = makeCanvas(0, 0, {
      drawImage,
      set imageSmoothingEnabled(_v: boolean) {},
      set imageSmoothingQuality(_v: string) {},
    });
    // width/height are assigned by the helper, so make them writable and have
    // toDataURL reflect whatever it set.
    const target = {
      width: 0,
      height: 0,
      getContext: c.getContext,
      toDataURL() { return `data:image/png;base64,PAYLOAD-${this.width}x${this.height}`; },
    } as unknown as HTMLCanvasElement;
    created.push(target);
    return target as unknown as HTMLElement;
  });
});

afterEach(() => vi.restoreAllMocks());

describe('canvasToRecognitionBase64', () => {
  it('halves the 900x600 number-line canvas to the 450px cap', () => {
    canvasToRecognitionBase64(makeCanvas(900, 600));

    expect(created[0].width).toBe(450);
    expect(created[0].height).toBe(300);
  });

  it('caps the 800x600 write-number canvas on its long edge, keeping aspect ratio', () => {
    canvasToRecognitionBase64(makeCanvas(800, 600));

    expect(created[0].width).toBe(RECOGNITION_MAX_EDGE);
    expect(created[0].height).toBe(338); // 600 * 450/800, rounded
  });

  it('cuts billed image tokens by roughly two thirds', () => {
    // Anthropic bills an image at about (w x h) / 750 tokens.
    canvasToRecognitionBase64(makeCanvas(900, 600));
    const before = (900 * 600) / 750;
    const after = (created[0].width * created[0].height) / 750;

    expect(before).toBeCloseTo(720, 0);
    expect(after).toBeCloseTo(180, 0);
    expect(after / before).toBeLessThan(0.3);
  });

  it('returns the downscaled payload, not the original', () => {
    expect(canvasToRecognitionBase64(makeCanvas(900, 600))).toBe('PAYLOAD-450x300');
  });

  it('leaves a canvas already within the cap untouched', () => {
    expect(canvasToRecognitionBase64(makeCanvas(400, 300))).toBe('PAYLOAD-400x300');
    expect(created).toHaveLength(0); // no offscreen canvas needed
  });

  // Saving tokens must never cost the child the answer they just drew.
  it('falls back to the full-size image when the 2d context is unavailable', () => {
    vi.spyOn(document, 'createElement').mockReturnValue(
      makeCanvas(0, 0, null) as unknown as HTMLElement
    );

    expect(canvasToRecognitionBase64(makeCanvas(900, 600))).toBe('PAYLOAD-900x600');
  });

  it('falls back to the full-size image when drawing throws', () => {
    drawImage.mockImplementation(() => { throw new Error('tainted canvas'); });

    expect(canvasToRecognitionBase64(makeCanvas(900, 600))).toBe('PAYLOAD-900x600');
  });
});
