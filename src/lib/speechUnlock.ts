/**
 * iOS Safari requires speechSynthesis.speak() to have been called at least
 * once from a synchronous user-gesture handler before it will work from
 * timers or React effects (useEffect + setTimeout).
 *
 * This module registers capture-phase click/touchstart listeners as early as
 * possible (at import time). It must be imported from an eagerly-loaded module
 * — NOT a lazy-loaded one — so the listeners are in place before the user
 * navigates to any exercise screen.
 *
 * Layout.tsx imports this module, which loads at app startup.
 */

let unlocked = false;

if (typeof window !== 'undefined') {
  const prime = () => {
    if (unlocked) return;
    // A silent utterance called from within the user-gesture handler is enough
    // to unlock speechSynthesis for subsequent calls from timers/effects.
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    unlocked = true;
    document.removeEventListener('click', prime, true);
    document.removeEventListener('touchstart', prime, true);
  };
  // Capture phase fires before React's event handlers, ensuring we unlock
  // on the same gesture that triggers navigation.
  document.addEventListener('click', prime, true);
  document.addEventListener('touchstart', prime, true);
}
