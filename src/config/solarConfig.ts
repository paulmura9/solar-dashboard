const FALLBACK_LAT = 45.7489;
const FALLBACK_LON = 21.2087;

const rawLat = process.env.NEXT_PUBLIC_LOCATION_LAT;
const rawLon = process.env.NEXT_PUBLIC_LOCATION_LON;
const parsedLat = rawLat != null ? parseFloat(rawLat) : NaN;
const parsedLon = rawLon != null ? parseFloat(rawLon) : NaN;

if (process.env.NODE_ENV === "development") {
  if (rawLat == null || isNaN(parsedLat)) {
    console.warn(`solarConfig: NEXT_PUBLIC_LOCATION_LAT is missing or invalid, using fallback ${FALLBACK_LAT}`); // dev: optional env warning
  }
  if (rawLon == null || isNaN(parsedLon)) {
    console.warn(`solarConfig: NEXT_PUBLIC_LOCATION_LON is missing or invalid, using fallback ${FALLBACK_LON}`); // dev: optional env warning
  }
}

const locationLat = rawLat != null && !isNaN(parsedLat) ? parsedLat : FALLBACK_LAT;
const locationLon = rawLon != null && !isNaN(parsedLon) ? parsedLon : FALLBACK_LON;

export const SOLAR_CONFIG = {
  ldr: {
    maxValue: 4095,
    nightThreshold: 100,
    lowLightThreshold: 500,
    balanceDeadband: 50,
    // Per-sensor "this side is dark" threshold for the Night/Dark light-state indicator.
    // Tune after LDR calibration; intentionally separate from lowLightThreshold.
    darkThreshold: 500,
    // |H/V diff| below this is treated as balanced noise (matches firmware LDR_DEADBAND);
    // no direction arrow is shown within this band.
    diffNeutralBand: 350,
    // A sensor reading at least this percent below the mean of the other three is flagged
    // as a low outlier (one shaded/blocked corner while the rest see light).
    outlierDropPct: 40,
  },
  battery: {
    // Header icon tiers (estimated charge level → battery glyph).
    fullPercent: 80,
    mediumPercent: 40,
    // Color tiers for the percent hero number and fill bar.
    goodPercent: 70,
    lowColorPercent: 30,
    // Low/critical warning thresholds. The warning is derived client-side from
    // the estimated percent; battery_status no longer carries LOW/CRITICAL.
    warningPercent: 30,
    criticalPercent: 15,
  },
  dirt: {
    cleanThreshold: 20,
    warningThreshold: 50,
  },
  chart: {
    downsampleDashboard: 60,
    downsampleAnalytics: 120,
  },
  storage: {
    signedUrlTtlSeconds: 3600,
  },
  weather: {
    cloudCoverWarningPercent: 60,
    locationLat,
    locationLon,
    timezone: "Europe/Bucharest",
  },
  panel: {
    minAngle: 0,
    maxAngle: 180,
    stepAngle: 5,
    peakPowerW: 4.2,
    daylightHoursDefault: 6.0,
    maxLossFactor: 0.85,
  },
} as const;
