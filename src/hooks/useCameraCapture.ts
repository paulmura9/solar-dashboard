"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { requestCameraCapture, getLatestCapture } from "@/lib/api";
import { useDashboardWS } from "@/components/providers/DashboardWSProvider";
import { apiKeys, type CameraCapture } from "@/types/api";
import type { CommandStatusUpdate } from "@/lib/ws/types";

// Mirrors the post-command cooldown used by usePanelCommands (RESET_POSITION):
// a brief lockout so the gateway isn't hammered with back-to-back captures.
const CAPTURE_COOLDOWN_MS = 2_000;
// No confirmation within this window is treated as a failed capture so the UI
// never hangs in the "Capturing..." state. Matches the backend POST timeout.
const CAPTURE_TIMEOUT_MS = 15_000;
// Reconciliation cadence: re-fetch the latest capture while awaiting the result,
// so completion is detected even if the WS ack never arrives.
const RECONCILE_INTERVAL_MS = 2_000;

export type CapturePhase = "idle" | "capturing" | "cooldown" | "error";

export interface CameraCaptureResult {
  phase: CapturePhase;
  error: string | null;
  capture: () => Promise<void>;
}

// Stable identity for a capture row, independent of the id column's type.
// Used to detect "a new capture row appeared" when the API doesn't echo command_id.
function captureIdentity(cap: CameraCapture | null): string | null {
  if (!cap) return null;
  if (cap.command_id) return cap.command_id;
  if (cap.id != null) return String(cap.id);
  return cap.image_path ?? null;
}

export function useCameraCapture(token: string): CameraCaptureResult {
  const { client } = useDashboardWS();
  const { mutate } = useSWRConfig();

  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const wsUnsubRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);
  const mountedRef = useRef(true);

  const stopListening = useCallback(() => {
    if (wsUnsubRef.current) {
      wsUnsubRef.current();
      wsUnsubRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopListening();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [stopListening]);

  // Refresh the SWR-backed latest capture so the page's "Last Captured Image"
  // (useLatestCapture) updates. Detection uses the cache-free getLatestCapture;
  // this is purely for display.
  const refreshDisplay = useCallback(() => {
    void mutate(apiKeys.latestCapture);
  }, [mutate]);

  const enterCooldown = useCallback(() => {
    if (!mountedRef.current) return;
    setError(null);
    setPhase("cooldown");
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => {
      if (mountedRef.current) setPhase("idle");
    }, CAPTURE_COOLDOWN_MS);
  }, []);

  const finishSuccess = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopListening();
    refreshDisplay();
    enterCooldown();
  }, [stopListening, refreshDisplay, enterCooldown]);

  const finishFailure = useCallback((message: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopListening();
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
    if (!mountedRef.current) return;
    setError(message);
    setPhase("error");
  }, [stopListening]);

  const capture = useCallback(async () => {
    if (!token) {
      finishFailure("Not authenticated");
      return;
    }
    if (phase === "capturing" || phase === "cooldown") return;

    stopListening();
    resolvedRef.current = false;
    setError(null);
    setPhase("capturing");

    const result = await requestCameraCapture(token);
    if (!result.success) {
      finishFailure(result.error);
      return;
    }
    const commandId = result.commandId;

    // (1) Live path — resolve as soon as Express pushes this command's status
    // over the shared /ws/client connection. No second connection is opened.
    if (client) {
      wsUnsubRef.current = client.on<CommandStatusUpdate>("command_status_update", (update) => {
        if (update.id !== commandId) return;
        if (update.status === "FAILED") {
          finishFailure(update.error_message ?? "Capture failed");
        } else if (update.status === "ACKNOWLEDGED") {
          finishSuccess();
        }
      });
    }

    // (3) Arm the timeout immediately so a slow baseline fetch can't leave the
    // UI hanging. Only fires if neither path confirms in the window.
    timeoutRef.current = setTimeout(
      () => finishFailure("Capture timed out — no response from gateway"),
      CAPTURE_TIMEOUT_MS
    );

    // Baseline: the latest capture identity BEFORE this command completes, so the
    // poll can detect a brand-new row even when the API omits command_id.
    const baseline = await getLatestCapture(token);
    if (resolvedRef.current) return; // WS may have resolved during the fetch
    if (baseline && baseline.command_id === commandId) {
      finishSuccess();
      return;
    }
    const baselineIdentity = captureIdentity(baseline);

    // (2) Reconciliation path — cache-free poll. Resolve when the row for this
    // command_id appears, or when a new capture row supersedes the baseline.
    pollRef.current = setInterval(() => {
      void getLatestCapture(token).then((cap) => {
        if (!cap) return;
        const matchesCommand = cap.command_id === commandId;
        const identity = captureIdentity(cap);
        const isNewRow = identity !== null && identity !== baselineIdentity;
        if (matchesCommand || isNewRow) finishSuccess();
      });
    }, RECONCILE_INTERVAL_MS);
  }, [token, phase, client, stopListening, finishSuccess, finishFailure]);

  return { phase, error, capture };
}
