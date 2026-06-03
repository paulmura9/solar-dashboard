"use client";

import { SOLAR_CONFIG } from "@/config/solarConfig";

interface AzimuthViewProps {
  azimuthAngle: number;
}

// 180° servo-angle compass: the azimuth servo sweeps 0° (left) → 90° (top) → 180° (right),
// mapped onto a half-dome arc; the needle screen-angle is (servo − 90°). The needle base is
// anchored exactly at the pivot (CX, BASE_Y) and the tip is computed by trig, so the base
// never drifts off-centre at any angle. Numeric degree labels only — the cardinal letters
// live on the Sky View dome card, keeping this a pure servo-angle instrument.
const CX = 120;
const BASE_Y = 120;
const R = 100;
const NEEDLE_LEN = Math.round(R * 0.84); // tip stays comfortably inside the arc
const LABEL_R = R + 8;
const TICK_SERVO_ANGLES = [0, 45, 90, 135, 180];

const { minAngle: H_MIN, maxAngle: H_MAX } = SOLAR_CONFIG.panel;

export default function AzimuthView({ azimuthAngle }: AzimuthViewProps) {
  const clamped = Math.min(H_MAX, Math.max(H_MIN, azimuthAngle));
  const rad = ((clamped - 90) * Math.PI) / 180;
  const dirX = Math.sin(rad);
  const dirY = -Math.cos(rad);
  const tipX = CX + NEEDLE_LEN * dirX;
  const tipY = BASE_Y + NEEDLE_LEN * dirY;
  const headX = CX + (NEEDLE_LEN - 12) * dirX;
  const headY = BASE_Y + (NEEDLE_LEN - 12) * dirY;
  const perpX = -dirY;
  const perpY = dirX;

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Horizontal</p>
      <div className="flex items-center justify-center">
        <svg width="240" height="150" viewBox="0 0 240 150">
          <path
            d={`M ${CX - R} ${BASE_Y} A ${R} ${R} 0 0 1 ${CX + R} ${BASE_Y} Z`}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <line x1={CX - R} y1={BASE_Y} x2={CX + R} y2={BASE_Y} stroke="#e2e8f0" strokeWidth="1.5" />

          {TICK_SERVO_ANGLES.map((servo) => {
            const tr = ((servo - 90) * Math.PI) / 180;
            return (
              <g key={servo}>
                <line
                  x1={CX + (R - 8) * Math.sin(tr)}
                  y1={BASE_Y - (R - 8) * Math.cos(tr)}
                  x2={CX + R * Math.sin(tr)}
                  y2={BASE_Y - R * Math.cos(tr)}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={CX + LABEL_R * Math.sin(tr)}
                  y={BASE_Y - LABEL_R * Math.cos(tr) + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#94a3b8"
                  fontFamily="inherit"
                >
                  {servo}°
                </text>
              </g>
            );
          })}

          {/* Counterweight + needle: base hard-anchored at the pivot (CX, BASE_Y), tip by trig */}
          <line x1={CX} y1={BASE_Y} x2={CX - 16 * dirX} y2={BASE_Y - 16 * dirY} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1={CX} y1={BASE_Y} x2={tipX} y2={tipY} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <polygon
            points={`${headX + 6 * perpX},${headY + 6 * perpY} ${tipX},${tipY} ${headX - 6 * perpX},${headY - 6 * perpY}`}
            fill="#3b82f6"
          />
          <circle cx={CX} cy={BASE_Y} r="5" fill="#3b82f6" />
          <circle cx={CX} cy={BASE_Y} r="2.5" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}
