"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const INACTIVITY_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lighttrack_last_activity";

export function useInactivitySignOut() {
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (stored && Date.now() - parseInt(stored, 10) > INACTIVITY_MS) {
      supabase.auth.signOut().then(() => {
        window.location.replace("/login");
      });
      return;
    }

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const events = ["mousemove", "keydown", "mousedown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, updateActivity));
    updateActivity();

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
    };
  }, []);
}
