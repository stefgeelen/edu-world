import { describe, it, expect } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  validatePassword,
  isPasswordValid,
  passwordSchema,
} from '@/lib/passwordValidation';

describe('validatePassword', () => {
  it('flags every rule as failing for an empty string', () => {
    const r = validatePassword('');
    expect(r).toEqual({ length: false, uppercase: false, lowercase: false, digit: false });
  });

  it('flags a too-short password even if it has upper/lower/digit', () => {
    const r = validatePassword('Ab1');
    expect(r.length).toBe(false);
    expect(r.uppercase).toBe(true);
    expect(r.lowercase).toBe(true);
    expect(r.digit).toBe(true);
  });

  it('flags missing uppercase', () => {
    expect(validatePassword('lowercase1234').uppercase).toBe(false);
  });

  it('flags missing lowercase', () => {
    expect(validatePassword('UPPERCASE1234').lowercase).toBe(false);
  });

  it('flags missing digit', () => {
    expect(validatePassword('NoDigitsHere').digit).toBe(false);
  });

  it('passes every rule for a valid password', () => {
    const r = validatePassword('Sterk3Wachtwoord');
    expect(r).toEqual({ length: true, uppercase: true, lowercase: true, digit: true });
  });

  it(`requires at least ${PASSWORD_MIN_LENGTH} characters`, () => {
    const exact = 'A1' + 'a'.repeat(PASSWORD_MIN_LENGTH - 2);
    expect(exact).toHaveLength(PASSWORD_MIN_LENGTH);
    expect(validatePassword(exact).length).toBe(true);
    expect(validatePassword(exact.slice(0, -1)).length).toBe(false);
  });
});

describe('isPasswordValid', () => {
  it('returns true only when all rules pass', () => {
    expect(isPasswordValid('Sterk3Wachtwoord')).toBe(true);
  });

  it.each([
    ['too short', 'Ab1defg'],
    ['no uppercase', 'geenhoofdletter1'],
    ['no lowercase', 'GEENKLEINELETTER1'],
    ['no digit', 'GeenCijferHier'],
  ])('returns false when %s', (_label, pw) => {
    expect(isPasswordValid(pw)).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts a valid password', () => {
    expect(passwordSchema.safeParse('Sterk3Wachtwoord').success).toBe(true);
  });

  it('reports a specific message for a too-short password', () => {
    const result = passwordSchema.safeParse('Ab1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(`Minstens ${PASSWORD_MIN_LENGTH} tekens`);
    }
  });

  it('reports a specific message when uppercase is missing', () => {
    const result = passwordSchema.safeParse('geenhoofdletter1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('hoofdletter'))).toBe(true);
    }
  });
});
