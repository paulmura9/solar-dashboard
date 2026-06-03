"use client";

import { motion } from "framer-motion";

interface ElevationViewProps {
  elevationAngle: number;
}

export default function ElevationView({ elevationAngle }: ElevationViewProps) {
  const tilt = elevationAngle - 90;

  return (
      <svg
        viewBox="0 0 300 230"
        className="w-full max-w-[150px] h-auto overflow-visible"
        aria-label="Panel elevation tilt"
      >
        <line
          x1="60" y1="200" x2="240" y2="200"
          stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"
        />

        <rect x="144" y="115" width="12" height="87" rx="2" fill="#9ca3af" />

        <circle cx="150" cy="115" r="5" fill="#6b7280" />

        <g transform="translate(150, 115)">
          <motion.g
            animate={{ rotate: tilt }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <rect x="-68" y="-9" width="136" height="18" rx="2" fill="#3b82f6" />
            <line x1="-34" y1="-9" x2="-34" y2="9" stroke="#1d4ed8" strokeWidth="0.75" />
            <line x1="0" y1="-9" x2="0" y2="9" stroke="#1d4ed8" strokeWidth="0.75" />
            <line x1="34" y1="-9" x2="34" y2="9" stroke="#1d4ed8" strokeWidth="0.75" />
            <line x1="-68" y1="-3" x2="68" y2="-3" stroke="#1d4ed8" strokeWidth="0.75" />
            <line x1="-68" y1="3" x2="68" y2="3" stroke="#1d4ed8" strokeWidth="0.75" />
            <circle cx="0" cy="0" r="3" fill="#1d4ed8" />
          </motion.g>
        </g>

        <path
          d="M 150 115 m 22 0 a 22 22 0 0 0 0 -22"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        <text x="180" y="102" fontSize="9" fill="#94a3b8" fontFamily="inherit">
          90°
        </text>
      </svg>
  );
}
