import type { FC } from "react";
import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LdrSensorCell from "./LdrSensorCell";
import LastUpdatedStamp from "./LastUpdatedStamp";
import { formatHorizontalDiff, formatVerticalDiff, detectLdrOutliers, isLdrUnbalanced } from "@/lib/solar/lightState";
import type { LightSensorData, LightState } from "@/lib/types";

interface LightSensorsCardProps {
  data: LightSensorData | null;
  stale?: boolean;
  secondsAgo?: number | null;
  lightState?: LightState;
  trackingError?: boolean;
}

type LightBadge = { label: string; variant: "outline" | "destructive"; className: string };

// The badge surfaces only states that carry information, in priority order: an active
// tracking ERROR, device/inferred NIGHT, daytime LOW_LIGHT, or a clearly UNBALANCED light
// skew. NIGHT/LOW_LIGHT come verbatim from the dashboard's computeLightState (tracking_mode
// + sunrise/sunset) and are checked before balance, since near-zero night/low-light LDRs
// make H/V diffs noise that must not read as an imbalance. Everything else shows no badge —
// the steady balanced/adjusting states are intentionally silent to avoid clutter.
const ERROR_BADGE: LightBadge = { label: "Error", variant: "destructive", className: "text-[10px]" };
const NIGHT_BADGE: LightBadge = {
  label: "Night",
  variant: "outline",
  className: "text-[10px] border-slate-200 bg-slate-50 text-slate-600",
};
const LOW_LIGHT_BADGE: LightBadge = {
  label: "Low Light",
  variant: "outline",
  className: "text-[10px] border-amber-200 bg-amber-50 text-amber-700",
};
const UNBALANCED_BADGE: LightBadge = { label: "Unbalanced", variant: "destructive", className: "text-[10px]" };

const LightSensorsCard: FC<LightSensorsCardProps> = ({
  data,
  stale = false,
  secondsAgo = null,
  lightState = "UNKNOWN",
  trackingError = false,
}) => {
  const badge: LightBadge | null = trackingError
    ? ERROR_BADGE
    : lightState === "NIGHT"
      ? NIGHT_BADGE
      : lightState === "LOW_LIGHT"
        ? LOW_LIGHT_BADGE
        : isLdrUnbalanced(data)
          ? UNBALANCED_BADGE
          : null;

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
          {badge && (
            <Badge variant={badge.variant} className={badge.className}>
              {badge.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-x-4 mt-1.5 text-[10px] tabular-nums">
          <span className="flex items-center gap-1">
            <span className="uppercase tracking-wider text-[#94a3b8]">H diff</span>
            <span className="font-mono font-medium text-[#1e293b]">
              {formatHorizontalDiff(data?.horizontalDiff ?? null)}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span className="uppercase tracking-wider text-[#94a3b8]">V diff</span>
            <span className="font-mono font-medium text-[#1e293b]">
              {formatVerticalDiff(data?.verticalDiff ?? null)}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <LdrSensorCell label="Top Left"     value={ldrValues[0]} isOutlier={tlOutlier} />
          <LdrSensorCell label="Top Right"    value={ldrValues[1]} isOutlier={trOutlier} />
          <LdrSensorCell label="Bottom Left"  value={ldrValues[2]} isOutlier={blOutlier} />
          <LdrSensorCell label="Bottom Right" value={ldrValues[3]} isOutlier={brOutlier} />
        </div>
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default LightSensorsCard;
