import { describe, it, expect } from 'vitest';
import { mapAuthError, mapDbError, mapAnyError, isSubscriptionLimitError } from '@/lib/errorMessages';

describe('mapAuthError', () => {
  it('maps invalid credentials', () => {
    expect(mapAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }))
      .toBe('Verkeerd e-mailadres of wachtwoord.');
  });

  it('maps unconfirmed email', () => {
    expect(mapAuthError({ message: 'Email not confirmed' }))
      .toBe('Bevestig eerst je e-mailadres via de link in je inbox.');
  });

  it('maps duplicate account', () => {
    expect(mapAuthError({ message: 'User already registered' }))
      .toBe('Er bestaat al een account met dit e-mailadres. Log in.');
  });

  it('maps weak/leaked password', () => {
    expect(mapAuthError({ message: 'Password should be at least 10 characters' }))
      .toContain('te veelgebruikt of te zwak');
  });

  it('maps rate limiting by status code', () => {
    expect(mapAuthError({ message: 'too many', status: 429 }))
      .toBe('Te veel pogingen. Wacht een minuut en probeer opnieuw.');
  });

  it('maps network failures', () => {
    expect(mapAuthError(new Error('Failed to fetch')))
      .toBe('Geen internetverbinding. Controleer je netwerk.');
  });

  it('falls back to the raw message for unknown errors', () => {
    expect(mapAuthError(new Error('Something totally unexpected'))).toBe('Something totally unexpected');
  });

  it('falls back to a generic message when there is no message at all', () => {
    expect(mapAuthError(null)).toBe('Er ging iets mis bij het inloggen. Probeer opnieuw.');
  });
});

describe('mapDbError', () => {
  it('extracts the max count from a subscription limit error', () => {
    expect(mapDbError({ message: 'Subscription limit reached: max 2 children' }))
      .toBe('Je hebt het maximum van 2 kinderen bereikt voor je huidige abonnement.');
  });

  it('uses singular wording when max is 1', () => {
    expect(mapDbError({ message: 'Subscription limit reached: max 1 children' }))
      .toBe('Je hebt het maximum van 1 kind bereikt voor je huidige abonnement.');
  });

  it('falls back to generic subscription wording when the count cannot be parsed', () => {
    expect(mapDbError({ message: 'Subscription limit reached' }))
      .toBe('Je hebt het maximum aantal kinderen bereikt voor je abonnement.');
  });

  it('maps unique constraint violations (23505)', () => {
    expect(mapDbError({ code: '23505', message: 'duplicate key' })).toBe('Dit bestaat al. Kies iets anders.');
  });

  it('maps RLS/permission denials (42501)', () => {
    expect(mapDbError({ code: '42501', message: 'permission denied' })).toBe('Je hebt geen toegang tot deze actie.');
  });

  it('maps not-found (PGRST116)', () => {
    expect(mapDbError({ code: 'PGRST116', message: 'no rows' })).toBe('Niet gevonden.');
  });

  it('maps PIN format errors from the set_parent_pin RPC', () => {
    expect(mapDbError({ message: 'PIN moet exact 4 cijfers zijn' }))
      .toBe('De toegangscode moet uit precies 4 cijfers bestaan.');
  });
});

describe('mapAnyError', () => {
  it('prefers a specific auth mapping over the fallback', () => {
    expect(mapAnyError({ message: 'Invalid login credentials' })).toBe('Verkeerd e-mailadres of wachtwoord.');
  });

  it('prefers a specific db mapping when auth mapping does not match', () => {
    expect(mapAnyError({ code: '23505', message: 'duplicate key' })).toBe('Dit bestaat al. Kies iets anders.');
  });

  it('returns the fallback when nothing matches', () => {
    expect(mapAnyError(new Error('totally unknown'), 'Oeps, iets ging mis')).toBe('Oeps, iets ging mis');
  });

  it('returns the fallback for a falsy error', () => {
    expect(mapAnyError(null, 'Oeps')).toBe('Oeps');
  });
});

describe('isSubscriptionLimitError', () => {
  it('detects a subscription limit error', () => {
    expect(isSubscriptionLimitError({ message: 'Subscription limit reached: max 3 children' })).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSubscriptionLimitError({ message: 'SUBSCRIPTION LIMIT REACHED' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isSubscriptionLimitError({ message: 'network error' })).toBe(false);
  });

  it('returns false for a falsy error', () => {
    expect(isSubscriptionLimitError(null)).toBe(false);
  });
});
