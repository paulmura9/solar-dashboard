import {
  WS_RECONNECT_MIN_DELAY_MS,
  WS_RECONNECT_MAX_DELAY_MS,
  WS_RECONNECT_JITTER_FACTOR,
  REAUTH_INTERVAL_MS,
} from "./constants";

type EventHandler<T = unknown> = (payload: T) => void;
type Unsubscribe = () => void;

export interface DashboardWSClientConfig {
  /** Full URL to the client WebSocket endpoint (wss://...). */
  url: string;
  /** Returns a fresh JWT or null if unauthenticated. */
  getToken: () => Promise<string | null>;
  /** Called on every connection state transition. */
  onConnectionChange?: (connected: boolean) => void;
  /** Diagnostic sink. The client itself never touches console. */
  onLog?: (
    level: "info" | "warn" | "error",
    event: string,
    data?: Record<string, unknown>,
  ) => void;
}

interface MessageEnvelope {
  type: string;
  payload: unknown;
}

function isMessageEnvelope(value: unknown): value is MessageEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string"
  );
}

/**
 * Persistent WebSocket client for the dashboard.
 *
 * Responsibilities:
 *  - Open WSS connection to Express with JWT in subprotocol
 *  - Auto-reconnect with exponential backoff + jitter
 *  - Refresh JWT periodically and send `reauth` on the live connection
 *  - Dispatch incoming server-pushed events to subscribers
 */
export class DashboardWSClient {
  private ws: WebSocket | null = null;
  private currentBackoffMs: number = WS_RECONNECT_MIN_DELAY_MS;
  private reconnectTimer: number | null = null;
  private reauthTimer: number | null = null;
  private readonly listeners: Map<string, Set<EventHandler>> = new Map();
  private explicitlyClosed: boolean = false;
  private isConnecting: boolean = false;

  constructor(private readonly config: DashboardWSClientConfig) {}

  /** Idempotent: returns early if already connected or connecting. */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    this.explicitlyClosed = false;

    const token = await this.config.getToken();
    if (token === null) {
      this.log("warn", "ws_no_token_deferring_connect");
      this.isConnecting = false;
      return;
    }

    try {
      // JWT travels in the WebSocket subprotocol, not the URL query string,
      // so it doesn't end up in browser history, Referer headers, or server
      // access logs. The server must accept the `access_token` subprotocol
      // and treat the second value as the bearer token.
      this.ws = new WebSocket(this.config.url, ["access_token", token]);
    } catch (err) {
      this.log("error", "ws_construct_failed", { error: String(err) });
      this.isConnecting = false;
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = (): void => {
      this.isConnecting = false;
      this.handleOpen();
    };
    this.ws.onmessage = (evt: MessageEvent): void => this.handleMessage(evt);
    this.ws.onclose = (evt: CloseEvent): void => this.handleClose(evt);
    this.ws.onerror = (): void => {
      // Browser `error` events carry no detail; the real signal arrives via `close`.
      this.log("warn", "ws_error_event");
    };
  }

  /** Close deliberately and stop the reconnect loop. */
  disconnect(): void {
    this.explicitlyClosed = true;
    this.clearTimers();
    if (this.ws !== null) {
      this.ws.close(1000, "client_disconnect");
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to a server-pushed event by type.
   * Returns an unsubscribe function that callers MUST invoke on cleanup.
   */
  on<T = unknown>(type: string, handler: EventHandler<T>): Unsubscribe {
    let set = this.listeners.get(type);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler as EventHandler);

    return (): void => {
      const current = this.listeners.get(type);
      if (current === undefined) return;
      current.delete(handler as EventHandler);
      if (current.size === 0) this.listeners.delete(type);
    };
  }

  /** Returns true if the message was dispatched, false if the socket is closed. */
  send(message: unknown): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      this.log("error", "ws_send_failed", { error: String(err) });
      return false;
    }
  }

  // ----- private -----

  private handleOpen(): void {
    this.log("info", "ws_connected");
    this.currentBackoffMs = WS_RECONNECT_MIN_DELAY_MS;
    this.config.onConnectionChange?.(true);
    this.scheduleReauth();
  }

  private handleMessage(event: MessageEvent): void {
    if (typeof event.data !== "string") {
      this.log("warn", "ws_non_text_message");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data);
    } catch (err) {
      this.log("warn", "ws_invalid_json", { error: String(err) });
      return;
    }

    if (!isMessageEnvelope(parsed)) {
      this.log("warn", "ws_malformed_message");
      return;
    }

    this.emit(parsed.type, parsed.payload);
  }

  private handleClose(event: CloseEvent): void {
    this.log("info", "ws_closed", { code: event.code, reason: event.reason });
    this.isConnecting = false;
    this.config.onConnectionChange?.(false);
    this.clearTimers();
    this.ws = null;

    if (!this.explicitlyClosed) this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;

    const jitter = Math.random() * WS_RECONNECT_JITTER_FACTOR * this.currentBackoffMs;
    const delayMs = this.currentBackoffMs + jitter;

    this.log("info", "ws_reconnect_scheduled", { delayMs: Math.round(delayMs) });

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delayMs);

    this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, WS_RECONNECT_MAX_DELAY_MS);
  }

  private scheduleReauth(): void {
    if (this.reauthTimer !== null) return;

    this.reauthTimer = window.setTimeout(async () => {
      this.reauthTimer = null;
      const token = await this.config.getToken();
      if (token !== null && this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "reauth", token });
        this.scheduleReauth();
      }
    }, REAUTH_INTERVAL_MS);
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.reauthTimer !== null) {
      window.clearTimeout(this.reauthTimer);
      this.reauthTimer = null;
    }
  }

  private emit(type: string, payload: unknown): void {
    const handlers = this.listeners.get(type);
    if (handlers === undefined) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        this.log("error", "ws_handler_threw", { type, error: String(err) });
      }
    }
  }

  private log(
    level: "info" | "warn" | "error",
    event: string,
    data?: Record<string, unknown>,
  ): void {
    this.config.onLog?.(level, event, data);
  }
}
