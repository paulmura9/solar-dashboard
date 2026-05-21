"use client";

import { useEffect } from "react";
import { signOutCompletely } from "@/lib/auth/signOut";

const INACTIVITY_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lighttrack_last_activity";

export function useInactivitySignOut() {
  useEffect(() => {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (stored && Date.now() - parseInt(stored, 10) > INACTIVITY_MS) {
      void signOutCompletely();
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
