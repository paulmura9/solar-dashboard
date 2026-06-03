"use client";

import { motion } from "framer-motion";
import { SOLAR_CONFIG } from "@/config/solarConfig";

interface AzimuthViewProps {
  azimuthAngle: number;
}

// 180° compass: the panel's azimuth servo sweeps East (0°) → South (90°, HOME) → West (180°),
// mapped onto a half-dome arc. The needle screen-angle is (servo − 90°): −90° points left (East),
// 0° straight up (South), +90° right (West). Shows the panel orientation only — no sun marker.
const CX = 120;
const BASE_Y = 120;
const R = 100;
const TICK_SERVO_ANGLES = [0, 45, 90, 135, 180];

const { minAngle: H_MIN, maxAngle: H_MAX } = SOLAR_CONFIG.panel;

export default function AzimuthView({ azimuthAngle }: AzimuthViewProps) {
  const clamped = Math.min(H_MAX, Math.max(H_MIN, azimuthAngle));

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Azimuth</p>
      <div className="flex-1 flex items-center justify-center">
        <svg width="240" height="150" viewBox="0 0 240 150">
          <path
            d={`M ${CX - R} ${BASE_Y} A ${R} ${R} 0 0 1 ${CX + R} ${BASE_Y} Z`}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          <line x1={CX - R} y1={BASE_Y} x2={CX + R} y2={BASE_Y} stroke="#e2e8f0" strokeWidth="1.5" />

          {TICK_SERVO_ANGLES.map((servo) => {
            const rad = ((servo - 90) * Math.PI) / 180;
            return (
              <line
                key={servo}
                x1={CX + (R - 8) * Math.sin(rad)}
                y1={BASE_Y - (R - 8) * Math.cos(rad)}
                x2={CX + R * Math.sin(rad)}
                y2={BASE_Y - R * Math.cos(rad)}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })}

          <text x={CX - R - 4} y={BASE_Y + 4} textAnchor="end" fontSize="11" fill="#64748b" fontFamily="inherit" fontWeight="600">E</text>
          <text x={CX} y={BASE_Y - R - 6} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="inherit" fontWeight="600">S</text>
          <text x={CX + R + 4} y={BASE_Y + 4} textAnchor="start" fontSize="11" fill="#64748b" fontFamily="inherit" fontWeight="600">W</text>

          <text x={CX - R + 12} y={BASE_Y - 7} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="inherit">0°</text>
          <text x={CX} y={BASE_Y - R + 12} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="inherit">90°</text>
          <text x={CX + R - 12} y={BASE_Y - 7} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="inherit">180°</text>

          <motion.g
            style={{ transformBox: "view-box", transformOrigin: `${CX}px ${BASE_Y}px` }}
            animate={{ rotate: clamped - 90 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <line x1={CX} y1={BASE_Y} x2={CX} y2={BASE_Y - 85} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points={`${CX - 6},${BASE_Y - 77} ${CX},${BASE_Y - 90} ${CX + 6},${BASE_Y - 77}`} fill="#3b82f6" />
            <line x1={CX} y1={BASE_Y} x2={CX} y2={BASE_Y + 16} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          </motion.g>

          <circle cx={CX} cy={BASE_Y} r="5" fill="#3b82f6" />
          <circle cx={CX} cy={BASE_Y} r="2.5" fill="#ffffff" />
        </svg>
      </div>

      <p className="text-xs text-[#64748b]">
        Azimuth: <span className="font-semibold text-[#1e293b]">{clamped}°</span>
      </p>
    </div>
  );
}
