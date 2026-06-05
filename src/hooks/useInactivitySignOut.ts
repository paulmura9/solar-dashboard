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
] as const;

export function useInactivitySignOut() {
  useEffect(() => {
    let signedOut = false;
    let lastRecorded = 0;
    // The last-activity timestamp captured the moment the tab went hidden. The
    // idle check on return compares against THIS snapshot, not the live
    // localStorage value, because the focus-return burst (mousemove/mousedown)
    // can fire before the visibility handler and overwrite the live value with
    // a fresh "now" — which would make a tab idle overnight look freshly active.
    let lastActivityWhenHidden = 0;

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

    const signOutForIdle = (): void => {
      signedOut = true;
      void signOutCompletely(); // handles the redirect to /login itself
    };

    const evaluateIdle = (): void => {
      if (signedOut) return;
      if (Date.now() - readLastActivity() > INACTIVITY_TIMEOUT_MS) signOutForIdle();
    };

    // visibilitychange is dispatched on `document`; bind it there (its own target)
    // rather than bundling it with the activity events on `window`.
    const onVisibilityChange = (): void => {
      if (signedOut) return;
      if (document.visibilityState === "hidden") {
        // Snapshot the clean timestamp while the tab is still idle, before any
        // return activity can overwrite it.
        lastActivityWhenHidden = readLastActivity();
        return;
      }
      // Becoming visible: a long-hidden tab cannot rely on the throttled/suspended
      // interval, so re-check synchronously here against the pre-return snapshot.
      if (Date.now() - lastActivityWhenHidden > INACTIVITY_TIMEOUT_MS) signOutForIdle();
    };

    // Check first (catches a tab reopened after the timeout already elapsed), then
    // treat the load itself as activity so an active reopen resets the clock.
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
