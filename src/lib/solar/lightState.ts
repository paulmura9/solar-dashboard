import { SOLAR_CONFIG } from "@/config/solarConfig";
import type { LightSensorData, WeatherData, LightState, TrackingMode } from "@/lib/types";

// computeLightState produces the display light-state. NIGHT is taken verbatim from the
// device (tracking_mode === "NIGHT" — the firmware decides it on-device from NTP time +
// sunrise/sunset and parks the panel). The frontend only INFERS the DARK case, which the
// firmware never reports as a mode: daytime low-light from clouds/shade.

/**
 * Decide the display light state.
 *
 * Priority:
 * 1. tracking_mode === "NIGHT"  → NIGHT (device is authoritative; LDR/time are not re-checked).
 * 2. Otherwise infer DARK: a MAJORITY VOTE (>= 3 of 4 sensors below the dark threshold, so a
 *    single shaded sensor can't force it) AND it is currently daytime per sunrise/sunset.
 * 3. Otherwise NORMAL.
 * 4. UNKNOWN when telemetry is stale, an LDR is missing, or sunrise/sunset is unavailable —
 *    rendered as no badge.
 */
export function computeLightState(
  trackingMode: TrackingMode | null,
  light: LightSensorData | null,
  weather: WeatherData | null,
  now: Date,
  isStale: boolean
): LightState {
  // 1. Device-reported NIGHT wins outright.
  if (trackingMode === "NIGHT") return "NIGHT";

  // 4. The DARK inference needs fresh LDRs and sun times.
  if (isStale || !light || !weather) return "UNKNOWN";
  const ldrs = [light.topLeft, light.topRight, light.bottomLeft, light.bottomRight];
  if (ldrs.some((v) => v == null)) return "UNKNOWN";
  if (!weather.sunrise || !weather.sunset) return "UNKNOWN";

  const belowCount = ldrs.filter((v) => (v as number) < SOLAR_CONFIG.ldr.darkThreshold).length;
  const isDark = belowCount >= 3;
  if (!isDark) return "NORMAL";

  const sunriseMs = new Date(weather.sunrise).getTime();
  const sunsetMs = new Date(weather.sunset).getTime();
  if (Number.isNaN(sunriseMs) || Number.isNaN(sunsetMs)) return "UNKNOWN";

  // 2. Low light during the day = DARK; low light at night without a device NIGHT report
  //    is left to the device (it will switch to NIGHT itself), so we stay NORMAL.
  const nowMs = now.getTime();
  const isDaytime = nowMs >= sunriseMs && nowMs <= sunsetMs;
  return isDaytime ? "DARK" : "NORMAL";
}

/**
 * Format a light-difference into magnitude + a direction arrow pointing toward the
 * BRIGHTER side, matching the firmware sign convention:
 *   hDiff = (TL + BL) - (TR + BR)  → positive = brighter LEFT,  negative = brighter RIGHT
 *   vDiff = (TL + TR) - (BL + BR)  → positive = brighter TOP,   negative = brighter BOTTOM
 *
 * Within the neutral band the sign is just noise, so no arrow is shown.
 *
 * The magnitude is rendered as a percentage of the maximum possible |diff|
 * (2 * LDR_ADC_MAX), so it reads on the same 0-100% scale as the per-sensor cells.
 * The neutral-band gate stays in raw ADC units to match the firmware deadband.
 */
function formatDirectionalDiff(
  diff: number | null,
  arrowPositive: string,
  arrowNegative: string
): string {
  if (diff == null) return "—";
  const rawMagnitude = Math.abs(diff);
  if (rawMagnitude < SOLAR_CONFIG.ldr.diffNeutralBand) return "—";
  const pct = Math.round((rawMagnitude / (2 * SOLAR_CONFIG.ldr.maxValue)) * 100);
  return diff > 0 ? `${arrowPositive} ${pct}%` : `${pct}% ${arrowNegative}`;
}

/**
 * Flag LDR readings that sit far below their peers — one shaded/blocked corner while the
 * rest of the panel sees light. Per sensor: compare it to the MEAN OF THE OTHER THREE and
 * flag it when that mean is meaningfully lit (>= the dark threshold, so uniform darkness is
 * never treated as an anomaly) AND the sensor is more than OUTLIER_DROP_PCT below it. Only
 * LOW outliers are flagged; null readings (and any with a null peer) are never flagged.
 *
 * Returns a boolean per input value, in the same order.
 */
export function detectLdrOutliers(values: (number | null)[]): boolean[] {
  return values.map((value, i) => {
    if (value == null) return false;
    const others = values.filter((_, j) => j !== i);
    if (others.some((o) => o == null)) return false;
    const meanOfOthers =
      (others as number[]).reduce((sum, o) => sum + o, 0) / others.length;
    if (meanOfOthers < SOLAR_CONFIG.ldr.darkThreshold) return false;
    return value < meanOfOthers * (1 - SOLAR_CONFIG.ldr.outlierDropPct / 100);
  });
}

export function formatHorizontalDiff(hDiff: number | null): string {
  return formatDirectionalDiff(hDiff, "←", "→");
}

export function formatVerticalDiff(vDiff: number | null): string {
  return formatDirectionalDiff(vDiff, "↑", "↓");
}
