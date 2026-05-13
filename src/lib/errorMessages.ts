/**
 * Centrale vertaling van technische errors (Supabase Auth, Postgres, RPC) naar
 * vriendelijke Nederlandse berichten. Voorkomt dat ruwe API-tekst lekt naar de UI.
 */

type AnyError = unknown;

interface NormalizedError {
  message: string;
  code?: string;
  status?: number;
}

function normalize(error: AnyError): NormalizedError {
  if (!error) return { message: '' };
  if (typeof error === 'string') return { message: error };
  if (error instanceof Error) {
    const anyErr = error as any;
    return {
      message: error.message,
      code: anyErr.code ?? anyErr.error_code,
      status: anyErr.status ?? anyErr.statusCode,
    };
  }
  if (typeof error === 'object') {
    const e = error as any;
    return {
      message: String(e.message ?? e.error_description ?? e.error ?? ''),
      code: e.code ?? e.error_code,
      status: e.status ?? e.statusCode,
    };
  }
  return { message: String(error) };
}

/** Auth-errors (Supabase GoTrue). */
export function mapAuthError(error: AnyError): string {
  const { message, code, status } = normalize(error);
  const lower = message.toLowerCase();

  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return 'Verkeerd e-mailadres of wachtwoord.';
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Bevestig eerst je e-mailadres via de link in je inbox.';
  }
  if (code === 'user_already_exists' || lower.includes('already registered') || lower.includes('user already')) {
    return 'Er bestaat al een account met dit e-mailadres. Log in.';
  }
  if (code === 'weak_password' || lower.includes('password should be at least') || lower.includes('weak password') || lower.includes('password is too weak') || lower.includes('leaked')) {
    return 'Dit wachtwoord is te veelgebruikt of te zwak. Kies een uniek wachtwoord dat je nergens anders gebruikt.';
  }
  if (code === 'over_email_send_rate_limit' || lower.includes('rate limit') || status === 429) {
    return 'Te veel pogingen. Wacht een minuut en probeer opnieuw.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Geen internetverbinding. Controleer je netwerk.';
  }
  if (lower.includes('invalid email')) {
    return 'Dit e-mailadres lijkt niet geldig.';
  }
  if (lower.includes('same password')) {
    return 'Het nieuwe wachtwoord moet anders zijn dan het oude.';
  }
  return message || 'Er ging iets mis bij het inloggen. Probeer opnieuw.';
}

/** Database/RPC-errors (PostgREST + custom RPCs). */
export function mapDbError(error: AnyError): string {
  const { message, code } = normalize(error);
  const lower = message.toLowerCase();

  // Subscription limit (uit enforce_max_children trigger)
  if (lower.includes('subscription limit reached')) {
    const match = message.match(/max (\d+)/i);
    const max = match?.[1];
    return max
      ? `Je hebt het maximum van ${max} ${max === '1' ? 'kind' : 'kinderen'} bereikt voor je huidige abonnement.`
      : 'Je hebt het maximum aantal kinderen bereikt voor je abonnement.';
  }

  // PIN-validatie (uit set_parent_pin RPC)
  if (lower.includes('pin moet exact 4 cijfers')) {
    return 'De toegangscode moet uit precies 4 cijfers bestaan.';
  }
  if (lower.includes('niet ingelogd')) {
    return 'Je sessie is verlopen. Log opnieuw in.';
  }

  // Generieke Postgres codes
  switch (code) {
    case '23505':
      return 'Dit bestaat al. Kies iets anders.';
    case '23503':
      return 'Dit kan niet worden verwijderd omdat het nog gekoppeld is.';
    case '23514':
      return 'De ingevoerde waarde is niet toegestaan.';
    case '42501':
      return 'Je hebt geen toegang tot deze actie.';
    case 'PGRST116':
      return 'Niet gevonden.';
  }

  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Geen internetverbinding. Controleer je netwerk.';
  }

  return message || 'Er ging iets mis. Probeer het opnieuw.';
}

/** Universele wrapper — probeert auth- en db-mapping en valt terug op fallback. */
export function mapAnyError(error: AnyError, fallback = 'Er ging iets mis. Probeer het opnieuw.'): string {
  if (!error) return fallback;
  const { message } = normalize(error);
  if (!message) return fallback;

  // Probeer eerst specifieke patronen (auth + db delen veel codes)
  const auth = mapAuthError(error);
  const db = mapDbError(error);

  // Als beide identiek zijn aan de raw message, zijn er geen matches gevonden → fallback
  if (auth === message && db === message) return fallback;
  // Geef de niet-generieke voorkeur
  return auth !== message ? auth : db;
}

/** Detect of een error een subscription-limit overschrijding is. */
export function isSubscriptionLimitError(error: AnyError): boolean {
  const { message } = normalize(error);
  return message.toLowerCase().includes('subscription limit reached');
}
