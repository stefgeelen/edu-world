import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Azure-backed Dutch TTS hook with instant browser speech synthesis fallback.
 *
 * Strategy:
 *  1. Browser speech fires immediately (zero latency).
 *  2. Azure edge function is called in parallel.
 *  3. If Azure responds in time, it cancels the browser utterance and plays
 *     the higher-quality neural audio instead.
 *  4. If Azure fails or is not deployed, the browser speech is already playing.
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

export async function speakText(text: string): Promise<void> {
  if (!text) return;

  // Start browser speech immediately — zero latency fallback.
  browserSpeak(text);

  // In parallel, try to get higher-quality Azure audio.
  try {
    const { data, error } = await supabase.functions.invoke('synthesize-speech', {
      body: { text },
    });

    if (error || !data?.audioBase64) return; // browser speech is already playing

    // Azure succeeded — cancel browser speech and play neural audio.
    window.speechSynthesis.cancel();

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
    // Azure failed — browser speech is already playing, nothing to do.
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
