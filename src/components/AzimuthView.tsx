"use client";

import { SOLAR_CONFIG } from "@/config/solarConfig";

interface AzimuthViewProps {
  azimuthAngle: number;
}

const CX = 120;
const BASE_Y = 120;
const R = 100;
const NEEDLE_LEN = Math.round(R * 0.84);
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
        <svg viewBox="0 0 240 150" className="w-full max-w-[240px] h-auto" aria-label="Panel horizontal servo angle">
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

          <line x1={CX} y1={BASE_Y} x2={CX - 16 * dirX} y2={BASE_Y - 16 * dirY} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1={CX} y1={BASE_Y} x2={tipX} y2={tipY} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <polygon
            points={`${headX + 6 * perpX},${headY + 6 * perpY} ${tipX},${tipY} ${headX - 6 * perpX},${headY - 6 * perpY}`}
            fill="#3b82f6"
          />
          <circle cx={CX} cy={BASE_Y} r="5" fill="#3b82f6" />
          <circle cx={CX} cy={BASE_Y} r="2.5" fill="#ffffff" />
        </svg>
  );
}
