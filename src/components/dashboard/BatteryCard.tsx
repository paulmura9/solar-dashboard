"use client";

import type { FC } from "react";
import { BatteryCharging, BatteryFull, BatteryMedium, BatteryLow } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { formatVoltage } from "@/lib/solar/energy";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import MetricRow from "./MetricRow";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { SensorReading, BatteryStatus } from "@/lib/types";

interface BatteryCardProps {
  reading: SensorReading | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

function getBatteryColor(pct: number | null): string {
  if (pct == null) return "#94a3b8";
  if (pct >= SOLAR_CONFIG.battery.goodPercent) return "#22c55e";
  if (pct >= SOLAR_CONFIG.battery.lowColorPercent) return "#f59e0b";
  return "#ef4444";
}

interface StatusStyle { bg: string; color: string; border: string }

const STATUS_STYLES: Record<BatteryStatus, StatusStyle> = {
  CHARGING:    { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  DISCHARGING: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  IDLE:        { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  LOW:         { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
  UNKNOWN:     { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

function HeaderIcon({ status, pct }: { status: BatteryStatus | null; pct: number | null }) {
  const cls = "text-blue-500";
  if (status === "CHARGING") return <BatteryCharging size={13} className={cls} />;
  if (pct != null && pct >= 80) return <BatteryFull size={13} className={cls} />;
  if (pct != null && pct >= 40) return <BatteryMedium size={13} className={cls} />;
  return <BatteryLow size={13} className={cls} />;
}

const BatteryCard: FC<BatteryCardProps> = ({ reading: r, stale = false, secondsAgo = null }) => {
  const pct = r?.battery_percent ?? null;
  const status = r?.battery_status ?? null;
  const color = getBatteryColor(pct);
  const ss: StatusStyle = (status != null ? STATUS_STYLES[status] : undefined) ?? STATUS_STYLES.UNKNOWN;

  return (
    <Card className={stale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <HeaderIcon status={status} pct={pct} />
          Battery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1.5">
          {pct != null ? (
            <>
              <span className="text-3xl font-bold font-mono leading-none" style={{ color }}>
                <NumberTicker value={pct} decimalPlaces={0} />
              </span>
              <span className="text-sm text-[#64748b] pb-0.5">%</span>
            </>
          ) : (
            <span className="text-3xl font-bold font-mono text-[#94a3b8] leading-none">—</span>
          )}
        </div>
        <div className="h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct ?? 0}%`, background: color }}
          />
        </div>
        <div>
          <MetricRow label="Voltage" value={formatVoltage(r?.battery_voltage ?? null)} />
          <MetricRow
            label="Status"
            value={status ? (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5"
                style={{ background: ss.bg, color: ss.color, borderColor: ss.border }}
              >
                {status}
              </Badge>
            ) : "—"}
          />
        </div>
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default BatteryCard;
