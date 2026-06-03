"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import {
  sunPositionAt,
  sunTimesAt,
  sunArc,
  panelBearing,
  panelAlignment,
  compass8,
  azimuthDelta,
  projectToDome,
  type SkyPoint,
} from "@/lib/solar/sunPosition";

interface SunTrackerCardProps {
  /** latest.horizontal_angle (raw azimuth servo, 0..180), or null when unavailable. */
  panelAzimuth: number | null;
  /** latest.vertical_angle, or null when telemetry is unavailable. */
  panelElevation: number | null;
  latitude: number;
  longitude: number;
}

// SVG geometry: a 2:1 half-dome. The semicircle is centred on the horizon line.
const VIEW_W = 400;
const VIEW_H = 210;
const CX = 200;
const HORIZON_Y = 180;
const DOME_R = 150;
const ELEVATION_GUIDES = [30, 60]; // degrees, drawn as faint reference curves
const REFRESH_MS = 60_000;
const { minAngle: H_MIN, maxAngle: H_MAX } = SOLAR_CONFIG.panel;

/** Project a sky point into SVG pixel coordinates within the dome. */
function toPixels(point: SkyPoint): { x: number; y: number } {
  const { x, y } = projectToDome(point);
  return { x: CX + x * DOME_R, y: HORIZON_Y - y * DOME_R };
}

/**
 * Panel marker tip on the E–S–W dome: horizontal_angle sets the angle along the arc
 * (servo − 90°, so H_MIN → E/left, 90° → S/top, H_MAX → W/right) and the elevation
 * servo sets the radius (90° → full radius on the arc, 0°/180° → the horizon centre).
 * Always lands inside the semicircle, anchored at the centre baseline.
 */
