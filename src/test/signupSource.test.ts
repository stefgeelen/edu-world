import { describe, it, expect } from 'vitest';
import { campaignFromSearch, campaignOf, signupSource } from '@/lib/signupSource';

describe('signupSource', () => {
  it('puts the campaign from ?bron= in front of the form placement', () => {
    expect(signupSource('hero', '?bron=instagram')).toBe('instagram · hero');
  });

  it('also reads utm_source, preferring bron when both are there', () => {
    expect(signupSource('footer', '?utm_source=facebook')).toBe('facebook · footer');
    expect(signupSource('footer', '?bron=instagram&utm_source=facebook')).toBe('instagram · footer');
  });

  it('keeps just the placement without a campaign', () => {
    expect(signupSource('hero', '')).toBe('hero');
    expect(signupSource(null, '?andere=x')).toBeNull();
  });

  it('still marks the campaign when the placement is unknown', () => {
    expect(signupSource(null, '?bron=instagram')).toBe('instagram · pagina');
  });

  it('cleans what a visitor can type into the link', () => {
    expect(campaignFromSearch('?bron= InstaGram!<script>')).toBe('instagramscript');
    expect(campaignFromSearch('?bron=' + 'a'.repeat(80))).toHaveLength(40);
    expect(campaignFromSearch('?bron=%20%20')).toBeNull();
  });
});

describe('campaignOf', () => {
  it('reads the campaign back, counting old rows as website', () => {
    expect(campaignOf('instagram · hero')).toBe('instagram');
    expect(campaignOf('hero')).toBe('website');
    expect(campaignOf(null)).toBe('website');
  });
});
