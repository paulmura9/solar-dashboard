export const WS_RECONNECT_MIN_DELAY_MS = 1_000 as const;

export const WS_RECONNECT_MAX_DELAY_MS = 30_000 as const;

export const WS_RECONNECT_JITTER_FACTOR = 0.3 as const;

export const REAUTH_INTERVAL_MS = 50 * 60 * 1_000;

// NEXT_PUBLIC_WS_URL holds only the host; Express serves the client socket here.
export const WS_CLIENT_PATH = "/ws/client" as const;
