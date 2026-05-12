import type { FC } from "react";
import { Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LdrSensorCell from "./LdrSensorCell";
import { getBalanceBadgeVariant } from "@/lib/solar/status";
import type { LightSensorData, BalanceStatus } from "@/lib/types";

interface LightSensorsCardProps {
  data: LightSensorData | null;
}

const BALANCE_LABELS: Record<BalanceStatus, string> = {
  BALANCED:   "Balanced",
  ADJUSTING:  "Adjusting",
  UNBALANCED: "Unbalanced",
  NIGHT:      "Night",
  LOW_LIGHT:  "Low Light",
};

const LightSensorsCard: FC<LightSensorsCardProps> = ({ data }) => {
  const status: BalanceStatus = data?.balanceStatus ?? "NIGHT";

  return (
    <Card>
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
            <p className="text-sm font-mono font-medium text-[#1e293b]">
              {data?.horizontalDiff != null ? data.horizontalDiff.toFixed(0) : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-0.5">V diff</p>
            <p className="text-sm font-mono font-medium text-[#1e293b]">
              {data?.verticalDiff != null ? data.verticalDiff.toFixed(0) : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LightSensorsCard;
