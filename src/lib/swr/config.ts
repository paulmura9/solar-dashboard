import type { SWRConfiguration } from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PERF_CONFIG } from "@/config/perfConfig";

export class ApiFetchError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
  }
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

function buildUrl(key: string): string {
  return key.startsWith("http://") || key.startsWith("https://")
    ? key
    : `${API_BASE_URL}${key}`;
}

async function readAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetcher<T>(key: string): Promise<T> {
  const token = await readAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(key), {
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.replace("/login");
    throw new ApiFetchError(401, "Unauthorized");
  }

  if (!res.ok) {
    throw new ApiFetchError(res.status, `${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: PERF_CONFIG.swr.dedupingIntervalMs,
  errorRetryCount: PERF_CONFIG.swr.errorRetryCount,
  errorRetryInterval: PERF_CONFIG.swr.errorRetryBaseMs,
  keepPreviousData: true,
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    if (error instanceof ApiFetchError && error.status === 404) return;
    if (retryCount >= PERF_CONFIG.swr.errorRetryCount) return;
    const delay = Math.min(
      PERF_CONFIG.swr.errorRetryBaseMs * 2 ** retryCount,
      PERF_CONFIG.swr.errorRetryMaxMs
    );
    setTimeout(() => revalidate({ retryCount }), delay);
  },
};
