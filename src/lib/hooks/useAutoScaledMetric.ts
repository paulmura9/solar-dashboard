import { useState } from "react";
import { scaleMetric, type BaseUnit, type ScaledMetric } from "@/lib/solar/energy";

/** Auto-scales a live base SI value (W/A/Wh) to mW/mA/mWh or W/A/Wh, remembering
 *  the last chosen unit so the display gets hysteresis around the 1000-milli
 *  boundary instead of flickering. Returns null while the value is absent so the
 *  caller can keep its existing "—" rendering; the unit is preserved across gaps. */
export function useAutoScaledMetric(
  base: number | null | undefined,
  baseUnit: BaseUnit
): ScaledMetric | null {
  const [prevUnit, setPrevUnit] = useState<string | undefined>(undefined);

  if (base == null) return null;

  const metric = scaleMetric(base, baseUnit, prevUnit);
  // Adjust stored unit during render (React's pattern for previous-render info):
  // re-renders immediately with the new unit so the next hysteresis check is stable.
  if (metric.unit !== prevUnit) setPrevUnit(metric.unit);
  return metric;
}
