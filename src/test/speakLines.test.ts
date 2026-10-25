import { describe, it, expect, vi, beforeEach } from 'vitest';

// The Buddy's explanation in an exercise: the lines play one after the other,
// and a stop (or anything else speaking) cuts the rest off.

const invokeFunction = vi.fn();
vi.mock('@/lib/invokeFunction', () => ({ invokeFunction: (...a: unknown[]) => invokeFunction(...a) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const played: string[] = [];
let audios: FakeAudio[] = [];
/** Stands in for the one audio element that plays everything (src changes per line). */
class FakeAudio {
  src = '';
  private listeners: Record<string, Set<() => void>> = {};
  constructor() {
    audios.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    (this.listeners[type] ??= new Set()).add(fn);
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners[type]?.delete(fn);
  }
  private emit(type: string) {
    [...(this.listeners[type] ?? [])].forEach((fn) => fn());
  }
  play = vi.fn(() => {
    played.push(this.src);
    return Promise.resolve();
  });
  pause = vi.fn();
  end() {
    this.emit('ended');
  }
  fail() {
    this.emit('error');
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

    audios[0].end();
    await expect(done).resolves.toBeUndefined();
    // One element plays every line: iOS only allows the one unlocked by a tap.
    expect(audios).toHaveLength(1);
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

  it('plays a recorded sound from its file, without asking the voice', async () => {
    const { speakLines } = await import('@/hooks/useSpeech');
    const done = speakLines([{ clip: '/klanken/p.mp3', text: 'puh' }]);

    await flush();
    expect(played).toEqual(['/klanken/p.mp3']);
    expect(invokeFunction).not.toHaveBeenCalled();

    audios[0].end();
    await done;
  });

  it('lets the voice say the sound when the recording is missing', async () => {
    const { speakLines } = await import('@/hooks/useSpeech');
    const done = speakLines([{ clip: '/klanken/p.mp3', text: 'puh' }]);

    await flush();
    audios[0].fail();
    await flush();
    expect(invokeFunction.mock.calls.map((c) => c[1].text)).toEqual(['puh']);
    expect(played).toHaveLength(2);

    audios[0].end();
    await done;
  });

  it('waits during a pause before the next word', async () => {
    const { speakLines } = await import('@/hooks/useSpeech');
    const done = speakLines(['Wat rijmt op huis?', { pause: 60 }, 'muis']);

    await flush();
    audios[0].end();
    await flush();
    // Still silent: the pause is not over yet.
    expect(played).toHaveLength(1);

    await new Promise((r) => setTimeout(r, 80));
    expect(played).toHaveLength(2);
    // The pause asks nothing of the voice.
    expect(invokeFunction).toHaveBeenCalledTimes(2);

    audios[0].end();
    await done;
  });

  it('never lets the device\'s robot voice say a lone sound', async () => {
    const speakSynth = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak: speakSynth, cancel: vi.fn(), getVoices: () => [] });
    invokeFunction.mockRejectedValue(new Error('offline'));
    const { speakLines } = await import('@/hooks/useSpeech');
    const done = speakLines([{ clip: '/klanken/r.mp3', text: 'rrr' }]);

    await flush();
    audios[0].fail();
    await done;
    expect(speakSynth).not.toHaveBeenCalled();
  });

  it('unlocks the one audio element with a moment of silence on the first tap', async () => {
    const { unlockAudio } = await import('@/hooks/useSpeech');
    unlockAudio();
    expect(audios).toHaveLength(1);
    expect(played[0]).toMatch(/^data:audio\/mpeg;base64,/);
  });
});
