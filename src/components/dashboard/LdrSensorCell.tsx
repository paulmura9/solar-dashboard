import type { FC } from "react";
import { SOLAR_CONFIG } from "@/config/solarConfig";

interface LdrSensorCellProps {
  label: string;
  value: number | null;
}

const LdrSensorCell: FC<LdrSensorCellProps> = ({ label, value }) => {
  const pct = value != null
    ? Math.round((value / SOLAR_CONFIG.ldr.maxValue) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#eef2f7] border border-[#dde4ee]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
          {label}
        </span>
        <span className="text-xs font-mono text-[#1e293b]">
          {value ?? "—"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden">
        {value != null && (
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <span className="text-[10px] text-[#94a3b8] text-right">
        {value != null ? `${pct}%` : "—"}
      </span>
    </div>
  );
};

export default LdrSensorCell;
