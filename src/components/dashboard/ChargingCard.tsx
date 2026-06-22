"use client";

import type { FC } from "react";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { useStableValue } from "@/lib/hooks/useStableValue";
import { useAutoScaledMetric } from "@/lib/hooks/useAutoScaledMetric";
import { useFieldFreshness } from "@/lib/hooks/useFieldFreshness";
import MetricRow from "./MetricRow";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { SensorReading } from "@/lib/types";

interface ChargingCardProps {
  reading: SensorReading | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

const STALE_FIELD_TITLE = "Last known value — device stopped reporting this field";

function StaleValue({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[#94a3b8]" title={STALE_FIELD_TITLE}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#cbd5e1] shrink-0" aria-hidden />
      {text}
    </span>
  );
}

const ChargingCard: FC<ChargingCardProps> = ({ reading: r, stale = false, secondsAgo = null }) => {
  const frameKey = r?.timestamp ?? null;
  const powerStale = useFieldFreshness(frameKey, r?.charging_power ?? null);
  const currentStale = useFieldFreshness(frameKey, r?.charging_current ?? null);

  const smPower = useStableValue(r?.charging_power ?? null, { jump: 0.05, floor: 0.05, persist: 3 });
  const smCurrent = useStableValue(r?.charging_current ?? null, { jump: 0.05, floor: 0.005, persist: 3 });

  const power = useAutoScaledMetric(smPower, "W");
  const current = useAutoScaledMetric(smCurrent, "A");
  const netEnergy = useAutoScaledMetric(r?.charged_energy_today_wh ?? null, "Wh");

  const isCharging = smPower != null && smPower > 0;
  const chargeRate = power == null ? "—" : isCharging ? power.text : "Idle";

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
          {power ? (
            <>
              <span className={`text-3xl font-bold font-mono leading-none ${powerStale ? "text-[#94a3b8]" : "text-[#1e293b]"}`}>
                <NumberTicker value={power.value} decimalPlaces={power.decimals} />
              </span>
              <span className="text-sm text-[#64748b] pb-0.5">{power.unit}</span>
              {powerStale && (
                <span className="text-[10px] text-[#94a3b8] pb-0.5 ml-0.5" title={STALE_FIELD_TITLE}>
                  · last known
                </span>
              )}
            </>
          ) : (
            <span className="text-3xl font-bold font-mono text-[#94a3b8] leading-none">—</span>
          )}
        </div>
        <div>
          <MetricRow
            label="Charge rate (net)"
            value={isCharging && powerStale ? <StaleValue text={chargeRate} /> : chargeRate}
          />
          <MetricRow label="Net into battery today" value={netEnergy?.text ?? "—"} />
          <MetricRow
            label="Charge current"
            value={
              isCharging
                ? currentStale
                  ? <StaleValue text={current?.text ?? "—"} />
                  : current?.text ?? "—"
                : "—"
            }
          />
        </div>
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default ChargingCard;
