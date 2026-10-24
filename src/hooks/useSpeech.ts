import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/invokeFunction';

/**
 * ElevenLabs-backed Dutch (Flemish) TTS hook.
 * Falls back to the browser's Web Speech API only if the edge function fails.
 */

let voicesCache: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;

function browserSpeak(text: string) {
  if (!text || typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL';
  utterance.rate = 0.75;

  const voices = voicesCache.length > 0 ? voicesCache : synth.getVoices();
  const dutch = voices.find((v) => v.lang === 'nl-NL') ?? voices.find((v) => v.lang.startsWith('nl'));
  if (dutch) utterance.voice = dutch;

  const isWebKit =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

  if (isWebKit) {
    setTimeout(() => synth.speak(utterance), 100);
  } else {
    synth.speak(utterance);
  }
}

/**
 * Recently spoken lines, as object URLs. The Buddy repeats a small set of
 * sentences (and a child taps it a lot), so replaying from memory saves an
 * ElevenLabs call each time. Oldest entries are dropped past the limit.
 */
const AUDIO_CACHE_LIMIT = 60;
const audioCache = new Map<string, string>();

async function audioUrlFor(text: string): Promise<string> {
  const cached = audioCache.get(text);
  if (cached) {
    // Re-insert so the Map's insertion order doubles as least-recently-used.
    audioCache.delete(text);
    audioCache.set(text, cached);
    return cached;
  }

  // Speech is an enhancement, not a blocker — fail fast and let the caller
  // fall back rather than leaving a child waiting on audio that never arrives.
  const data = await invokeFunction<{ audioBase64?: string }>('synthesize-speech', { text }, 8_000);

  if (!data?.audioBase64) throw new Error('No audio returned');

  const binary = atob(data.audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));

  audioCache.set(text, url);
  if (audioCache.size > AUDIO_CACHE_LIMIT) {
    const [oldestText, oldestUrl] = audioCache.entries().next().value as [string, string];
    audioCache.delete(oldestText);
    if (currentAudio?.src !== oldestUrl) URL.revokeObjectURL(oldestUrl);
  }
  return url;
}

/**
 * Bumped by every new utterance and by `stopSpeaking`, so a running
 * `speakLines` sees that it was cut off and doesn't start its next line.
 */
let sequence = 0;

export async function speakText(text: string): Promise<void> {
  if (!text) return;
  sequence += 1;

  try {
    const url = await audioUrlFor(text);

    // Cached URLs are reused, so they're only revoked on eviction, never on stop.
    currentAudio?.pause();

    const audio = new Audio(url);
    currentAudio = audio;
    await audio.play();
  } catch {
    browserSpeak(text);
  }
}

/**
 * Plays one clip and resolves when it ends, or when it is stopped. Resolves
 * false when the clip could not be played at all (missing or broken file).
 */
async function playToEnd(url: string): Promise<boolean> {
  currentAudio?.pause();
  const audio = new Audio(url);
  currentAudio = audio;
  return new Promise<boolean>((resolve) => {
    audio.onended = () => resolve(true);
    audio.onpause = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });
}

function browserSpeakToEnd(text: string): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = 0.75;
    const voices = voicesCache.length > 0 ? voicesCache : synth.getVoices();
    const dutch = voices.find((v) => v.lang === 'nl-NL') ?? voices.find((v) => v.lang.startsWith('nl'));
    if (dutch) utterance.voice = dutch;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

/**
 * One thing the Buddy says: a sentence for the voice, or a recorded clip (a
 * letter sound, see `src/data/letterSounds.ts`) with the text the voice says
 * instead when the clip cannot be played.
 */
export type SpeechLine = string | { clip: string; text: string };

const lineText = (line: SpeechLine) => (typeof line === 'string' ? line : line.text);

/**
 * Says the lines one after the other and resolves when the last one has
 * finished, or as soon as something else speaks or `stopSpeaking` is called.
 * All lines are fetched at once, so there is no pause between them.
 */
export async function speakLines(lines: SpeechLine[]): Promise<void> {
  const id = ++sequence;
  const said = lines.filter((line) => lineText(line));
  const urls = said.map((line) => (typeof line === 'string' ? audioUrlFor(line).catch(() => null) : null));
  for (let i = 0; i < said.length; i++) {
    const line = said[i];
    const url = await urls[i];
    if (id !== sequence) return;
    if (typeof line === 'string') {
      if (url) await playToEnd(url);
      else await browserSpeakToEnd(line);
    } else if (!(await playToEnd(line.clip)) && id === sequence) {
      // The recording is missing: the voice says the sound instead.
      const spoken = await audioUrlFor(line.text).catch(() => null);
      if (id !== sequence) return;
      if (spoken) await playToEnd(spoken);
      else await browserSpeakToEnd(line.text);
    }
    if (id !== sequence) return;
  }
}

/** Stops whatever is being said right now. */
export function stopSpeaking() {
  sequence += 1;
  currentAudio?.pause();
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

export function useSpeech() {
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      const v = synth.getVoices();
      if (v.length > 0) voicesCache = v;
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text: string) => speakText(text), []);

  return { speak, speakLines, stopSpeaking };
}
