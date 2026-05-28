"use client";

import { motion } from "framer-motion";

interface AzimuthViewProps {
  azimuthAngle: number;
}

const INTERCARDINAL_TICKS = [45, 135, 225, 315];

export default function AzimuthView({ azimuthAngle }: AzimuthViewProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Azimuth</p>
      <div className="flex-1 flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="80" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx="90" cy="90" r="72" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />

        {INTERCARDINAL_TICKS.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={90 + 72 * Math.sin(rad)}
              y1={90 - 72 * Math.cos(rad)}
              x2={90 + 80 * Math.sin(rad)}
              y2={90 - 80 * Math.cos(rad)}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          );
        })}

        <text x="90" y="12" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="inherit" fontWeight="600">N</text>
        <text x="90" y="175" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="inherit" fontWeight="600">S</text>
        <text x="170" y="94" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="inherit" fontWeight="600">E</text>
        <text x="10" y="94" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="inherit" fontWeight="600">W</text>

        <text x="90" y="24" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="inherit">0°</text>
        <text x="90" y="164" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="inherit">180°</text>
        <text x="154" y="94" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="inherit">90°</text>
        <text x="26" y="94" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="inherit">270°</text>

        <motion.g
          style={{ transformBox: "view-box", transformOrigin: "90px 90px" }}
          animate={{ rotate: azimuthAngle }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <line x1="90" y1="90" x2="90" y2="42" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="85,50 90,32 95,50" fill="#3b82f6" />
          <line x1="90" y1="90" x2="90" y2="112" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </motion.g>

        <circle cx="90" cy="90" r="5" fill="#3b82f6" />
        <circle cx="90" cy="90" r="2.5" fill="#ffffff" />
      </svg>
      </div>

      <p className="text-xs text-[#64748b]">
        Azimuth:{" "}
        <span className="font-semibold text-[#1e293b]">{azimuthAngle}°</span>
      </p>
    </div>
  );
}
