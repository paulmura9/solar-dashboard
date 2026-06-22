import type { FC } from "react";
import { Navigation, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAngle } from "@/lib/solar/energy";
import { PREDICTED_CLASS_BADGE } from "@/lib/ui/statusBadgeStyle";
import LastUpdatedStamp from "./LastUpdatedStamp";
import type { PanelMode, PanelStatusData, VisionResult } from "@/lib/types";

interface TrackingStatusCardProps {
  data: PanelStatusData | null;
  vision: VisionResult | null;
  stale?: boolean;
  secondsAgo?: number | null;
}

interface ModeStyle { color: string; bg: string; border: string }

const MODE_STYLES: Record<PanelMode, ModeStyle> = {
  TRACKING: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  MANUAL:   { color: "#92400e", bg: "#fffbeb", border: "#fcd34d" },
  IDLE:     { color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
  ERROR:    { color: "#991b1b", bg: "#fef2f2", border: "#fca5a5" },
  NIGHT:    { color: "#1e3a5f", bg: "#eff6ff", border: "#bfdbfe" },
};

const TrackingStatusCard: FC<TrackingStatusCardProps> = ({ data, vision, stale = false, secondsAgo = null }) => {
  const mode: PanelMode = data?.mode ?? "IDLE";
  const s: ModeStyle = stale ? MODE_STYLES.IDLE : (MODE_STYLES[mode] ?? MODE_STYLES.IDLE);

  return (
    <Card className={stale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <Navigation size={13} className="text-blue-500" />
          Tracking Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e293b] mb-0.5">Commanded horizontal</p>
            <p className="text-xl font-bold font-mono text-[#1e293b]">
              {data ? formatAngle(data.horizontalAngle) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e293b] mb-0.5">Commanded vertical</p>
            <p className="text-xl font-bold font-mono text-[#1e293b]">
              {data ? formatAngle(data.verticalAngle) : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#64748b]">Mode</span>
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border"
            style={{ background: s.bg, color: s.color, borderColor: s.border }}
          >
            {mode}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#64748b]">Panel</span>
          {stale ? (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border border-[#e2e8f0] bg-[#f8fafc] text-[#475569]">
              Last known: {data?.isMoving ? "Moving" : "Stable"}
            </span>
          ) : data?.isMoving ? (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border border-amber-300 bg-amber-50 text-amber-700">
              <Activity size={9} />
              Moving
            </span>
          ) : (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border border-green-300 bg-green-50 text-green-700">
              Stable
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0]">
          <span className="text-xs text-[#64748b]">Panel surface</span>
          {vision?.predicted_class ? (
            <Badge
              variant="outline"
              className="h-auto rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={PREDICTED_CLASS_BADGE[vision.predicted_class].style}
            >
              {PREDICTED_CLASS_BADGE[vision.predicted_class].label}
            </Badge>
          ) : (
            <span className="text-xs font-mono text-[#94a3b8]">—</span>
          )}
        </div>
        {stale && <LastUpdatedStamp secondsAgo={secondsAgo} />}
      </CardContent>
    </Card>
  );
};

export default TrackingStatusCard;
