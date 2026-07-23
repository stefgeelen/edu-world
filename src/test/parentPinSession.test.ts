import { describe, it, expect, beforeEach } from 'vitest';
import { parentPinSession } from '@/hooks/useParentPin';

// parentPinSession gates the entire parent portal behind a per-tab sessionStorage
// flag. If lock()/unlock() ever stop matching, a child could keep access to the
// parent portal after the app thinks it locked it (or vice versa).
describe('parentPinSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('is locked by default', () => {
    expect(parentPinSession.isUnlocked()).toBe(false);
  });

  it('unlock() sets the session flag', () => {
    parentPinSession.unlock();
    expect(parentPinSession.isUnlocked()).toBe(true);
    expect(sessionStorage.getItem('parent_pin_ok')).toBe('1');
  });

  it('lock() clears the session flag', () => {
    parentPinSession.unlock();
    parentPinSession.lock();
    expect(parentPinSession.isUnlocked()).toBe(false);
    expect(sessionStorage.getItem('parent_pin_ok')).toBeNull();
  });

  it('lock() is a no-op when already locked (does not throw)', () => {
    expect(() => parentPinSession.lock()).not.toThrow();
    expect(parentPinSession.isUnlocked()).toBe(false);
  });
});
