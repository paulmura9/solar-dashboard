"use client";

import { useEffect, useRef } from "react";
import { useWSConnectionStatus } from "@/hooks/useWSConnectionStatus";

const RESYNC_DEBOUNCE_MS = 30_000;

export function useWSReconnectResync(resync: () => void): void {
  const isConnected = useWSConnectionStatus();
  const resyncRef = useRef(resync);
  const lastFiredRef = useRef<number>(0);
  const wasConnectedRef = useRef<boolean>(false);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { resyncRef.current = resync; }, [resync]);

  useEffect(() => {
    if (!isConnected) {
      wasConnectedRef.current = false;
      return;
    }

    if (wasConnectedRef.current) return;
    wasConnectedRef.current = true;

    const sinceLast = Date.now() - lastFiredRef.current;
    if (sinceLast >= RESYNC_DEBOUNCE_MS) {
      lastFiredRef.current = Date.now();
      resyncRef.current();
      return;
    }

    if (pendingTimerRef.current !== null) return;
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      lastFiredRef.current = Date.now();
      resyncRef.current();
    }, RESYNC_DEBOUNCE_MS - sinceLast);
  }, [isConnected]);

  useEffect(() => () => {
    if (pendingTimerRef.current !== null) clearTimeout(pendingTimerRef.current);
  }, []);
}
