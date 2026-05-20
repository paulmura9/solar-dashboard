"use client";

import { useEffect } from "react";
import { useDashboardWS } from "@/components/providers/DashboardWSProvider";
import type { WSEventMap, WSEventType } from "@/lib/ws/types";

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
