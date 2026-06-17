import SunCalc from "suncalc";

// SunCalc reports angles in radians. Its azimuth is measured from SOUTH, clockwise
// toward WEST (0 = due south, +π/2 = west, -π/2 = east) and altitude is measured up
// from the horizon. We convert azimuth to a compass bearing from NORTH (clockwise)
// so the widget shares the AzimuthView convention used elsewhere on the dashboard.
const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const ARC_STEP_MINUTES = 12;

export interface SkyPoint {
  /** Compass bearing from north, clockwise, in degrees (0..360). */
  azimuth: number;
  /** Angle above the horizon in degrees (negative = below the horizon). */
  elevation: number;
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

export function sunPositionAt(date: Date, lat: number, lon: number): SkyPoint {
  const { azimuth, altitude } = SunCalc.getPosition(date, lat, lon);
  return {
    azimuth: (azimuth * RAD_TO_DEG + 180 + 360) % 360,
    elevation: altitude * RAD_TO_DEG,
  };
}

export function sunTimesAt(date: Date, lat: number, lon: number): SunTimes {
  const t = SunCalc.getTimes(date, lat, lon);
  return { sunrise: t.sunrise, sunset: t.sunset, solarNoon: t.solarNoon };
}

/**
 * Sample the sun's path between sunrise and sunset for the given day. Returns an
 * empty array at latitudes/dates where the sun never rises or sets (sunrise/sunset
 * are NaN), so the caller simply draws no arc rather than crashing.
 */
export function sunArc(lat: number, lon: number, times: SunTimes): SkyPoint[] {
  const start = times.sunrise.getTime();
  const end = times.sunset.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const stepMs = ARC_STEP_MINUTES * 60_000;
  const points: SkyPoint[] = [];
  for (let t = start; t <= end; t += stepMs) {
    points.push(sunPositionAt(new Date(t), lat, lon));
  }
  return points;
}

const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

// ───────────────────────────────────────────────────────────────────────────
// CANONICAL AZIMUTH CONVENTION (single source of truth — mirrored in CLAUDE.md).
// "horizontal angle" = the raw azimuth servo angle, 0..180, HOME at 90°.
// "azimuth"          = the cardinal compass bearing, NEVER the raw servo angle:
//     panel azimuth = horizontal_angle + 90      (range 90..270)
//     0°=E  /  90°=S  /  180°=W      HOME (servo 90°) aims at true South.
// The sun's azimuth comes from suncalc (0..360, measured from North).
// Never render this formula in the UI — show values only.
// ───────────────────────────────────────────────────────────────────────────

/** The panel's commanded compass (cardinal) azimuth, 90..270. */
export function panelBearing(horizontalAngle: number): number {
  return normalizeDeg(horizontalAngle + 90);
}

export interface PanelAlignment {
  /** Cardinal panel azimuth, 90..270. */
  cardinal: number;
  /** Human label, e.g. "Aimed at S" or "≈ S, +10° toward W". */
  label: string;
}

const PANEL_CARDINALS = [
  { label: "E" as const, deg: 90 },
  { label: "S" as const, deg: 180 },
  { label: "W" as const, deg: 270 },
];

/**
 * Cardinal alignment readout for the panel: nearest of {E,S,W} and the signed offset
 * toward a neighbouring cardinal. Shared by the compass card and the dome overlay —
 * do not re-implement the nearest-cardinal logic elsewhere.
 */
export function panelAlignment(horizontalAngle: number): PanelAlignment {
  const cardinal = panelBearing(horizontalAngle);
  let nearest = PANEL_CARDINALS[0];
  for (const c of PANEL_CARDINALS) {
    if (Math.abs(cardinal - c.deg) < Math.abs(cardinal - nearest.deg)) nearest = c;
  }
  const offset = Math.round(cardinal - nearest.deg); // signed: + = toward W
  if (Math.abs(offset) <= 5) return { cardinal, label: `Aimed at ${nearest.label}` };
  const dir = nearest.label === "S" ? (offset > 0 ? "W" : "E") : "S";
  return { cardinal, label: `≈ ${nearest.label}, +${Math.abs(offset)}° toward ${dir}` };
}

/** Eight-point compass label (N/NE/E/SE/S/SW/W/NW) for a 0..360 azimuth (the sun). */
export function compass8(azimuth: number): string {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(normalizeDeg(azimuth) / 45) % 8];
}

/** Plain azimuth delta between two bearings, wrapped to [0, 180]. */
export function azimuthDelta(a: number, b: number): number {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Orthographic projection of the sky hemisphere onto a vertical plane, viewed by an
 * observer facing the equator (due south in the northern hemisphere): east falls on
 * the left, west on the right, the zenith at the top. Returns fractional coordinates
 * with x in [-1, 1] (0 = due south) and y in [0, 1] (1 = zenith). Below-horizon
 * points are clamped to the horizon so a marker never drops off the dome.
 */
export function projectToDome(point: SkyPoint): { x: number; y: number } {
  const az = point.azimuth * DEG_TO_RAD;
  const el = Math.max(0, point.elevation) * DEG_TO_RAD;
  return {
    x: -Math.sin(az) * Math.cos(el),
    y: Math.sin(el),
  };
}

/**
 * Elevation of the panel's normal direction (0..90°) from the raw elevation
 * servo angle, HOME (90°) aiming at the zenith. Mirrors the firmware geometry.
 */
export function panelNormalElevation(verticalAngle: number): number {
  return Math.max(0, 90 - Math.abs(verticalAngle - 90));
}

/**
 * Great-circle angle (degrees) between two sky directions — the true pointing
 * error. 0° only when the panel normal points exactly at the sun, so it combines
 * azimuth AND elevation rather than azimuth alone.
 */
export function angularSeparation(a: SkyPoint, b: SkyPoint): number {
  const el1 = a.elevation * DEG_TO_RAD;
  const el2 = b.elevation * DEG_TO_RAD;
  const dAz = (a.azimuth - b.azimuth) * DEG_TO_RAD;
  const cos = Math.sin(el1) * Math.sin(el2) + Math.cos(el1) * Math.cos(el2) * Math.cos(dAz);
  return Math.acos(Math.min(1, Math.max(-1, cos))) * RAD_TO_DEG;
}
