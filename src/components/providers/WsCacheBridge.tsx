"use client";

import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { useDashboardWS } from "@/components/providers/DashboardWSProvider";
import {
  applyTelemetryUpdate,
  applyVisionUpdate,
  applyEventUpdate,
  applyDeviceUpdate,
  applyCommandStatusUpdate,
} from "@/lib/swr/wsCacheBridge";
import type { CommandStatusUpdate } from "@/lib/ws/types";

const RESYNC_DEBOUNCE_MS = 30_000;

export function WsCacheBridge(): null {
  const { client, isConnected } = useDashboardWS();
  const { mutate } = useSWRConfig();

  const wasConnectedRef = useRef<boolean>(false);
  const lastResyncRef = useRef<number>(0);

  useEffect(() => {
    if (client === null) return;
    const offs = [
      client.on<unknown>("telemetry_update", (raw) => applyTelemetryUpdate(mutate, raw)),
      client.on<unknown>("vision_update", (raw) => applyVisionUpdate(mutate, raw)),
      client.on<unknown>("event_notification", (raw) => applyEventUpdate(mutate, raw)),
      client.on<unknown>("device_status_update", (raw) => applyDeviceUpdate(mutate, raw)),
      client.on<CommandStatusUpdate>("command_status_update", (update) =>
        applyCommandStatusUpdate(mutate, update)
      ),
    ];
    return () => {
      for (const off of offs) off();
    };
  }, [client, mutate]);

  useEffect(() => {
    if (!isConnected) {
      wasConnectedRef.current = false;
      return;
    }
    if (wasConnectedRef.current) return;
    wasConnectedRef.current = true;

    const now = Date.now();
    if (now - lastResyncRef.current < RESYNC_DEBOUNCE_MS) return;
    lastResyncRef.current = now;
    void mutate(() => true);
  }, [isConnected, mutate]);

  return null;
}
