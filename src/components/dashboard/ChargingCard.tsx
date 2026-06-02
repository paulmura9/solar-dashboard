"use client";

import type { FC } from "react";
import { BatteryCharging } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { formatCurrentMa, formatEnergy, siToMilli } from "@/lib/solar/energy";
import MetricRow from "./MetricRow";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { SensorReading } from "@/lib/types";

interface ChargingCardProps {
  reading: SensorReading | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

const ACTIVE_BADGE = { background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" };
const IDLE_BADGE   = { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" };

// The INA219 on the battery measures NET current (charge minus load), so every
// figure here is energy into the battery — not gross panel/MPPT output.
const ChargingCard: FC<ChargingCardProps> = ({ reading: r, stale = false, secondsAgo = null }) => {
  const power = r?.charging_power ?? null;
  const isCharging = power != null && power > 0;
  // Hero shows 0 when not charging rather than a fabricated value.
  const rateMilliW = siToMilli(isCharging ? (power as number) : 0);

  return (
    <Card className={stale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <BatteryCharging size={13} className="text-green-500" />
          Battery Charging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-end gap-1.5">
            <span
              className="text-3xl font-bold font-mono leading-none"
              style={{ color: isCharging ? "#16a34a" : "#94a3b8" }}
            >
              <NumberTicker value={rateMilliW} decimalPlaces={1} />
            </span>
            <span className="text-sm text-[#64748b] pb-0.5">mW</span>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5" style={isCharging ? ACTIVE_BADGE : IDLE_BADGE}>
            {isCharging ? "CHARGING" : "IDLE"}
          </Badge>
        </div>
        <p className="text-[10px] text-[#94a3b8] -mt-1">Battery charge rate (net)</p>
        <div>
          <MetricRow
            label="Charge current"
            value={formatCurrentMa(isCharging ? (r?.charging_current ?? null) : null)}
          />
          <MetricRow
            label="Net into battery today"
            value={formatEnergy(r?.charged_energy_today_wh ?? null)}
          />
        </div>
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default ChargingCard;
