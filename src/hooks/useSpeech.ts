import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Azure-backed Dutch TTS hook with browser speech synthesis fallback.
 *
 * Primary: calls the `synthesize-speech` edge function which proxies Azure
 * Cognitive Services (nl-NL-FennaNeural). Returns high-quality neural audio.
 *
 * Fallback: if the edge function fails (e.g. no network, not deployed), it
 * silently falls back to the browser's Web Speech API.
 *
 * iOS Safari note: speechUnlock.ts (imported from Layout.tsx) fires a silent
 * utterance on the first user gesture to unblock audio on WebKit. The Audio
 * element used for Azure playback is also subject to this restriction, but
 * since it's triggered from a React effect (which fires after a user interaction
 * has already occurred during exercise navigation), it plays reliably.
 */

let voicesCache: SpeechSynthesisVoice[] = [];

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

// Module-level audio ref so a new speak() call cancels the previous one across all callers.
let currentAudio: HTMLAudioElement | null = null;

/**
 * Standalone Dutch TTS function — same behaviour as `useSpeech().speak`,
 * usable outside React components (e.g. inside toast renderers).
 */
export async function speakText(text: string): Promise<void> {
  if (!text) return;

  try {
    const { data, error } = await supabase.functions.invoke('synthesize-speech', {
      body: { text },
    });

    if (error || !data?.audioBase64) throw new Error(error?.message ?? 'No audio returned');

    const binary = atob(data.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    if (currentAudio) {
      currentAudio.pause();
      try { URL.revokeObjectURL(currentAudio.src); } catch { /* noop */ }
    }

    const audio = new Audio(url);
    currentAudio = audio;
    audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
    audio.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
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
