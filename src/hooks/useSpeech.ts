import { useEffect, useRef, useCallback } from 'react';

/**
 * Cross-browser Dutch speech synthesis hook.
 * Handles iOS Safari quirks:
 * - cancel() immediately before speak() silently fails on WebKit
 * - Voices may load asynchronously
 * - User gesture requirement: handled by speechUnlock.ts, which is imported
 *   from Layout.tsx (eagerly loaded) so the unlock fires before the user
 *   ever reaches an exercise screen.
 */
export function useSpeech() {
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const load = () => {
      const v = synth.getVoices();
      if (v.length > 0) voicesRef.current = v;
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text: string): SpeechSynthesisUtterance | null => {
    if (!text || typeof window === 'undefined') return null;

    const synth = window.speechSynthesis;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = 0.75;

    const voices =
      voicesRef.current.length > 0
        ? voicesRef.current
        : synth.getVoices();

    const dutchVoice =
      voices.find((v) => v.lang === 'nl-NL') ||
      voices.find((v) => v.lang.startsWith('nl'));
    if (dutchVoice) utterance.voice = dutchVoice;

    // iOS Safari fix: cancel() + immediate speak() silently fails.
    // Adding a small delay lets WebKit finish the cancel cycle.
    const isWebKit =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

    if (isWebKit) {
      setTimeout(() => {
        synth.speak(utterance);
        // iOS Safari pauses speech when tab is backgrounded; resume trick.
        // Use addEventListener (not onend/onerror property assignment) so we
        // don't overwrite the caller's own onend/onerror handlers.
        const keepAlive = setInterval(() => {
          if (!synth.speaking) {
            clearInterval(keepAlive);
          } else {
            synth.pause();
            synth.resume();
          }
        }, 5000);
        utterance.addEventListener('end', () => clearInterval(keepAlive));
        utterance.addEventListener('error', () => clearInterval(keepAlive));
      }, 100);
    } else {
      synth.speak(utterance);
    }

    return utterance;
  }, []);

  return { speak };
}
