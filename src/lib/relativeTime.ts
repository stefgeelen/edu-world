/**
 * Dutch relative time, for admin screens that answer "when was this last
 * touched". Deliberately coarse: whether a parent was last seen 61 or 78
 * minutes ago never matters, whether it was today or five weeks ago does.
 */
export function timeAgoNl(iso: string | null | undefined): string {
  if (!iso) return 'nooit';

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'nooit';

  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return 'nu';
  if (minutes < 60) return `${minutes} min geleden`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'gisteren';
  if (days < 31) return `${days} dagen geleden`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'maand' : 'maanden'} geleden`;

  const years = Math.floor(days / 365);
  return `${years} jaar geleden`;
}

/** Days since `iso`, or null when it never happened. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}
