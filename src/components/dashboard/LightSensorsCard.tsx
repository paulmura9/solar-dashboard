import type { FC } from "react";
import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LdrSensorCell from "./LdrSensorCell";
import LastUpdatedStamp from "./LastUpdatedStamp";
import { getBalanceBadgeVariant } from "@/lib/solar/status";
import { formatHorizontalDiff, formatVerticalDiff } from "@/lib/solar/lightState";
import type { LightSensorData, BalanceStatus, LightState } from "@/lib/types";

interface LightSensorsCardProps {
  data: LightSensorData | null;
  stale?: boolean;
  secondsAgo?: number | null;
  lightState?: LightState;
  /** Device is already in authoritative NIGHT mode — suppress the daytime "Dark" hint. */
  deviceInNight?: boolean;
}

const BALANCE_LABELS: Record<BalanceStatus, string> = {
  BALANCED:   "Balanced",
  ADJUSTING:  "Adjusting",
  UNBALANCED: "Unbalanced",
  NIGHT:      "Night",
  LOW_LIGHT:  "Low Light",
};

const LightSensorsCard: FC<LightSensorsCardProps> = ({
  data,
  stale = false,
  secondsAgo = null,
  lightState = "UNKNOWN",
  deviceInNight = false,
}) => {
  const status: BalanceStatus = data?.balanceStatus ?? "NIGHT";
  const showDark = lightState === "DARK" && !deviceInNight;

  return (
    <Card className={stale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
            <Sun size={13} className="text-amber-500" />
            Light Sensors
          </CardTitle>
          <Badge variant={getBalanceBadgeVariant(status)} className="text-[10px]">
            {BALANCE_LABELS[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <LdrSensorCell label="Top Left"     value={data?.topLeft ?? null} />
          <LdrSensorCell label="Top Right"    value={data?.topRight ?? null} />
          <LdrSensorCell label="Bottom Left"  value={data?.bottomLeft ?? null} />
          <LdrSensorCell label="Bottom Right" value={data?.bottomRight ?? null} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#e2e8f0]">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-0.5">H diff</p>
            <p className="text-sm font-mono font-medium text-[#1e293b] tabular-nums">
              {formatHorizontalDiff(data?.horizontalDiff ?? null)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-0.5">V diff</p>
            <p className="text-sm font-mono font-medium text-[#1e293b] tabular-nums">
              {formatVerticalDiff(data?.verticalDiff ?? null)}
            </p>
          </div>
        </div>
        {lightState === "NIGHT" && (
          <div className="flex items-center justify-center pt-1 border-t border-[#e2e8f0]">
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-700">
              Night
            </span>
          </div>
        )}
        {showDark && (
          <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-[#e2e8f0]">
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-700">
              Dark
            </span>
            <span className="text-[10px] text-[#94a3b8]">Low light (daytime)</span>
          </div>
        )}
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default LightSensorsCard;