function panelNeedleTip(horizontalAngle: number, verticalAngle: number): { x: number; y: number } {
  const clampedH = Math.min(H_MAX, Math.max(H_MIN, horizontalAngle));
  const elevation = Math.max(0, 90 - Math.abs(verticalAngle - 90)); // panel-normal elevation, 0..90
  const radius = (elevation / 90) * DOME_R;
  const angle = ((clampedH - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.sin(angle), y: HORIZON_Y - radius * Math.cos(angle) };
}

function pointsToPolyline(points: SkyPoint[]): string {
  return points
    .map((p) => {
      const { x, y } = toPixels(p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** A constant-elevation reference curve sweeping the front hemisphere (E → S → W). */
function elevationGuide(elevation: number): string {
  const pts: SkyPoint[] = [];
  for (let azimuth = 90; azimuth <= 270; azimuth += 5) {
    pts.push({ azimuth, elevation });
  }
  return pointsToPolyline(pts);
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h <= 0 ? `${m}m` : `${h}h ${m}m`;
}

// A minute-bucketed clock. getSnapshot is stable within a bucket (no render loop),
// the interval advances it, and getServerSnapshot returns null so SSR and the first
// client render agree (no hydration mismatch) before the live value takes over.
function subscribeClock(onChange: () => void): () => void {
  const id = setInterval(onChange, REFRESH_MS);
  return () => clearInterval(id);
}
function clockBucket(): number {
  return Math.floor(Date.now() / REFRESH_MS);
}
function serverClock(): null {
  return null;
}

export default function SunTrackerCard({
  panelAzimuth,
  panelElevation,
  latitude,
  longitude,
}: SunTrackerCardProps) {
  // Bucket changes on mount and once per minute; null on the server.
  const bucket = useSyncExternalStore(subscribeClock, clockBucket, serverClock);
  const now = useMemo(() => (bucket == null ? null : new Date()), [bucket]);

  const sky = useMemo(() => {
    if (!now) return null;
    const times = sunTimesAt(now, latitude, longitude);
    const sun = sunPositionAt(now, latitude, longitude);
    const arc = sunArc(latitude, longitude, times);
    // AZIMUTH OFFSET (point 7): plain cardinal-azimuth delta wrapped to [0, 180].
    const offset =
      panelAzimuth != null && sun.elevation > 0
        ? azimuthDelta(panelBearing(panelAzimuth), sun.azimuth)
        : null;
    return { times, sun, arc, offset };
  }, [now, latitude, longitude, panelAzimuth]);

  const sunUp = sky != null && sky.sun.elevation > 0;
  const sunAzimuth = sunUp ? sky!.sun.azimuth : null;
  const sunAltitude = sunUp ? sky!.sun.elevation : null;

  const panelCardinalAz = panelAzimuth != null ? panelBearing(panelAzimuth) : null;
  const align = panelAzimuth != null ? panelAlignment(panelAzimuth) : null;

  const panelTip =
    panelAzimuth != null && panelElevation != null
      ? panelNeedleTip(panelAzimuth, panelElevation)
      : null;

  // Sun marker. The arc only spans cardinal azimuth [90, 270]; when the real sun is
  // north of E/W (azimuth < 90 or > 270) the panel can't reach it, so we pin the marker
  // to the nearest endpoint and flag it with an off-arc badge instead of silently clamping.
  let sunPx: { x: number; y: number } | null = null;
  let offArcBadge: string | null = null;
  let offArcSide: "E" | "W" | null = null;
  if (sunUp) {
    const az = sky!.sun.azimuth;
    if (az >= 90 && az <= 270) {
      sunPx = toPixels(sky!.sun);
    } else if (az < 90) {
      sunPx = { x: CX - DOME_R, y: HORIZON_Y };
      offArcBadge = `off-arc · +${Math.round(90 - az)}° N of E`;
      offArcSide = "E";
    } else {
      sunPx = { x: CX + DOME_R, y: HORIZON_Y };
      offArcBadge = `off-arc · +${Math.round(az - 270)}° N of W`;
      offArcSide = "W";
    }
  }

  let sunStatus = "—";
  if (sky && now) {
    if (sunUp) {
      sunStatus = `Sets in ${formatDuration(sky.times.sunset.getTime() - now.getTime())}`;
    } else if (now.getTime() < sky.times.sunrise.getTime()) {
      sunStatus = `Rises in ${formatDuration(sky.times.sunrise.getTime() - now.getTime())}`;
    } else {
      sunStatus = "Sun has set";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[#1e293b] flex items-center justify-between">
          <span>Sky View — Sun Tracker</span>
          <span className="flex items-center gap-3 text-xs font-normal text-[#64748b]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
              Sun
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rotate-45 bg-[#3b82f6]" />
              Panel
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Cardinal-first readout (azimuth is the headline, raw servo is the detail) */}
        <div className="mb-3 space-y-1.5 text-[13px] text-[#1e293b]">
          <div>
            <span className="text-[#64748b]">Panel azimuth</span>{" "}
            <span className="font-semibold">{panelCardinalAz != null ? `${Math.round(panelCardinalAz)}°` : "—"}</span>
            {align && <span className="text-[#64748b]">{"  "}({align.label})</span>}
            <span className="block text-[11px] text-[#94a3b8]">
              servo {panelAzimuth != null ? `${Math.round(panelAzimuth)}°` : "—"}
            </span>
          </div>
          <div>
            <span className="text-[#64748b]">Sun azimuth</span>{" "}
            <span className="font-semibold">{sunAzimuth != null ? `${Math.round(sunAzimuth)}°` : "—"}</span>
            {sunAzimuth != null ? (
              <span className="text-[#64748b]">
                {"  "}(≈ {compass8(sunAzimuth)}) · alt {Math.round(sunAltitude!)}°
                {Math.abs(sunAltitude!) < 2 ? " (at horizon)" : ""}
              </span>
            ) : (
              <span className="text-[#64748b]">{"  "}below horizon</span>
            )}
          </div>
        </div>

        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full h-auto"
            role="img"
            aria-label="Sky dome showing the real sun position versus the panel's commanded direction"
          >
            <defs>
              <filter id="sun-glow" x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Dome atmosphere: uniform muted blue (no warm gradient) */}
            <path
              d={`M ${CX - DOME_R} ${HORIZON_Y} A ${DOME_R} ${DOME_R} 0 0 1 ${CX + DOME_R} ${HORIZON_Y} Z`}
              fill="#d7e3f2"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* Elevation reference curves */}
            {ELEVATION_GUIDES.map((el) => (
              <polyline
                key={el}
                points={elevationGuide(el)}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="0.75"
                strokeDasharray="3 3"
                opacity="0.7"
              />
            ))}

            {/* Horizon line + cardinal markers */}
            <line x1={CX - DOME_R} y1={HORIZON_Y} x2={CX + DOME_R} y2={HORIZON_Y} stroke="#94a3b8" strokeWidth="1.5" />
            <text x={CX - DOME_R - 4} y={HORIZON_Y + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight="600">E</text>
            <text x={CX + DOME_R + 4} y={HORIZON_Y + 4} textAnchor="start" fontSize="11" fill="#64748b" fontWeight="600">W</text>
            <text x={CX} y={HORIZON_Y - DOME_R - 6} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">S</text>

            {/* Sunrise glyph at East, sunset glyph at West (endpoint markers) */}
            <HorizonSun x={CX - DOME_R + 12} color="#f59e0b" />
            <HorizonSun x={CX + DOME_R - 12} color="#f97316" />

            {sky && (
              <>
                {/* Sun path for today */}
                {sky.arc.length > 1 && (
                  <polyline
                    points={pointsToPolyline(sky.arc)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.25"
                    strokeOpacity="0.45"
                    strokeDasharray="2 3"
                  />
                )}

                {/* Panel commanded direction: needle from the dome centre to a diamond tip */}
                {panelTip && (
                  <g>
                    <line x1={CX} y1={HORIZON_Y} x2={panelTip.x} y2={panelTip.y} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    <g transform={`translate(${panelTip.x}, ${panelTip.y}) rotate(45)`}>
                      <rect x="-5" y="-5" width="10" height="10" fill="#3b82f6" rx="1.5" />
                      <rect x="-2" y="-2" width="4" height="4" fill="#ffffff" rx="0.5" />
                    </g>
                    <circle cx={CX} cy={HORIZON_Y} r="3" fill="#3b82f6" />
                  </g>
                )}

                {/* Real sun position now (glyph only — no text label) */}
                {sunPx && (
                  <g filter="url(#sun-glow)">
                    <circle cx={sunPx.x} cy={sunPx.y} r="7" fill="#fbbf24" />
                    <circle cx={sunPx.x} cy={sunPx.y} r="3.5" fill="#f59e0b" />
                  </g>
                )}
              </>
            )}
          </svg>

          {/* Off-arc badge: sun is up but north of the panel's reachable E–W range */}
          {offArcBadge && (
            <div
              className={`absolute bottom-2 ${offArcSide === "E" ? "left-2" : "right-2"} rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800`}
            >
              {offArcBadge}
            </div>
          )}
        </div>

        <p className="mt-3 text-[10px] leading-snug text-[#94a3b8]">
          Calibration: set the panel to HOME (servo 90°), then physically rotate the whole base
          until it faces true South. Use Reset Position to send it to 90°.
        </p>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs">
          <Stat label="Sun azimuth" value={sunAzimuth != null ? `${Math.round(sunAzimuth)}°` : "—"} />
          <Stat label="Sun elevation" value={sunAltitude != null ? `${Math.round(sunAltitude)}°` : "Below horizon"} />
          <Stat label="Daylight" value={sunStatus} />
          <Stat label="Azimuth offset" value={sky?.offset != null ? `${Math.round(sky.offset)}°` : "—"} />
        </div>
      </CardContent>
    </Card>
  );
}

/** A small half-sun resting on the horizon line, used to mark sunrise (E) and sunset (W). */
function HorizonSun({ x, color }: { x: number; color: string }) {
  const r = 6;
  const rays = [-50, -25, 0, 25, 50];
  return (
    <g>
      <path d={`M ${x - r} ${HORIZON_Y} A ${r} ${r} 0 0 1 ${x + r} ${HORIZON_Y} Z`} fill={color} />
      {rays.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={x + (r + 2) * Math.sin(rad)}
            y1={HORIZON_Y - (r + 2) * Math.cos(rad)}
            x2={x + (r + 5) * Math.sin(rad)}
            y2={HORIZON_Y - (r + 5) * Math.cos(rad)}
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[#94a3b8] uppercase tracking-wider text-[10px]">{label}</span>
      <span className="font-mono font-semibold text-[#1e293b]">{value}</span>
    </div>
  );
}
