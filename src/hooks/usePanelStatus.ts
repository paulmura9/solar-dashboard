"use client";

import { useMemo } from "react";
import { derivePanelStatusData } from "@/lib/solar/status";
import type { SensorReading, PanelStatusData } from "@/lib/types";

export function usePanelStatus(reading: SensorReading | null): PanelStatusData | null {
  return useMemo(() => {
    if (!reading) return null;
    return derivePanelStatusData(reading);
  }, [reading]);
}
