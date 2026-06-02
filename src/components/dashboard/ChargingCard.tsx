"use client";

import type { FC } from "react";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { formatPower, formatWh, formatCurrentMa, siToMilli } from "@/lib/solar/energy";
import MetricRow from "./MetricRow";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { SensorReading } from "@/lib/types";

interface ChargingCardProps {
  reading: SensorReading | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

const ChargingCard: FC<ChargingCardProps> = ({ reading: r, stale = false, secondsAgo = null }) => {
  // Charging figures are NET (INA219 on the battery: charge minus load), not gross
  // panel/MPPT output. Show an idle state rather than a fabricated number when not charging.
  const chargePower = r?.charging_power ?? null;
  const isCharging = chargePower != null && chargePower > 0;
  const chargeRate = chargePower == null ? "—" : isCharging ? formatPower(chargePower) : "Idle";

  return (
    <Card className={stale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <Zap size={13} className="text-green-500" />
          Charging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1.5">
          {chargePower != null ? (
            <>
              <span className="text-3xl font-bold font-mono text-[#1e293b] leading-none">
                <NumberTicker value={siToMilli(chargePower)} decimalPlaces={1} />
              </span>
              <span className="text-sm text-[#64748b] pb-0.5">mW</span>
            </>
          ) : (
            <span className="text-3xl font-bold font-mono text-[#94a3b8] leading-none">—</span>
          )}
        </div>
        <div>
          <MetricRow label="Charge rate (net)" value={chargeRate} />
          <MetricRow label="Net into battery today" value={formatWh(r?.charged_energy_today_wh ?? null)} />
          <MetricRow label="Charge current" value={isCharging ? formatCurrentMa(r?.charging_current ?? null) : "—"} />
        </div>
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default ChargingCard;
