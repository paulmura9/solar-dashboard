"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

export function useApiToken(): string {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? "");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => { setToken(session?.access_token ?? ""); }
    );

    return () => subscription.unsubscribe();
  }, []);

  return token;
}
