export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const BASE_URL = (
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
    ).replace(/\/$/, "");
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (res.status === 429) {
      console.warn(`apiFetch ${path}: rate limited`);
      return null;
    }
    if (res.status === 404) {
      console.warn(`apiFetch ${path}: not found`);
      return null;
    }
    if (res.status === 401) {
      console.warn("[auth] Token expired or invalid — redirecting to login");
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
      return null;
    }
    if (!res.ok) {
      console.warn(`apiFetch ${path}: ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`apiFetch ${path}: network unavailable —`, err instanceof Error ? err.message : String(err));
    return null;
  }
}
