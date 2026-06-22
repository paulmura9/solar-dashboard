"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { requestCameraCapture, getLatestCapture } from "@/lib/api";
import { useDashboardWS } from "@/components/providers/DashboardWSProvider";
import { apiKeys, type CameraCapture } from "@/types/api";
import type { CommandStatusUpdate } from "@/lib/ws/types";

const CAPTURE_COOLDOWN_MS = 2_000;
const CAPTURE_TIMEOUT_MS = 15_000;
const RECONCILE_INTERVAL_MS = 2_000;

export type CapturePhase = "idle" | "capturing" | "cooldown" | "error";

export interface CameraCaptureResult {
  phase: CapturePhase;
  error: string | null;
  /**
   * The fresh, cache-bypassing capture row for the just-issued command, set the
   * moment completion is confirmed. The page should prefer this over the SWR
   * `latestCapture` to avoid rendering the previous (cached) row.
   */
  capturedRow: CameraCapture | null;
  capture: () => Promise<void>;
}

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
  const [capturedRow, setCapturedRow] = useState<CameraCapture | null>(null);

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

  const resolveWithRow = useCallback((cap: CameraCapture) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopListening();
    if (mountedRef.current) setCapturedRow(cap);
    refreshDisplay();
    enterCooldown();
  }, [stopListening, refreshDisplay, enterCooldown]);

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

    if (client) {
      wsUnsubRef.current = client.on<CommandStatusUpdate>("command_status_update", (update) => {
        if (update.id !== commandId) return;
        if (update.status === "FAILED") {
          finishFailure(update.error_message ?? "Capture failed");
        } else if (update.status === "ACKNOWLEDGED") {
          void getLatestCapture(token).then((cap) => {
            if (cap && cap.command_id === commandId) resolveWithRow(cap);
          });
        }
      });
    }

    timeoutRef.current = setTimeout(
      () => finishFailure("Capture timed out — no response from gateway"),
      CAPTURE_TIMEOUT_MS
    );

    const baseline = await getLatestCapture(token);
    if (resolvedRef.current) return;
    if (baseline && baseline.command_id === commandId) {
      resolveWithRow(baseline);
      return;
    }
    const baselineIdentity = captureIdentity(baseline);

    pollRef.current = setInterval(() => {
      void getLatestCapture(token).then((cap) => {
        if (!cap) return;
        const matchesCommand = cap.command_id === commandId;
        const identity = captureIdentity(cap);
        const isNewRow = identity !== null && identity !== baselineIdentity;
        if (matchesCommand || isNewRow) resolveWithRow(cap);
      });
    }, RECONCILE_INTERVAL_MS);
  }, [token, phase, client, stopListening, finishFailure, resolveWithRow]);

  return { phase, error, capturedRow, capture };
}
