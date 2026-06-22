const POST_TIMEOUT_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 30_000;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function devWarn(message: string, ...rest: unknown[]): void {
  if (process.env.NODE_ENV === "development") console.warn(message, ...rest);
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (body && typeof body.error === "string") return body.error;
  } catch {
  }
  return `${res.status} ${res.statusText}`;
}

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeoutMs = options?.method === "POST" ? POST_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const BASE_URL = (
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
    ).replace(/\/$/, "");
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    if (res.status === 401) {
      devWarn("[auth] Token expired or invalid — redirecting to login");
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
      return { ok: false, error: "Unauthorized", status: 401 };
    }
    if (!res.ok) {
      const error = await parseErrorMessage(res);
      devWarn(`apiFetch ${path}: ${res.status} ${res.statusText}`);
      return { ok: false, error, status: res.status };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      devWarn(`apiFetch ${path}: request timeout`);
      return { ok: false, error: "Request timed out", status: 0 };
    }
    devWarn(`apiFetch ${path}: network unavailable —`, err instanceof Error ? err.message : String(err));
    return { ok: false, error: "Network error", status: 0 };
  } finally {
    clearTimeout(timeoutId);
  }
}
