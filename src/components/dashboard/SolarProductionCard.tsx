"use client";

import type { FC } from "react";
import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { formatVoltage, formatCurrentMa, formatEnergy, siToMilli } from "@/lib/solar/energy";
import MetricRow from "./MetricRow";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { SensorReading } from "@/lib/types";

interface SolarProductionCardProps {
  reading: SensorReading | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

const SolarProductionCard: FC<SolarProductionCardProps> = ({ reading: r, stale = false, secondsAgo = null }) => (
  <Card className={stale ? "opacity-60" : undefined}>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
        <Sun size={13} className="text-amber-500" />
        Solar Production
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-end gap-1.5">
        {r?.solar_power != null ? (
          <>
            <span className="text-3xl font-bold font-mono text-[#1e293b] leading-none">
              <NumberTicker value={siToMilli(r.solar_power)} decimalPlaces={1} />
            </span>
            <span className="text-sm text-[#64748b] pb-0.5">mW</span>
          </>
        ) : (
          <span className="text-3xl font-bold font-mono text-[#94a3b8] leading-none">—</span>
        )}
      </div>
      <div>
        <MetricRow label="Voltage"      value={formatVoltage(r?.solar_voltage ?? null)} />
        <MetricRow label="Current"      value={formatCurrentMa(r?.solar_current ?? null)} />
        <MetricRow label="Energy today" value={formatEnergy(r?.solar_energy_today_wh ?? null)} />
      </div>
      {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
    </CardContent>
  </Card>
);

export default SolarProductionCard;
