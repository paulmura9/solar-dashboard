"use client";

import { useEffect } from "react";
import { signOutCompletely } from "@/lib/auth/signOut";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 30 * 1000;
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;
const LAST_ACTIVITY_KEY = "lighttrack_last_activity";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

export function useInactivitySignOut() {
  useEffect(() => {
    let signedOut = false;
    let lastRecorded = 0;
    let lastActivityWhenHidden = 0;

    const readLastActivity = (): number => {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      const parsed = stored !== null ? parseInt(stored, 10) : NaN;
      return Number.isNaN(parsed) ? Date.now() : parsed;
    };

    const recordActivity = (): void => {
      const now = Date.now();
      if (now - lastRecorded < ACTIVITY_THROTTLE_MS) return;
      lastRecorded = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    };

    const signOutForIdle = (): void => {
      signedOut = true;
      void signOutCompletely();
    };

    const evaluateIdle = (): void => {
      if (signedOut) return;
      if (Date.now() - readLastActivity() > INACTIVITY_TIMEOUT_MS) signOutForIdle();
    };

    const onVisibilityChange = (): void => {
      if (signedOut) return;
      if (document.visibilityState === "hidden") {
        lastActivityWhenHidden = readLastActivity();
        return;
      }
      if (Date.now() - lastActivityWhenHidden > INACTIVITY_TIMEOUT_MS) signOutForIdle();
    };

    evaluateIdle();
    if (signedOut) return;
    lastActivityWhenHidden = readLastActivity();
    recordActivity();

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, recordActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    const intervalId = window.setInterval(evaluateIdle, IDLE_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, recordActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);
}
