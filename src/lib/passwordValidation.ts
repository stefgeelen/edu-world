import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

export const passwordRules = {
  length:    (p: string) => p.length >= PASSWORD_MIN_LENGTH,
  uppercase: (p: string) => /[A-Z]/.test(p),
  lowercase: (p: string) => /[a-z]/.test(p),
  digit:     (p: string) => /\d/.test(p),
};

export function validatePassword(p: string) {
  return {
    length:    passwordRules.length(p),
    uppercase: passwordRules.uppercase(p),
    lowercase: passwordRules.lowercase(p),
    digit:     passwordRules.digit(p),
  };
}

export function isPasswordValid(p: string) {
  const r = validatePassword(p);
  return r.length && r.uppercase && r.lowercase && r.digit;
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Minstens ${PASSWORD_MIN_LENGTH} tekens`)
  .refine(passwordRules.uppercase, 'Moet minstens één hoofdletter bevatten')
  .refine(passwordRules.lowercase, 'Moet minstens één kleine letter bevatten')
  .refine(passwordRules.digit,     'Moet minstens één cijfer bevatten');

export const PASSWORD_REQUIREMENTS_TEXT = `Min. ${PASSWORD_MIN_LENGTH} tekens, hoofdletter, kleine letter en cijfer.`;
