"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BorderBeam } from "@/components/magic/BorderBeam";
import ElevationView from "@/components/ElevationView";
import AzimuthView from "@/components/AzimuthView";
import PanelControlCard from "@/components/dashboard/PanelControlCard";
import { useApiToken } from "@/hooks/useApiToken";
import { usePanelCommands } from "@/hooks/usePanelCommands";
import { useCommandHistory } from "@/hooks/useCommandHistory";
import { getLatestReading, getDevices } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCommandLabel } from "@/lib/solar/commands";
import type { SensorReading, CommandStatus, DeviceStatus } from "@/lib/types";
import ErrorBoundary from "@/components/ErrorBoundary";

const supabase = getSupabaseBrowserClient();

const STATUS_STYLE: Record<CommandStatus, React.CSSProperties> = {
  PENDING:      { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
  SENT:         { background: "#dbeafe", color: "#1e40af", borderColor: "#bfdbfe" },
  ACKNOWLEDGED: { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" },
  FAILED:       { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" },
};

export default function ControlPage() {
  const [latest,  setLatest]  = useState<SensorReading | null>(null);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const token = useApiToken();
  const { sending, lastResult, movePanel, setMode, resetPosition, startTracking, stopTracking } =
    usePanelCommands(token);
  const { commands, refresh: refreshCommands } = useCommandHistory(token, 10);

  const fetchLatest = useCallback(async (): Promise<void> => {
    if (!token) {
      setLoading(false);
      return;
    }
    const [reading, deviceData] = await Promise.all([
      getLatestReading(token),
      getDevices(token),
    ]);
    setLatest(reading);
    setDevices(deviceData);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    setMounted(true);
    void fetchLatest();

    const sub = supabase
      .channel("sensor_readings_control")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_readings" }, () => {
        void fetchLatest();
      })
      .subscribe();

    return () => { void supabase.removeChannel(sub); };
  }, [fetchLatest]);

  const esp32Online = devices.find((d) => d.device_name === "ESP32")?.is_online ?? false;

  const currentMode = latest?.tracking_mode ?? null;
  const hAngle = latest?.horizontal_angle ?? 90;
  const vAngle = latest?.vertical_angle  ?? 90;

  const handleDirection = useCallback(
    (dir: Parameters<typeof movePanel>[0]) => movePanel(dir, hAngle, vAngle),
    [movePanel, hAngle, vAngle]
  );

  async function dispatchAndRefresh(action: () => Promise<void>): Promise<void> {
    await action();
    refreshCommands();
  }

  return (
    <div className="space-y-5">
      {!loading && !esp32Online && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>⚠</span>
          <span>
            ESP32 is offline. Commands will not be delivered until the device reconnects.
          </span>
        </div>
      )}

      {/* Panel visualization */}
      <ErrorBoundary>
      <Card className="relative overflow-hidden">
        <BorderBeam colorFrom="#3b82f6" colorTo="#60a5fa" size={120} duration={8} borderWidth={1.5} />
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1e293b] flex items-center justify-between">
            <span>Panel Visualization</span>
            {loading
              ? <Skeleton className="h-5 w-20" />
              : <span className="text-xs font-normal text-[#64748b]">Auto-refresh every 10 s</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            <ElevationView elevationAngle={vAngle} />
            <AzimuthView azimuthAngle={hAngle} />
          </div>
          <div className="flex justify-center gap-10 mt-2 text-xs text-[#64748b]">
            <span>Commanded vertical angle: <strong className="text-[#1e293b]">{vAngle}°</strong></span>
            <span>Commanded horizontal angle: <strong className="text-[#1e293b]">{hAngle}°</strong></span>
          </div>
        </CardContent>
      </Card>
      </ErrorBoundary>

      {/* Control + Actions */}
      <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PanelControlCard
          currentMode={currentMode}
          sending={sending}
          esp32Online={esp32Online}
          onDirection={handleDirection}
          onSetMode={(m) => dispatchAndRefresh(() => setMode(m))}
          onReset={() => dispatchAndRefresh(resetPosition)}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1e293b]">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium"
              onClick={() => dispatchAndRefresh(startTracking)}
              disabled={sending || !esp32Online}
            >
              Start Tracking
            </Button>
            <Button
              variant="outline"
              className="w-full border-[#ef4444] text-[#ef4444] hover:bg-red-50 text-sm font-medium"
              onClick={() => dispatchAndRefresh(stopTracking)}
              disabled={sending || !esp32Online}
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
                <span>Commanded horizontal angle</span>
                <span className="font-semibold text-[#1e293b]">{hAngle}°</span>
              </div>
              <div className="flex justify-between">
                <span>Commanded vertical angle</span>
                <span className="font-semibold text-[#1e293b]">{vAngle}°</span>
              </div>
              <div className="flex justify-between">
                <span>Tracking mode</span>
                <span className="font-semibold text-[#1e293b]">{currentMode ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </ErrorBoundary>

      {/* Command history */}
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
                {commands.map((cmd) => (
                  <TableRow key={cmd.id} className="border-[#e2e8f0] text-xs">
                    <TableCell className="text-[#64748b] tabular-nums">
                      {mounted
                        ? new Date(cmd.created_at).toLocaleString("ro-RO", {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-[#1e293b]">
                      {getCommandLabel(cmd.command_type)}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </ErrorBoundary>
    </div>
  );
}
