"use client";

import { useEffect } from "react";
import { useDashboardWS } from "@/components/providers/DashboardWSProvider";
import type { WSEventMap, WSEventType } from "@/lib/ws/types";

/**
 * Subscribe to a typed server-pushed WebSocket event.
 *
 * The handler MUST be stable (memoized with useCallback) — otherwise the
 * effect re-runs on every render and the listener is added/removed in a loop.
 *
 * @example
 *   const handleTelemetry = useCallback((reading: SensorReading) => {
 *     setLatest(reading);
 *   }, []);
 *   useWSEvent("telemetry_update", handleTelemetry);
 */
export function useWSEvent<K extends WSEventType>(
  eventType: K,
  handler: (payload: WSEventMap[K]) => void,
): void {
  const { client } = useDashboardWS();

  useEffect(() => {
    if (client === null) return;
    const unsubscribe = client.on<WSEventMap[K]>(eventType, handler);
    return unsubscribe;
  }, [client, eventType, handler]);
}
