"use client";

import { useState, useEffect } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

export function useApiToken(): string {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setToken(data.session?.access_token ?? "");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_: AuthChangeEvent, session: Session | null) => { setToken(session?.access_token ?? ""); }
    );

    return () => subscription.unsubscribe();
  }, []);

  return token;
}
