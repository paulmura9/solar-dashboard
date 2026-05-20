/** Initial delay before first reconnect attempt. */
export const WS_RECONNECT_MIN_DELAY_MS = 1_000 as const;

/** Maximum delay between reconnect attempts (cap of exponential backoff). */
export const WS_RECONNECT_MAX_DELAY_MS = 30_000 as const;

/** Random jitter fraction added to backoff to prevent thundering herd. */
export const WS_RECONNECT_JITTER_FACTOR = 0.3 as const;

/**
 * How often to refresh the JWT on the live connection.
 * Set comfortably below the 60-min Supabase JWT expiry to allow the server
 * to validate the new token before the old one expires.
 */
export const REAUTH_INTERVAL_MS = 50 * 60 * 1_000;
