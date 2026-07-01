import type { SensorReading } from "@/lib/types";

// Window over which we fit the battery_percent slope. Long enough that an
// integer-percent series reveals a real trend, short enough to reflect the
// current drain rather than an hours-old average.
const DRAIN_WINDOW_MINUTES = 45;
// The fit needs at least this much time spread to be meaningful; a slope from
// a couple of minutes of data (device just came online) is noise.
const MIN_SPAN_MINUTES = 15;
// Below this |slope| the estimate is dominated by the 1% quantisation of
// battery_percent, so we refuse to divide and report time-left as unbounded.
const MIN_RATE_PCT_PER_H = 0.2;

const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

export interface DischargeEstimate {
  /** Drain magnitude in percent-per-hour (always > 0). */
  ratePctPerHour: number;
  /** Hours until empty at the current rate, or null when the rate is too small to divide by. */
  timeLeftHours: number | null;
}

interface Sample {
  t: number;
  pct: number;
}

/** Estimate the battery discharge rate and time-left from recent history.
 *  Returns null when there isn't enough data, or when the panel isn't actually
 *  draining (flat or rising trend). Everything is derived client-side from the
 *  existing readings history — no extra telemetry. */
export function estimateDischarge(
  history: readonly SensorReading[],
  currentPercent: number,
): DischargeEstimate | null {
  const samples: Sample[] = [];
  for (const r of history) {
    if (r.battery_percent == null) continue;
    const t = new Date(r.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    samples.push({ t, pct: r.battery_percent });
  }
  if (samples.length < 2) return null;

  samples.sort((a, b) => a.t - b.t);
  const latestT = samples[samples.length - 1].t;
  const window = samples.filter((s) => s.t >= latestT - DRAIN_WINDOW_MINUTES * MS_PER_MINUTE);
  if (window.length < 2) return null;
  if (latestT - window[0].t < MIN_SPAN_MINUTES * MS_PER_MINUTE) return null;

  // Least-squares slope of pct vs. time, stable against the integer
  // quantisation of battery_percent unlike a point-to-point delta.
  const slope = linearSlopePerHour(window);
  if (slope == null || slope >= 0) return null; // flat or charging up -> not draining

  const ratePctPerHour = -slope;
  if (ratePctPerHour < MIN_RATE_PCT_PER_H) {
    return { ratePctPerHour, timeLeftHours: null };
  }
  return { ratePctPerHour, timeLeftHours: currentPercent / ratePctPerHour };
}

/** Slope of pct vs. time in percent-per-hour, or null when there is no time spread. */
function linearSlopePerHour(samples: readonly Sample[]): number | null {
  const t0 = samples[0].t;
  const n = samples.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const s of samples) {
    const x = (s.t - t0) / MS_PER_HOUR;
    const y = s.pct;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}
