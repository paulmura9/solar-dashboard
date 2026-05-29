import { SOLAR_CONFIG } from "@/config/solarConfig";
import type { LightSensorData, WeatherData, LightState } from "@/lib/types";

// computeLightState is the frontend interpretation of the four LDRs combined with
// astronomical sun times. Complementary to firmware tracking_mode — purely a display signal.

/**
 * Decide the light state from LDR readings + sunrise/sunset.
 *
 * isDark uses a MAJORITY VOTE (>= 3 of 4 sensors below the dark threshold) rather than
 * an average, so a single shaded/outlier sensor cannot drag the whole panel "dark".
 *
 * - NIGHT   sensors dark AND it is astronomically night (sensors and sun agree)
 * - DARK    sensors dark BUT the sun is up (clouds / shade / obstruction during daytime)
 * - NORMAL  sensors not dark
 * - UNKNOWN telemetry stale/unavailable, an LDR is missing, or sunrise/sunset is missing
 */
export function computeLightState(
  light: LightSensorData | null,
  weather: WeatherData | null,
  now: Date,
  isStale: boolean
): LightState {
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

  const nowMs = now.getTime();
  const isAstronomicalNight = nowMs < sunriseMs || nowMs > sunsetMs;
  return isAstronomicalNight ? "NIGHT" : "DARK";
}

/**
 * Format a light-difference into magnitude + a direction arrow pointing toward the
 * BRIGHTER side, matching the firmware sign convention:
 *   hDiff = (TL + BL) - (TR + BR)  → positive = brighter LEFT,  negative = brighter RIGHT
 *   vDiff = (TL + TR) - (BL + BR)  → positive = brighter TOP,   negative = brighter BOTTOM
 *
 * Within the neutral band the sign is just noise, so no arrow is shown.
 */
function formatDirectionalDiff(
  diff: number | null,
  arrowPositive: string,
  arrowNegative: string
): string {
  if (diff == null) return "—";
  const magnitude = Math.round(Math.abs(diff));
  if (magnitude < SOLAR_CONFIG.ldr.diffNeutralBand) return "—";
  return diff > 0 ? `${arrowPositive} ${magnitude}` : `${magnitude} ${arrowNegative}`;
}

export function formatHorizontalDiff(hDiff: number | null): string {
  return formatDirectionalDiff(hDiff, "←", "→");
}

export function formatVerticalDiff(vDiff: number | null): string {
  return formatDirectionalDiff(vDiff, "↑", "↓");
}
