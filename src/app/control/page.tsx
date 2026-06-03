"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Compass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BorderBeam } from "@/components/magic/BorderBeam";
import ElevationView from "@/components/ElevationView";
import AzimuthView from "@/components/AzimuthView";
import PanelControlCard from "@/components/dashboard/PanelControlCard";
import SunTrackerCard from "@/components/dashboard/SunTrackerCard";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import { useApiToken } from "@/hooks/useApiToken";
import { usePanelCommands } from "@/hooks/usePanelCommands";
import { useStaleTelemetry } from "@/hooks/useStaleTelemetry";
import { useLatestReading } from "@/hooks/api/useLatestReading";
import { useDevices } from "@/hooks/api/useDevices";
import { useCommands } from "@/hooks/api/useCommands";
import StaleDataBanner from "@/components/StaleDataBanner";
import { ControlSkeleton } from "@/components/skeletons/ControlSkeleton";
import { formatCommandLabel } from "@/lib/solar/commands";
import type { CommandStatus, CommandDirection, TrackingMode } from "@/lib/types";
import ErrorBoundary from "@/components/ErrorBoundary";

const OPTIMISTIC_REVERT_MS = 3_000;

interface OptimisticTarget {
  h: number;
  v: number;
}

const STATUS_STYLE: Record<CommandStatus, React.CSSProperties> = {
  PENDING:      { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
  SENT:         { background: "#dbeafe", color: "#1e40af", borderColor: "#bfdbfe" },
  ACKNOWLEDGED: { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" },
  FAILED:       { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" },
};

export default function ControlPage() {
  const token = useApiToken();
  const { data: latest, isInitialLoad: latestInitial } = useLatestReading();
  const { data: devices, isInitialLoad: devicesInitial } = useDevices();
  const { data: commands } = useCommands(10);

  const [optimisticTarget, setOptimisticTarget] = useState<OptimisticTarget | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const optimisticRevertRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (optimisticRevertRef.current) clearTimeout(optimisticRevertRef.current);
  }, []);

  const clearOptimistic = useCallback(() => {
    if (optimisticRevertRef.current) {
      clearTimeout(optimisticRevertRef.current);
      optimisticRevertRef.current = null;
    }
    setOptimisticTarget(null);
  }, []);

  const { sending, lastResult, movePanel, setMode, resetPosition, startTracking, stopTracking, isCommandCooldown } =
    usePanelCommands(token);
  const { isStale, secondsSinceLastReading } = useStaleTelemetry(latest?.timestamp);

  if (latestInitial && devicesInitial) return <ControlSkeleton />;

  const esp32Online = devices.find((d) => d.device_name === "ESP32")?.is_online ?? false;
  const currentMode = latest?.tracking_mode ?? null;
  const hAngle = latest?.horizontal_angle ?? 90;
  const vAngle = latest?.vertical_angle ?? 90;
  const targetReached = !!(
    optimisticTarget &&
    latest &&
    latest.horizontal_angle === optimisticTarget.h &&
    latest.vertical_angle === optimisticTarget.v
  );
  const activeTarget = targetReached ? null : optimisticTarget;
  const displayH = activeTarget?.h ?? hAngle;
  const displayV = activeTarget?.v ?? vAngle;

  const handleDirection = async (dir: CommandDirection): Promise<void> => {
    const target = await movePanel(dir, displayH, displayV);
    if (!target) return;
    setOptimisticTarget({ h: target.h_angle, v: target.v_angle });
    if (optimisticRevertRef.current) clearTimeout(optimisticRevertRef.current);
    optimisticRevertRef.current = setTimeout(() => {
      optimisticRevertRef.current = null;
      setOptimisticTarget(null);
    }, OPTIMISTIC_REVERT_MS);
  };

  const handleSetMode = (mode: TrackingMode): void => {
    clearOptimistic();
    void setMode(mode);
  };

  return (
    <div className="space-y-5">
      <StaleDataBanner isStale={isStale} secondsSinceLastReading={secondsSinceLastReading} />

      {!esp32Online && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>⚠</span>
          <span>
            ESP32 is offline. Commands will not be delivered until the device reconnects.
          </span>
        </div>
      )}

      <ErrorBoundary>
        <Card className="relative overflow-hidden">
          <BorderBeam colorFrom="#3b82f6" colorTo="#60a5fa" size={120} duration={8} borderWidth={1.5} />
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1e293b] flex items-center justify-between">
              <span>Panel Visualization</span>
              <Button
                variant="outline"
                size="sm"
                className="font-normal text-[#64748b]"
                aria-expanded={showCalibration}
                onClick={() => setShowCalibration((v) => !v)}
                title="Show the Sky View calibration dome (real sun position vs panel)"
              >
                <Compass />
                Calibration
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Titles, illustrations and readouts in one 2-column grid so each row's
                cells share an exact baseline (both titles align) and each column stays
                centred over its illustration. */}
            <div className="mx-auto grid max-w-md grid-cols-2 items-center gap-x-4 gap-y-3 pt-1 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Elevation</p>
              <p className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Horizontal</p>

              <div className="flex items-center justify-center">
                <ElevationView elevationAngle={displayV} />
              </div>
              <div className="flex items-center justify-center">
                <AzimuthView azimuthAngle={displayH} />
              </div>

              <div className="text-xs text-[#64748b]">
                Estimated vertical angle: <strong className="text-[#1e293b]">{vAngle}°</strong>
                {activeTarget && activeTarget.v !== vAngle && (
                  <span className="ml-1 text-[#94a3b8]">(commanded {activeTarget.v}°)</span>
                )}
              </div>
              <div className="text-xs text-[#64748b]">
                Estimated horizontal angle: <strong className="text-[#1e293b]">{hAngle}°</strong>
                {activeTarget && activeTarget.h !== hAngle && (
                  <span className="ml-1 text-[#94a3b8]">(commanded {activeTarget.h}°)</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>

      {showCalibration && (
        <ErrorBoundary>
          <SunTrackerCard
            panelAzimuth={latest?.horizontal_angle ?? null}
            panelElevation={latest?.vertical_angle ?? null}
            latitude={SOLAR_CONFIG.weather.locationLat}
            longitude={SOLAR_CONFIG.weather.locationLon}
          />
        </ErrorBoundary>
      )}

      <ErrorBoundary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PanelControlCard
            currentMode={currentMode}
            sending={sending}
            esp32Online={esp32Online}
            isStale={isStale}
            isCommandCooldown={isCommandCooldown}
            onDirection={(dir) => { void handleDirection(dir); }}
            onSetMode={handleSetMode}
            onReset={() => { void resetPosition(); }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[#1e293b]">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium"
                onClick={() => { void startTracking(); }}
                disabled={sending || !esp32Online || isStale}
                title={isStale ? "Telemetry stale - cannot send commands safely" : undefined}
              >
                Start Tracking
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#ef4444] text-[#ef4444] hover:bg-red-50 text-sm font-medium"
                onClick={() => { void stopTracking(); }}
                disabled={sending || !esp32Online || isStale}
                title={isStale ? "Telemetry stale - cannot send commands safely" : undefined}
              >
                Stop Tracking
              </Button>

              {lastResult && (
                <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  lastResult.ok
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {lastResult.message}
                </div>
              )}

              <div className="pt-2 border-t border-[#e2e8f0] space-y-1 text-xs text-[#64748b]">
                <div className="flex justify-between">
                  <span>Estimated horizontal angle</span>
                  <span className="font-semibold text-[#1e293b]">{hAngle}°</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated vertical angle</span>
                  <span className="font-semibold text-[#1e293b]">{vAngle}°</span>
                </div>
                {activeTarget && (
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Commanded target</span>
                    <span className="font-semibold">{activeTarget.h}° / {activeTarget.v}°</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tracking mode</span>
                  <span className="font-semibold text-[#1e293b]">{currentMode ?? "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1e293b]">Command History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {commands.length === 0 ? (
              <p className="px-4 pb-4 text-xs text-[#94a3b8]">No commands sent yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#e2e8f0]">
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider w-36">Time</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Command</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider w-28">Status</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.map((cmd, index) => {
                    const previousCmd = commands[index + 1]; // list is newest-first; previous = older row
                    return (
                    <TableRow key={cmd.id} className="border-[#e2e8f0] text-xs">
                      <TableCell className="text-[#64748b] tabular-nums" suppressHydrationWarning>
                        {new Date(cmd.created_at).toLocaleString("ro-RO", {
                          day: "2-digit", month: "2-digit",
                          hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-[#1e293b]">
                        {formatCommandLabel(cmd, previousCmd)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={STATUS_STYLE[cmd.status]}>
                          {cmd.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#64748b]">
                        {cmd.status === "FAILED" && cmd.error_message
                          ? <span className="text-red-600">{cmd.error_message}</span>
                          : cmd.status === "ACKNOWLEDGED" && cmd.acknowledged_at
                            ? `ACK ${new Date(cmd.acknowledged_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                            : "—"}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
