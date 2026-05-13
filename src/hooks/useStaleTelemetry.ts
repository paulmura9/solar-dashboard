"use client";

import { useState, useEffect } from "react";

interface StaleTelemetryResult {
  isStale: boolean;
  secondsSinceLastReading: number | null;
}

export function useStaleTelemetry(
  timestamp: string | Date | null | undefined,
  thresholdMs = 30_000
): StaleTelemetryResult {
  const [now, setNow] = useState(() => Date.now());

  const hasTimestamp = timestamp != null;

  useEffect(() => {
    if (!hasTimestamp) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [hasTimestamp]);

  if (!hasTimestamp) {
    return { isStale: false, secondsSinceLastReading: null };
  }

  const tsMs =
    typeof timestamp === "string"
      ? new Date(timestamp).getTime()
      : timestamp.getTime();
  const diffMs = now - tsMs;

  return {
    isStale: diffMs > thresholdMs,
    secondsSinceLastReading: Math.round(diffMs / 1_000),
  };
}
