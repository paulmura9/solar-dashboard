import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  APP_STORAGE_PREFIX,
  AUTH_COOKIE_PREFIX,
  LEGACY_APP_STORAGE_PREFIX,
  POST_SIGNOUT_REDIRECT,
  SIGNOUT_ROUTE,
} from "@/config/auth";

export async function signOutCompletely(): Promise<void> {
  await runSafely("supabase signOut", async () => {
    await getSupabaseBrowserClient().auth.signOut({ scope: "global" });
  });

  runSafelySync("localStorage purge", () => clearWebStorage(localStorage));
  runSafelySync("sessionStorage purge", () => clearWebStorage(sessionStorage));
  runSafelySync("document.cookie purge", clearBrowserCookies);

  await runSafely("server signout", async () => {
    if (typeof fetch === "undefined") return;
    await fetch(SIGNOUT_ROUTE, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      redirect: "manual",
    });
  });

  if (typeof window !== "undefined") {
    window.location.replace(POST_SIGNOUT_REDIRECT);
  }
}

function clearWebStorage(store: Storage): void {
  if (typeof store === "undefined") return;
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key) continue;
    if (
      key.startsWith(AUTH_COOKIE_PREFIX) ||
      key.startsWith(APP_STORAGE_PREFIX) ||
      key.startsWith(LEGACY_APP_STORAGE_PREFIX)
    ) {
      doomed.push(key);
    }
  }
  for (const key of doomed) store.removeItem(key);
}

function clearBrowserCookies(): void {
  if (typeof document === "undefined") return;
  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
  const host = typeof location !== "undefined" ? location.hostname : "";
  const domains = uniqueParentDomains(host);

  for (const piece of document.cookie.split(";")) {
    const name = piece.split("=")[0]?.trim();
    if (!name) continue;
    if (!name.startsWith(AUTH_COOKIE_PREFIX)) continue;

    document.cookie = `${name}=; expires=${expired}; path=/`;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=${expired}; path=/; domain=${domain}`;
    }
  }
}

function uniqueParentDomains(host: string): string[] {
  if (!host || host === "localhost") return [];
  const parts = host.split(".");
  const out = new Set<string>();
  out.add(host);
  out.add(`.${host}`);
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    out.add(parent);
    out.add(`.${parent}`);
  }
  return [...out];
}

async function runSafely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`signOutCompletely: ${label} failed`, err);
    }
  }
}

function runSafelySync(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`signOutCompletely: ${label} failed`, err);
    }
  }
}
