import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;

export const passwordRules = {
  length: (p: string) => p.length >= PASSWORD_MIN_LENGTH,
  digit: (p: string) => /\d/.test(p),
  special: (p: string) => /[^A-Za-z0-9]/.test(p),
};

export function validatePassword(p: string) {
  return {
    length: passwordRules.length(p),
    digit: passwordRules.digit(p),
    special: passwordRules.special(p),
  };
}

export function isPasswordValid(p: string) {
  const r = validatePassword(p);
  return r.length && r.digit && r.special;
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Minstens ${PASSWORD_MIN_LENGTH} tekens`)
  .refine(passwordRules.digit, 'Moet minstens één cijfer bevatten')
  .refine(passwordRules.special, 'Moet minstens één speciaal teken bevatten');

export const PASSWORD_REQUIREMENTS_TEXT = `Min. ${PASSWORD_MIN_LENGTH} tekens, één cijfer en één speciaal teken.`;
