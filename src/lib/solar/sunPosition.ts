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

/**
 * The panel's commanded compass bearing. Mounting assumption (matching AzimuthView):
 * the azimuth servo's HOME (90°) aims the panel at true South, sweeping 0° → East and
 * 180° → West, so the compass bearing is the servo angle + 90°. This is the single
 * source of that "+90" mapping — reuse it, do not re-derive it elsewhere.
 */
export function panelBearing(horizontalAngle: number): number {
  return normalizeDeg(horizontalAngle + 90);
}

/** Nearest of the three visible cardinals (E/S/W) within ±22.5°, or null if between two. */
export function closestCardinal(bearing: number): "E" | "S" | "W" | null {
  const cardinals: { label: "E" | "S" | "W"; deg: number }[] = [
    { label: "E", deg: 90 },
    { label: "S", deg: 180 },
    { label: "W", deg: 270 },
  ];
  const hit = cardinals.find((c) => Math.abs(normalizeDeg(bearing) - c.deg) <= 22.5);
  return hit ? hit.label : null;
}

/**
 * Map the panel's two servo angles to the sky direction its face points at. The
 * azimuth comes from {@link panelBearing}. The elevation servo sweeps the face from
 * the horizon (0°) through the zenith (90°) to the opposite horizon (180°); past 90°
 * the face points across the zenith, so the bearing flips by 180°. There is no encoder
 * feedback — this is the commanded pointing direction, not a measured one.
 */
export function panelSkyPoint(horizontalAngle: number, verticalAngle: number): SkyPoint {
  const bearing = panelBearing(horizontalAngle);
  if (verticalAngle <= 90) {
    return { azimuth: bearing, elevation: verticalAngle };
  }
  return { azimuth: normalizeDeg(bearing + 180), elevation: 180 - verticalAngle };
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

/** Great-circle angle between two sky directions, in degrees. */
export function angularSeparation(a: SkyPoint, b: SkyPoint): number {
  const toUnitVector = (p: SkyPoint): [number, number, number] => {
    const az = p.azimuth * DEG_TO_RAD;
    const el = p.elevation * DEG_TO_RAD;
    return [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
  };
  const [ax, ay, az] = toUnitVector(a);
  const [bx, by, bz] = toUnitVector(b);
  const dot = ax * bx + ay * by + az * bz;
  return Math.acos(Math.min(1, Math.max(-1, dot))) * RAD_TO_DEG;
}
