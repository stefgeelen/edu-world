/**
 * Waar een beta-inschrijving vandaan komt. Een link als
 * `leapio.be/beta?bron=instagram` (of `?utm_source=instagram`) geeft de
 * campagne; de plek van het formulier op de pagina (hero, footer) komt erachter.
 * Opgeslagen als "instagram · hero", of enkel "hero" zonder campagne.
 */

const SEPARATOR = ' · ';
const NO_CAMPAIGN = 'website';

/** De campagne uit de querystring: kleine letters, enkel a-z, 0-9, - en _, max. 40 tekens. */
export function campaignFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('bron') ?? params.get('utm_source');
  if (!raw) return null;
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  return clean || null;
}

export function signupSource(placement: string | null, search: string): string | null {
  const campaign = campaignFromSearch(search);
  if (campaign) return `${campaign}${SEPARATOR}${placement || 'pagina'}`;
  return placement;
}

/** De campagne van een opgeslagen bron; oudere inschrijvingen zonder campagne tellen als "website". */
export function campaignOf(source: string | null): string {
  if (!source || !source.includes(SEPARATOR)) return NO_CAMPAIGN;
  return source.split(SEPARATOR)[0];
}
