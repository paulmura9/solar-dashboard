"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LOGIN_ROUTE } from "@/config/auth";

export function useAuthGuard(): void {
  useEffect(() => {
    let cancelled = false;

    async function ensureAuthed(): Promise<void> {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        window.location.replace(LOGIN_ROUTE);
      }
    }

    void ensureAuthed();

    function handlePageShow(e: PageTransitionEvent): void {
      if (e.persisted) void ensureAuthed();
    }
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);
}
