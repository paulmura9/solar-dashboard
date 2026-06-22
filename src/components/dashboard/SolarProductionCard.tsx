"use client";

import type { FC } from "react";
import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { formatVoltage } from "@/lib/solar/energy";
import { useStableValue } from "@/lib/hooks/useStableValue";
import { useAutoScaledMetric } from "@/lib/hooks/useAutoScaledMetric";
import MetricRow from "./MetricRow";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { SensorReading } from "@/lib/types";

interface SolarProductionCardProps {
  reading: SensorReading | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

const SolarProductionCard: FC<SolarProductionCardProps> = ({ reading: r, stale = false, secondsAgo = null }) => {
  const smPower = useStableValue(r?.solar_power ?? null, { jump: 0.05, floor: 0.05, persist: 2 });
  const smVoltage = useStableValue(r?.solar_voltage ?? null, { jump: 0.05, floor: 0.04, persist: 2 });
  const smCurrent = useStableValue(r?.solar_current ?? null, { jump: 0.05, floor: 0.005, persist: 2 });

  const power = useAutoScaledMetric(smPower, "W");
  const current = useAutoScaledMetric(smCurrent, "A");
  const energy = useAutoScaledMetric(r?.solar_energy_today_wh ?? null, "Wh");

  return (
    <Card className={stale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <Sun size={13} className="text-amber-500" />
          Solar Production
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1.5">
          {power ? (
            <>
              <span className="text-3xl font-bold font-mono text-[#1e293b] leading-none">
                <NumberTicker value={power.value} decimalPlaces={power.decimals} />
              </span>
              <span className="text-sm text-[#64748b] pb-0.5">{power.unit}</span>
            </>
          ) : (
            <span className="text-3xl font-bold font-mono text-[#94a3b8] leading-none">—</span>
          )}
        </div>
        <div>
          <MetricRow label="Voltage"      value={formatVoltage(smVoltage)} />
          <MetricRow label="Current"      value={current?.text ?? "—"} />
          <MetricRow label="Energy today" value={energy?.text ?? "—"} />
        </div>
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default SolarProductionCard;
