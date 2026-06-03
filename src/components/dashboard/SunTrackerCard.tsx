"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sunPositionAt,
  sunTimesAt,
  sunArc,
  panelSkyPoint,
  projectToDome,
  angularSeparation,
  type SkyPoint,
} from "@/lib/solar/sunPosition";

interface SunTrackerCardProps {
  /** latest.horizontal_angle, or null when telemetry is unavailable. */
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

/** Project a sky point into SVG pixel coordinates within the dome. */
function toPixels(point: SkyPoint): { x: number; y: number } {
  const { x, y } = projectToDome(point);
  return { x: CX + x * DOME_R, y: HORIZON_Y - y * DOME_R };
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
    const panel =
      panelAzimuth != null && panelElevation != null
        ? panelSkyPoint(panelAzimuth, panelElevation)
        : null;
    const offset = panel && sun.elevation > 0 ? angularSeparation(sun, panel) : null;
    return { times, sun, arc, panel, offset };
  }, [now, latitude, longitude, panelAzimuth, panelElevation]);

  const sunUp = sky != null && sky.sun.elevation > 0;
  const sunPx = sunUp ? toPixels(sky!.sun) : null;
  const panelPx = sky?.panel ? toPixels(sky.panel) : null;

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
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Sky dome showing the real sun position versus the panel's commanded direction"
        >
          <defs>
            <radialGradient id="sky-fill" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="35%" stopColor="#e8eef6" />
              <stop offset="100%" stopColor="#d3e0f0" />
            </radialGradient>
            <filter id="sun-glow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Dome atmosphere */}
          <path
            d={`M ${CX - DOME_R} ${HORIZON_Y} A ${DOME_R} ${DOME_R} 0 0 1 ${CX + DOME_R} ${HORIZON_Y} Z`}
            fill="url(#sky-fill)"
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
          <line
            x1={CX - DOME_R}
            y1={HORIZON_Y}
            x2={CX + DOME_R}
            y2={HORIZON_Y}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <text x={CX - DOME_R - 4} y={HORIZON_Y + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight="600">E</text>
          <text x={CX + DOME_R + 4} y={HORIZON_Y + 4} textAnchor="start" fontSize="11" fill="#64748b" fontWeight="600">W</text>
          <text x={CX} y={HORIZON_Y - DOME_R - 6} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">S</text>

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

              {/* Offset connector between panel and sun */}
              {sunPx && panelPx && (
                <line
                  x1={sunPx.x}
                  y1={sunPx.y}
                  x2={panelPx.x}
                  y2={panelPx.y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}

              {/* Panel commanded direction */}
              {panelPx && (
                <g transform={`translate(${panelPx.x}, ${panelPx.y}) rotate(45)`}>
                  <rect x="-5" y="-5" width="10" height="10" fill="#3b82f6" rx="1.5" />
                  <rect x="-2" y="-2" width="4" height="4" fill="#ffffff" rx="0.5" />
                </g>
              )}

              {/* Real sun position now */}
              {sunPx && (
                <g filter="url(#sun-glow)">
                  <circle cx={sunPx.x} cy={sunPx.y} r="7" fill="#fbbf24" />
                  <circle cx={sunPx.x} cy={sunPx.y} r="3.5" fill="#f59e0b" />
                </g>
              )}
            </>
          )}
        </svg>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
          <Stat label="Sun azimuth" value={sunUp ? `${Math.round(sky!.sun.azimuth)}°` : "—"} />
          <Stat label="Sun elevation" value={sunUp ? `${Math.round(sky!.sun.elevation)}°` : "Below horizon"} />
          <Stat label="Daylight" value={sunStatus} />
          <Stat
            label="Panel offset"
            value={sky?.offset != null ? `${Math.round(sky.offset)}°` : "—"}
          />
        </div>
      </CardContent>
    </Card>
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
