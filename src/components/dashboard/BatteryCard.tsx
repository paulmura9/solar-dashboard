"use client";

import type { FC } from "react";
import { BatteryCharging, BatteryFull, BatteryMedium, BatteryLow, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { formatVoltage } from "@/lib/solar/energy";
import { useStableValue } from "@/lib/hooks/useStableValue";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import MetricRow from "./MetricRow";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { SensorReading, BatteryStatus } from "@/lib/types";

interface BatteryCardProps {
  reading: SensorReading | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

function clampPercent(pct: number | null): number | null {
  if (pct == null) return null;
  return Math.max(0, Math.min(100, pct));
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
  FULL:        { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  IDLE:        { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  UNKNOWN:     { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

const DEFAULT_STATUS_STYLE: StatusStyle = STATUS_STYLES.UNKNOWN;

interface BatteryAlert { text: string; bg: string; color: string; border: string }

function batteryAlert(pct: number | null): BatteryAlert | null {
  if (pct == null) return null;
  if (pct <= SOLAR_CONFIG.battery.criticalPercent)
    return { text: "Critical: estimated battery level very low", bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" };
  if (pct <= SOLAR_CONFIG.battery.warningPercent)
    return { text: "Low estimated battery level", bg: "#fffbeb", color: "#92400e", border: "#fde68a" };
  return null;
}

function HeaderIcon({ status, pct }: { status: BatteryStatus | null; pct: number | null }) {
  const cls = "text-blue-500";
  if (status === "CHARGING") return <BatteryCharging size={13} className={cls} />;
  if (status === "FULL") return <BatteryFull size={13} className={cls} />;
  if (pct != null && pct >= SOLAR_CONFIG.battery.fullPercent) return <BatteryFull size={13} className={cls} />;
  if (pct != null && pct >= SOLAR_CONFIG.battery.mediumPercent) return <BatteryMedium size={13} className={cls} />;
  return <BatteryLow size={13} className={cls} />;
}

const BatteryCard: FC<BatteryCardProps> = ({ reading: r, stale = false, secondsAgo = null }) => {
  const smPercent = useStableValue(r?.battery_percent ?? null, { jump: 0.05, floor: 3, persist: 3 });
  const smVoltage = useStableValue(r?.battery_voltage ?? null, { jump: 0.05, floor: 0.04, persist: 3 });
  const pct = clampPercent(smPercent != null ? Math.round(smPercent) : null);
  const status = r?.battery_status ?? null;
  const color = getBatteryColor(pct);
  const ss: StatusStyle = (status != null ? STATUS_STYLES[status] : undefined) ?? DEFAULT_STATUS_STYLE;
  const alert = batteryAlert(pct);

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
        <p
          className="text-[10px] text-[#94a3b8] -mt-1"
          title="Estimated from battery voltage — no coulomb counting or current integration"
        >
          Estimated charge level
        </p>
        <div className="h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct ?? 0}%`, background: color }}
          />
        </div>
        <div>
          <MetricRow label="Voltage" value={formatVoltage(smVoltage)} />
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
        {alert && (
          <div
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"
            style={{ background: alert.bg, color: alert.color, border: `1px solid ${alert.border}` }}
          >
            <AlertTriangle size={12} className="shrink-0" />
            {alert.text}
          </div>
        )}
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default BatteryCard;
