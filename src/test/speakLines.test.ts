import { describe, it, expect, vi, beforeEach } from 'vitest';

// The Buddy's explanation in an exercise: the lines play one after the other,
// and a stop (or anything else speaking) cuts the rest off.

const invokeFunction = vi.fn();
vi.mock('@/lib/invokeFunction', () => ({ invokeFunction: (...a: unknown[]) => invokeFunction(...a) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const played: string[] = [];
let audios: FakeAudio[] = [];
class FakeAudio {
  src: string;
  onended: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(src: string) {
    this.src = src;
    audios.push(this);
  }
  play = vi.fn(() => {
    played.push(this.src);
    return Promise.resolve();
  });
  pause = vi.fn(() => this.onpause?.());
  end() {
    this.onended?.();
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.resetModules();
  played.length = 0;
  audios = [];
  invokeFunction.mockReset().mockImplementation((_name: string, { text }: { text: string }) =>
    Promise.resolve({ audioBase64: btoa(text) }),
  );
  vi.stubGlobal('Audio', FakeAudio);
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:${++n}`);
  URL.revokeObjectURL = vi.fn();
});

describe('speakLines', () => {
  it('plays the next line only when the first has ended', async () => {
    const { speakLines } = await import('@/hooks/useSpeech');
    const done = speakLines(['Uitleg.', 'Hoeveel is 7 plus 5?']);

    await flush();
    expect(played).toHaveLength(1);
    // Both lines are fetched up front, so there is no gap between them.
    expect(invokeFunction).toHaveBeenCalledTimes(2);

    audios[0].end();
    await flush();
    expect(played).toHaveLength(2);

    audios[1].end();
    await expect(done).resolves.toBeUndefined();
  });

  it('stops after the current line when stopped', async () => {
    const { speakLines, stopSpeaking } = await import('@/hooks/useSpeech');
    const done = speakLines(['Uitleg.', 'De vraag.']);

    await flush();
    stopSpeaking();
    await done;

    expect(audios[0].pause).toHaveBeenCalled();
    expect(played).toHaveLength(1);
  });

  it('is cut off when something else speaks', async () => {
    const { speakLines, speakText } = await import('@/hooks/useSpeech');
    const done = speakLines(['Uitleg.', 'De vraag.']);

    await flush();
    await speakText('kat');
    await done;

    // The explanation, then the word, and never the question.
    expect(played).toHaveLength(2);
    expect(invokeFunction.mock.calls.map((c) => c[1].text)).toContain('kat');
  });
});
