import type { FC } from "react";
import { AlertTriangle, Check, RotateCcw, Sliders } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DPad from "./DPad";
import type { CommandDirection, TrackingMode } from "@/lib/types";

interface PanelControlCardProps {
  currentMode: TrackingMode | null;
  sending: boolean;
  onDirection: (dir: CommandDirection) => void;
  onSetMode: (mode: string) => void;
  onReset: () => void;
}

const MODES: { mode: TrackingMode; label: string }[] = [
  { mode: "AUTO",   label: "Auto" },
  { mode: "MANUAL", label: "Manual" },
  { mode: "IDLE",   label: "Idle" },
];

const PanelControlCard: FC<PanelControlCardProps> = ({
  currentMode,
  sending,
  onDirection,
  onSetMode,
  onReset,
}) => {
  const isManual = currentMode === "MANUAL";

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
              disabled={sending}
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
            <DPad onDirection={onDirection} disabled={sending} />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8 gap-1.5 border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8]"
          disabled={sending}
          onClick={onReset}
        >
          <RotateCcw size={12} />
          Reset Position
        </Button>
      </CardContent>
    </Card>
  );
};

export default PanelControlCard;
