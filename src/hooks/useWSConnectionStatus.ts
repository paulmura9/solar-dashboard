"use client";

import { useDashboardWS } from "@/components/providers/DashboardWSProvider";

/** True while the dashboard WebSocket is currently connected. */
export function useWSConnectionStatus(): boolean {
  return useDashboardWS().isConnected;
}
