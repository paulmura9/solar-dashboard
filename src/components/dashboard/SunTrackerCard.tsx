"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sunPositionAt,
  sunTimesAt,
  sunArc,
  panelBearing,
  panelAlignment,
  compass8,
  panelNormalElevation,
  angularSeparation,
  projectToDome,
  type SkyPoint,
} from "@/lib/solar/sunPosition";
import { formatHorizontalDiff, formatVerticalDiff, isOnSun } from "@/lib/solar/lightState";
import type { LightState } from "@/lib/types";

interface SunTrackerCardProps {
  /** latest.horizontal_angle (raw azimuth servo, 0..180), or null when unavailable. */
  panelAzimuth: number | null;
  /** latest.vertical_angle, or null when telemetry is unavailable. */
  panelElevation: number | null;
  latitude: number;
  longitude: number;
  /** Latest LDR balance errors, same telemetry that feeds PanelControlCard. */
  lightDiffs?: { horizontal: number | null; vertical: number | null };
  /** Display light state (computeLightState); guidance only shows when NORMAL. */
  lightState?: LightState;
}

const VIEW_X = 35;
const VIEW_Y = 8;
const VIEW_W = 330;
const VIEW_H = 182;
const CX = 200;
const HORIZON_Y = 180;
const DOME_R = 150;
const ELEVATION_GUIDES = [30, 60];
const REFRESH_MS = 60_000;
const ALIGNED_OFFSET_DEG = 10;

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
  lightDiffs,
  lightState,
}: SunTrackerCardProps) {
  const bucket = useSyncExternalStore(subscribeClock, clockBucket, serverClock);
  const now = useMemo(() => (bucket == null ? null : new Date()), [bucket]);

  const sky = useMemo(() => {
    if (!now) return null;
    const times = sunTimesAt(now, latitude, longitude);
    const sun = sunPositionAt(now, latitude, longitude);
    const arc = sunArc(latitude, longitude, times);
    return { times, sun, arc };
  }, [now, latitude, longitude]);

  const sunUp = sky != null && sky.sun.elevation > 0;
  const sunAzimuth = sunUp ? sky!.sun.azimuth : null;
  const sunAltitude = sunUp ? sky!.sun.elevation : null;

  const panelCardinalAz = panelAzimuth != null ? panelBearing(panelAzimuth) : null;
  const align = panelAzimuth != null ? panelAlignment(panelAzimuth) : null;

  const panelSky: SkyPoint | null =
    panelCardinalAz != null && panelElevation != null
      ? { azimuth: panelCardinalAz, elevation: panelNormalElevation(panelElevation) }
      : null;
  const panelEl = panelSky?.elevation ?? null;

  const pointingError =
    sunUp && panelSky != null ? angularSeparation(panelSky, sky!.sun) : null;
  const aligned = pointingError != null && pointingError <= ALIGNED_OFFSET_DEG;

  const panelTip = panelSky != null ? toPixels(panelSky) : null;

  const hDiff = lightDiffs?.horizontal ?? null;
  const vDiff = lightDiffs?.vertical ?? null;
  const showGuidance = sunUp && lightState === "NORMAL";
  const onSun = isOnSun(hDiff, vDiff);

  let sunPx: { x: number; y: number } | null = null;
  let offArcBadge: string | null = null;
  let offArcSide: "E" | "W" | null = null;
  if (sunUp) {
    const az = sky!.sun.azimuth;
    if (az >= 90 && az <= 270) {
      sunPx = toPixels(sky!.sun);
    } else if (az < 90) {
      sunPx = { x: CX - DOME_R, y: HORIZON_Y };
      offArcBadge = "Sun outside panel range";
      offArcSide = "E";
    } else {
      sunPx = { x: CX + DOME_R, y: HORIZON_Y };
      offArcBadge = "Sun outside panel range";
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
          <span className="flex items-center gap-2">
            <span>Sky View — Sun Tracker</span>
            {aligned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                Aligned
              </span>
            )}
          </span>
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
        <div className="mb-3 space-y-1.5 text-[13px] text-[#1e293b]">
          <div>
            <span className="text-[#64748b]">Panel azimuth</span>{" "}
            <span className="font-semibold">{panelCardinalAz != null ? `${Math.round(panelCardinalAz)}°` : "—"}</span>
            {align && <span className="text-[#64748b]">{"  "}({align.label})</span>}
            <span className="block text-[11px] text-[#94a3b8]">
              servo {panelAzimuth != null ? `${Math.round(panelAzimuth)}°` : "—"}
              {panelEl != null ? ` · elev ${Math.round(panelEl)}°` : ""}
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

        <div className="relative mx-auto w-full max-w-2xl">
          <svg
            viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
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

            <path
              d={`M ${CX - DOME_R} ${HORIZON_Y} A ${DOME_R} ${DOME_R} 0 0 1 ${CX + DOME_R} ${HORIZON_Y} Z`}
              fill="#d7e3f2"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

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

            <line x1={CX - DOME_R} y1={HORIZON_Y} x2={CX + DOME_R} y2={HORIZON_Y} stroke="#94a3b8" strokeWidth="1.5" />
            <text x={CX - DOME_R - 4} y={HORIZON_Y + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight="600">E</text>
            <text x={CX + DOME_R + 4} y={HORIZON_Y + 4} textAnchor="start" fontSize="11" fill="#64748b" fontWeight="600">W</text>
            <text x={CX} y={HORIZON_Y - DOME_R - 6} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">S</text>

            <HorizonSun x={CX - DOME_R + 12} color="#f59e0b" />
            <HorizonSun x={CX + DOME_R - 12} color="#f97316" />

            {sky && (
              <>
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

                {panelTip && (
                  <g>
                    {aligned && <circle cx={panelTip.x} cy={panelTip.y} r="11" fill="#22c55e" opacity="0.18" />}
                    <line x1={CX} y1={HORIZON_Y} x2={panelTip.x} y2={panelTip.y} stroke={aligned ? "#22c55e" : "#3b82f6"} strokeWidth="2.5" strokeLinecap="round" />
                    <g transform={`translate(${panelTip.x}, ${panelTip.y}) rotate(45)`}>
                      <rect x="-5" y="-5" width="10" height="10" fill={aligned ? "#22c55e" : "#3b82f6"} rx="1.5" />
                      <rect x="-2" y="-2" width="4" height="4" fill="#ffffff" rx="0.5" />
                    </g>
                    <circle cx={CX} cy={HORIZON_Y} r="3" fill="#3b82f6" />
                  </g>
                )}

                {sunPx && (
                  <g filter="url(#sun-glow)">
                    <circle cx={sunPx.x} cy={sunPx.y} r="7" fill="#fbbf24" />
                    <circle cx={sunPx.x} cy={sunPx.y} r="3.5" fill="#f59e0b" />
                  </g>
                )}
              </>
            )}
          </svg>

          {offArcBadge && (
            <div
              className={`absolute bottom-2 ${offArcSide === "E" ? "left-2" : "right-2"} rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-2 py-0.5 text-[10px] text-[#64748b]`}
            >
              {offArcBadge}
            </div>
          )}
        </div>

        {showGuidance && (
          <div className="mt-3 flex min-h-[20px] items-center justify-center">
            {onSun ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                <Check size={11} />
                On sun
              </span>
            ) : (
              <div className="flex items-center gap-x-4 text-[11px] tabular-nums">
                <span className="flex items-center gap-1">
                  <span className="uppercase tracking-wider text-[#94a3b8]">Azimuth</span>
                  <span className="font-mono font-medium text-[#1e293b]">{formatHorizontalDiff(hDiff)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="uppercase tracking-wider text-[#94a3b8]">Elevation</span>
                  <span className="font-mono font-medium text-[#1e293b]">{formatVerticalDiff(vDiff)}</span>
                </span>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-[10px] leading-snug text-[#94a3b8]">
          Calibration: press Reset Position to center the panel (90°/90°), then physically rotate
          the whole base until the panel faces true South.
        </p>

        <div className="mt-3 flex justify-center gap-16 text-xs">
          <Stat label="Daylight" value={sunStatus} />
          <Stat
            label="Pointing error"
            value={pointingError != null ? `${Math.round(pointingError)}°` : "—"}
            valueClassName={aligned ? "text-[#22c55e]" : undefined}
          />
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

function Stat({
  label,
  value,
  valueClassName = "text-[#1e293b]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[#94a3b8] uppercase tracking-wider text-[10px]">{label}</span>
      <span className={`font-mono font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}
