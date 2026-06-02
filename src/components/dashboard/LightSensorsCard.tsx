import type { FC } from "react";
import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LdrSensorCell from "./LdrSensorCell";
import LastUpdatedStamp from "./LastUpdatedStamp";
import { getBalanceBadgeVariant } from "@/lib/solar/status";
import { formatHorizontalDiff, formatVerticalDiff, detectLdrOutliers } from "@/lib/solar/lightState";
import type { LightSensorData, BalanceStatus, LightState } from "@/lib/types";

interface LightSensorsCardProps {
  data: LightSensorData | null;
  stale?: boolean;
  secondsAgo?: number | null;
  lightState?: LightState;
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
}) => {
  const status: BalanceStatus = data?.balanceStatus ?? "NIGHT";
  // NIGHT is shown once, by the Tracking Status mode badge (device tracking_mode). Here we
  // only surface the frontend-inferred DARK (daytime low-light) condition the device never reports.
  const showDark = lightState === "DARK";

  const ldrValues = [
    data?.topLeft ?? null,
    data?.topRight ?? null,
    data?.bottomLeft ?? null,
    data?.bottomRight ?? null,
  ];
  const [tlOutlier, trOutlier, blOutlier, brOutlier] = detectLdrOutliers(ldrValues);

  return (
    <Card className={stale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
            <Sun size={13} className="text-amber-500" />
            Light Levels
          </CardTitle>
          <Badge variant={getBalanceBadgeVariant(status)} className="text-[10px]">
            {BALANCE_LABELS[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <LdrSensorCell label="Top Left"     value={ldrValues[0]} isOutlier={tlOutlier} />
          <LdrSensorCell label="Top Right"    value={ldrValues[1]} isOutlier={trOutlier} />
          <LdrSensorCell label="Bottom Left"  value={ldrValues[2]} isOutlier={blOutlier} />
          <LdrSensorCell label="Bottom Right" value={ldrValues[3]} isOutlier={brOutlier} />
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
