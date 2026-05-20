"use client";

import { useDashboardWS } from "@/components/providers/DashboardWSProvider";

export function useWSConnectionStatus(): boolean {
  return useDashboardWS().isConnected;
}
