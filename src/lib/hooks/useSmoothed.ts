import { useState } from "react";

/** Exponential moving average over a live numeric stream. Damps per-second jitter
 *  (sensor noise / servo transients) on values that should look stable, without
 *  touching telemetry. Keeps the last value when the input is momentarily null. */
export function useSmoothed(value: number | null, alpha = 0.2): number | null {
  const [s, setS] = useState<number | null>(value);
  const [seen, setSeen] = useState<number | null>(value);
  // Advance the average during render when a new reading arrives — the canonical
  // React way to derive state from a changing prop (no effect, no cascading render).
  if (value != null && value !== seen) {
    setSeen(value);
    setS((cur) => (cur == null ? value : cur + alpha * (value - cur)));
  }
  return s;
}
