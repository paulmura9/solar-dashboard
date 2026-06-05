"use client";

import { useEffect } from "react";
import { signOutCompletely } from "@/lib/auth/signOut";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour of no activity
const ACTIVITY_THROTTLE_MS = 30 * 1000; // record activity at most once per 30s
const IDLE_CHECK_INTERVAL_MS = 60 * 1000; // re-evaluate the idle condition every 60s
const LAST_ACTIVITY_KEY = "lighttrack_last_activity";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "visibilitychange",
] as const;

export function useInactivitySignOut() {
  useEffect(() => {
    let signedOut = false;
    let lastRecorded = 0;

    const readLastActivity = (): number => {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      const parsed = stored !== null ? parseInt(stored, 10) : NaN;
      return Number.isNaN(parsed) ? Date.now() : parsed;
    };

    const recordActivity = (): void => {
      const now = Date.now();
      if (now - lastRecorded < ACTIVITY_THROTTLE_MS) return; // throttle storage writes
      lastRecorded = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    };

    const evaluateIdle = (): void => {
      if (signedOut) return;
      if (Date.now() - readLastActivity() > INACTIVITY_TIMEOUT_MS) {
        signedOut = true;
        void signOutCompletely(); // handles the redirect to /login itself
      }
    };

    const onActivity = (event: Event): void => {
      // Regaining focus is not "activity" — it must immediately re-check the idle
      // condition so a tab left open overnight signs out on return rather than
      // waiting for the next interval tick.
      if (event.type === "visibilitychange") {
        if (document.visibilityState === "visible") evaluateIdle();
        return;
      }
      recordActivity();
    };

    // Check first (catches a tab reopened after the timeout already elapsed), then
    // treat the load itself as activity so an active reopen resets the clock.
    evaluateIdle();
    if (signedOut) return;
    recordActivity();

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );
    const intervalId = window.setInterval(evaluateIdle, IDLE_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(intervalId);
    };
  }, []);
}
