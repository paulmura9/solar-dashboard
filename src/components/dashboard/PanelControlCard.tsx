import type { FC } from "react";
import { AlertTriangle, Check, RotateCcw, Sliders } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DPad from "./DPad";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import { formatHorizontalDiff, formatVerticalDiff } from "@/lib/solar/lightState";
import type { CommandDirection, CommandType, TrackingMode } from "@/lib/types";

interface PanelControlCardProps {
  currentMode: TrackingMode | null;
  sending: boolean;
  esp32Online: boolean;
  isStale: boolean;
  isCommandCooldown: (type: CommandType) => boolean;
  onDirection: (dir: CommandDirection) => void;
  onSetMode: (mode: TrackingMode) => void;
  onReset: () => void;
  lightDiffs?: { horizontal: number | null; vertical: number | null };
}

const MODES: { mode: TrackingMode; label: string }[] = [
  { mode: "AUTO",   label: "Auto" },
  { mode: "MANUAL", label: "Manual" },
  { mode: "IDLE",   label: "Idle" },
];

const PanelControlCard: FC<PanelControlCardProps> = ({
  currentMode,
  sending,
  esp32Online,
  isStale,
  isCommandCooldown,
  onDirection,
  onSetMode,
  onReset,
  lightDiffs,
}) => {
  const isManual = currentMode === "MANUAL";
  const hardwareDisabled = !esp32Online || isStale;
  const dpadDisabled = hardwareDisabled || !isManual;
  const modeDisabled = hardwareDisabled || sending;
  const resetDisabled = hardwareDisabled || sending || isCommandCooldown("RESET_POSITION");

  // Both light diffs sitting inside the firmware deadband = the panel is aligned. A null
  // diff is unknown, not balanced, so it never satisfies this.
  const hDiff = lightDiffs?.horizontal ?? null;
  const vDiff = lightDiffs?.vertical ?? null;
  const band = SOLAR_CONFIG.ldr.diffNeutralBand;
  const isBalanced =
    hDiff != null && vDiff != null && Math.abs(hDiff) < band && Math.abs(vDiff) < band;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <Sliders size={13} className="text-blue-500" />
          Panel Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {MODES.map(({ mode, label }) => (
            <Button
              key={mode}
              variant={currentMode === mode ? "default" : "outline"}
              size="sm"
              className={`flex-1 text-xs h-8 gap-1 ${
                currentMode === mode
                  ? "bg-[#3b82f6] text-white border-[#3b82f6] hover:bg-[#2563eb]"
                  : "border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6] hover:text-[#3b82f6]"
              }`}
              disabled={modeDisabled}
              onClick={() => onSetMode(mode)}
            >
              {currentMode === mode && <Check size={11} />}
              {label}
            </Button>
          ))}
        </div>

        <div>
          {!isManual && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              <AlertTriangle size={12} className="shrink-0" />
              <span>Switch to Manual to enable directional control</span>
            </div>
          )}
          <div className={!isManual ? "opacity-40 pointer-events-none" : ""}>
            <DPad onDirection={onDirection} disabled={dpadDisabled} />
          </div>

          {isManual && !isStale && (
            <div className="mt-3">
              <div className="flex min-h-[18px] items-center justify-center">
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                    <Check size={10} />
                    Balanced
                  </span>
                ) : (
                  <div className="flex items-center gap-x-4 text-[10px] tabular-nums">
                    <span className="flex items-center gap-1">
                      <span className="uppercase tracking-wider text-[#94a3b8]">H diff</span>
                      <span className="font-mono font-medium text-[#1e293b]">{formatHorizontalDiff(hDiff)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="uppercase tracking-wider text-[#94a3b8]">V diff</span>
                      <span className="font-mono font-medium text-[#1e293b]">{formatVerticalDiff(vDiff)}</span>
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-1 text-center text-[10px] text-[#94a3b8]">Move toward the arrow to balance</p>
            </div>
          )}
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 gap-1.5 border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8]"
            disabled={resetDisabled}
            onClick={onReset}
          >
            <RotateCcw size={12} />
            Reset Position
          </Button>
          {isCommandCooldown("RESET_POSITION") && (
            <p className="text-xs text-center text-[#94a3b8] mt-1">Cooling down...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PanelControlCard;
