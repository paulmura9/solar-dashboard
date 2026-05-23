"use client";

import { useMemo } from "react";
import { Cpu, Server, Camera, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWeatherData } from "@/hooks/useWeatherData";
import { usePanelStatus } from "@/hooks/usePanelStatus";
import { useStaleTelemetry } from "@/hooks/useStaleTelemetry";
import { useLatestReading } from "@/hooks/api/useLatestReading";
import { useReadingsHistory } from "@/hooks/api/useReadingsHistory";
import { useDevices } from "@/hooks/api/useDevices";
import { useEvents } from "@/hooks/api/useEvents";
import { useLatestVision } from "@/hooks/api/useLatestVision";
import StaleDataBanner from "@/components/StaleDataBanner";
import SolarProductionCard from "@/components/dashboard/SolarProductionCard";
import BatteryCard from "@/components/dashboard/BatteryCard";
import TrackingStatusCard from "@/components/dashboard/TrackingStatusCard";
import LightSensorsCard from "@/components/dashboard/LightSensorsCard";
import WeatherDataCard from "@/components/dashboard/WeatherDataCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { transformDashboardChart } from "@/lib/charts/transformReadings";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import { PERF_CONFIG } from "@/config/perfConfig";
import type { DeviceStatus, Severity } from "@/lib/types";
import ErrorBoundary from "@/components/ErrorBoundary";

const DEVICE_DISPLAY: Record<string, { label: string; icon: React.ElementType; iconBg: string; iconColor: string }> = {
  ESP32:        { label: "ESP32",        icon: Cpu,    iconBg: "bg-amber-50",  iconColor: "text-amber-600"  },
  RASPBERRY_PI: { label: "Raspberry Pi", icon: Server, iconBg: "bg-green-50",  iconColor: "text-green-600"  },
  CAMERA:       { label: "Camera",       icon: Camera, iconBg: "bg-blue-50",   iconColor: "text-blue-600"   },
  MQTT_BROKER:  { label: "MQTT Broker",  icon: Radio,  iconBg: "bg-violet-50", iconColor: "text-violet-600" },
};

const OFFLINE_PLACEHOLDER_DEVICES: DeviceStatus[] = [
  { id: -1, device_name: "ESP32",        is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
  { id: -2, device_name: "RASPBERRY_PI", is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
  { id: -3, device_name: "CAMERA",       is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
  { id: -4, device_name: "MQTT_BROKER",  is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
];

const SEVERITY_BADGE: Record<Severity, React.CSSProperties> = {
  INFO:     {},
  WARNING:  { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
  ERROR:    { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" },
  CRITICAL: { background: "#7f1d1d", color: "#fff",    borderColor: "#991b1b" },
};

function parseSubsystem(eventType: string): string {
  const word = eventType.split("_")[0];
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export default function OverviewPage() {
  const { data: latest, isInitialLoad: latestInitial } = useLatestReading();
  const { data: history } = useReadingsHistory({ hours: 24 });
  const { data: events } = useEvents(PERF_CONFIG.cache.eventsCap);
  const { data: devices, isInitialLoad: devicesInitial } = useDevices();
  const { data: vision } = useLatestVision();

  const weatherData = useWeatherData();
  const panelStatus = usePanelStatus(latest);
  const { isStale, secondsSinceLastReading } = useStaleTelemetry(latest?.timestamp);

  const chartData = useMemo(
    () => transformDashboardChart(history, SOLAR_CONFIG.chart.downsampleDashboard),
    [history]
  );

  if (latestInitial && devicesInitial) return <DashboardSkeleton />;

  const displayDevices = devices.length > 0 ? devices : OFFLINE_PLACEHOLDER_DEVICES;
  const isPlaceholderDevices = devices.length === 0;

  return (
    <div className="space-y-5">
      <StaleDataBanner isStale={isStale} secondsSinceLastReading={secondsSinceLastReading} />

      <ErrorBoundary>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {displayDevices.map((device, i) => {
            const meta = DEVICE_DISPLAY[device.device_name] ?? { label: device.device_name, icon: Cpu, iconBg: "bg-[#f1f5f9]", iconColor: "text-[#64748b]" };
            const Icon = meta.icon;
            return (
              <motion.div key={device.device_name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card>
                  <CardContent className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${meta.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={16} className={meta.iconColor} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1e293b] truncate">{meta.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${device.is_online ? "bg-green-500 status-dot-online" : isPlaceholderDevices ? "bg-slate-300" : "bg-red-400"}`} />
                        <span className={`text-xs ${device.is_online ? "text-green-600" : isPlaceholderDevices ? "text-slate-400" : "text-red-500"}`}>
                          {device.is_online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          <SolarProductionCard reading={latest} />
          <BatteryCard reading={latest} />
          <TrackingStatusCard data={panelStatus} vision={vision} />
          <LightSensorsCard data={panelStatus?.lightSensors ?? null} />
          <WeatherDataCard data={weatherData} ambientLux={latest?.ambient_light_lux ?? null} />
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1e293b]">Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <p className="px-4 pb-4 text-xs text-[#94a3b8]">No events recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#e2e8f0]">
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider w-36">Timestamp</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider w-28">Subsystem</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Description</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider w-24">Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id} className="border-[#e2e8f0] text-xs">
                      <TableCell className="text-[#64748b] tabular-nums" suppressHydrationWarning>
                        {new Date(e.timestamp).toLocaleString("ro-RO", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="font-medium text-[#1e293b]">{parseSubsystem(e.event_type)}</TableCell>
                      <TableCell className="text-[#64748b] max-w-xs truncate">{e.message}</TableCell>
                      <TableCell>
                        <Badge variant={e.severity === "INFO" ? "secondary" : "outline"} style={SEVERITY_BADGE[e.severity]}>
                          {e.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>

      <ErrorBoundary>
        <DashboardCharts data={chartData} />
      </ErrorBoundary>
    </div>
  );
}
