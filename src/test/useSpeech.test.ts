import { describe, it, expect, vi, beforeEach } from 'vitest';

// The Buddy repeats a small set of lines and children tap it a lot, so a line
// that was already spoken must replay from memory instead of costing another
// ElevenLabs call.

const invokeFunction = vi.fn();
vi.mock('@/lib/invokeFunction', () => ({ invokeFunction: (...a: unknown[]) => invokeFunction(...a) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const play = vi.fn().mockResolvedValue(undefined);
class FakeAudio {
  src: string;
  constructor(src: string) {
    this.src = src;
  }
  play = play;
  pause = vi.fn();
}

beforeEach(() => {
  vi.resetModules();
  invokeFunction.mockReset().mockResolvedValue({ audioBase64: btoa('mp3') });
  play.mockClear();
  vi.stubGlobal('Audio', FakeAudio);
  URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`);
  URL.revokeObjectURL = vi.fn();
});

describe('speakText', () => {
  it('fetches a line once and replays it from memory after that', async () => {
    const { speakText } = await import('@/hooks/useSpeech');

    await speakText('Hoi! Wil je even bij me blijven?');
    await speakText('Hoi! Wil je even bij me blijven?');

    expect(invokeFunction).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('fetches a different line separately', async () => {
    const { speakText } = await import('@/hooks/useSpeech');

    await speakText('Mmm, lekker!');
    await speakText('Lekker fris!');

    expect(invokeFunction).toHaveBeenCalledTimes(2);
  });
});
