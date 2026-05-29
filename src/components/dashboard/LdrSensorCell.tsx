import type { FC } from "react";
import { SOLAR_CONFIG } from "@/config/solarConfig";

interface LdrSensorCellProps {
  label: string;
  value: number | null;
  /** Reads far darker than the other three sensors — render the percentage in red. */
  isOutlier?: boolean;
}

const LdrSensorCell: FC<LdrSensorCellProps> = ({ label, value, isOutlier = false }) => {
  const pct = value != null
    ? Math.round((value / SOLAR_CONFIG.ldr.maxValue) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#eef2f7] border border-[#dde4ee]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-lg font-bold font-mono leading-none tabular-nums ${
            isOutlier ? "text-destructive" : "text-[#1e293b]"
          }`}
        >
          {value != null ? `${pct}%` : "—"}
        </span>
        {value != null && (
          <span className="text-[10px] font-mono text-[#94a3b8] tabular-nums">
            {value}
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden">
        {value != null && (
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default LdrSensorCell;
