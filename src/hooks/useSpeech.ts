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

export async function speakText(text: string): Promise<void> {
  if (!text) return;

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

export function useSpeech() {
  useEffect(() => {
    const synth = window.speechSynthesis;
    const load = () => {
      const v = synth.getVoices();
      if (v.length > 0) voicesCache = v;
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text: string) => speakText(text), []);

  return { speak };
}
