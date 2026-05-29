"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { requestCameraCapture, mapCapture } from "@/lib/api";
import { useDashboardWS } from "@/components/providers/DashboardWSProvider";
import { apiKeys, type CaptureEnvelope } from "@/types/api";
import type { CommandStatusUpdate } from "@/lib/ws/types";

// Mirrors the post-command cooldown used by usePanelCommands (RESET_POSITION):
// a brief lockout so the gateway isn't hammered with back-to-back captures.
const CAPTURE_COOLDOWN_MS = 2_000;
// No confirmation within this window is treated as a failed capture so the UI
// never hangs in the "Capturing..." state. Matches the backend POST timeout.
const CAPTURE_TIMEOUT_MS = 15_000;
// Reconciliation cadence: re-fetch the latest capture while awaiting the result,
// so a WS event missed in the POST→listener window is still picked up.
const RECONCILE_INTERVAL_MS = 2_000;

export type CapturePhase = "idle" | "capturing" | "cooldown" | "error";

export interface CameraCaptureResult {
  phase: CapturePhase;
  error: string | null;
  capture: () => Promise<void>;
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

  // Re-fetch the latest capture through the existing SWR cache key, so the page's
  // useLatestCapture (and thus the displayed image) refreshes as a side effect.
  const refetchLatestCapture = useCallback(async () => {
    const env = (await mutate(apiKeys.latestCapture)) as CaptureEnvelope | undefined;
    return env?.data ? mapCapture(env.data) : null;
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
    // Pull the captured image into the cache even if the WS event won the race
    // before the row was queryable on a prior poll tick.
    void refetchLatestCapture();
    enterCooldown();
  }, [stopListening, refetchLatestCapture, enterCooldown]);

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

    // (2) Reconciliation path — poll the latest capture and resolve when the row
    // for this command appears. Covers the missed-WS-event and no-WS-client cases.
    pollRef.current = setInterval(() => {
      void refetchLatestCapture().then((cap) => {
        if (cap && cap.command_id === commandId) finishSuccess();
      });
    }, RECONCILE_INTERVAL_MS);

    // (3) Only surface an error if neither path confirmed within the window.
    timeoutRef.current = setTimeout(
      () => finishFailure("Capture timed out — no response from gateway"),
      CAPTURE_TIMEOUT_MS
    );
  }, [token, phase, client, stopListening, refetchLatestCapture, finishSuccess, finishFailure]);

  return { phase, error, capture };
}
