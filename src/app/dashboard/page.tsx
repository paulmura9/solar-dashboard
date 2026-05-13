"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Cpu, Server, Camera, Radio } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiToken } from "@/hooks/useApiToken";
import { useWeatherData } from "@/hooks/useWeatherData";
import { usePanelStatus } from "@/hooks/usePanelStatus";
import { useStaleTelemetry } from "@/hooks/useStaleTelemetry";
import StaleDataBanner from "@/components/StaleDataBanner";
import { getLatestReading, getReadingsHistory, getRecentEvents, getDevices, getLatestVision } from "@/lib/api";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import { downsample } from "@/lib/solar/chart";
import SolarProductionCard from "@/components/dashboard/SolarProductionCard";
import BatteryCard from "@/components/dashboard/BatteryCard";
import TrackingStatusCard from "@/components/dashboard/TrackingStatusCard";
import LightSensorsCard from "@/components/dashboard/LightSensorsCard";
import WeatherDataCard from "@/components/dashboard/WeatherDataCard";
import type { SensorReading, SystemEvent, DeviceStatus, Severity, VisionResult } from "@/lib/types";
import ErrorBoundary from "@/components/ErrorBoundary";

const supabase = getSupabaseBrowserClient();

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontFamily: "inherit" },
  labelStyle: { color: "#64748b" },
};

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

const CACHE_KEY    = "dashboard_latest_data";
const CACHE_TTL_MS = 30_000;

type CachedDashboard = {
  latest:  SensorReading | null;
  history: SensorReading[];
  events:  SystemEvent[];
  devices: DeviceStatus[];
  vision:  VisionResult | null;
};

export default function OverviewPage() {
  const [latest,  setLatest]  = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [events,  setEvents]  = useState<SystemEvent[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [vision,  setVision]  = useState<VisionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const token       = useApiToken();
  const weatherData = useWeatherData();
  const panelStatus = usePanelStatus(latest);
  const { isStale, secondsSinceLastReading } = useStaleTelemetry(latest?.timestamp);

  const hasLoadedRef = useRef(false);
  const mountedRef   = useRef(false);

  const fetchAll = useCallback(async (): Promise<void> => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const [latestData, historyData, eventsData, devicesData, visionData] = await Promise.all([
        getLatestReading(token),
        getReadingsHistory(token, 24),
        getRecentEvents(token, 10),
        getDevices(token),
        getLatestVision(token),
      ]);
      const safeHistory = Array.isArray(historyData) ? historyData : [];
      const safeEvents  = Array.isArray(eventsData)  ? eventsData  : [];
      const safeDevices = Array.isArray(devicesData) ? devicesData : [];
      setLatest(latestData);
      setHistory(safeHistory);
      setEvents(safeEvents);
      setDevices(safeDevices);
      setVision(visionData);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data:      { latest: latestData, history: safeHistory, events: safeEvents, devices: safeDevices, vision: visionData },
        timestamp: Date.now(),
      }));
    } catch {
      // leave all state as empty/null when backend is unavailable
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [token]);

  // Keep ref current so Realtime/visibility callbacks always use the latest token
  const fetchAllRef = useRef(fetchAll);
  useEffect(() => { fetchAllRef.current = fetchAll; }, [fetchAll]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    setMounted(true);

    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached) as { data: CachedDashboard; timestamp: number };
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          setLatest(data.latest);
          setHistory(data.history);
          setEvents(data.events);
          setDevices(data.devices);
          setVision(data.vision);
        }
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    void fetchAllRef.current();

    const channel = supabase
      .channel("dashboard-sensor-readings")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_readings" }, () => {
        void fetchAllRef.current();
      })
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchAllRef.current();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      void supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const displayDevices     = devices.length > 0 ? devices : OFFLINE_PLACEHOLDER_DEVICES;
  const isPlaceholderDevices = devices.length === 0;

  const chartData = downsample(history, SOLAR_CONFIG.chart.downsampleDashboard).map((r) => ({
    time:      new Date(r.timestamp).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
    solar:     Number(r.solar_power) || 0,
    voltage:   Number(r.battery_voltage) || 0,
    elevation: r.vertical_angle,
    charging:  Number(r.charging_power) || 0,
  }));

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <StaleDataBanner isStale={isStale} secondsSinceLastReading={secondsSinceLastReading} />

      {/* Device status bar */}
      <ErrorBoundary>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && devices.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="flex items-center gap-3"><Skeleton className="w-9 h-9 rounded-lg shrink-0" /><div className="space-y-1.5 flex-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-2.5 w-14" /></div></CardContent></Card>
            ))
          : displayDevices.map((device, i) => {
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

      {/* Data cards — Solar · Battery · Tracking · LDR · Weather */}
      <ErrorBoundary>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {loading && !latest
          ? Array.from({ length: 5 }).map((_, i) => <Card key={i}><CardContent className="pt-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)
          : (
            <>
              <SolarProductionCard reading={latest} />
              <BatteryCard reading={latest} />
              <TrackingStatusCard data={panelStatus} vision={vision} />
              <LightSensorsCard data={panelStatus?.lightSensors ?? null} />
              <WeatherDataCard data={weatherData} ambientLux={latest?.ambient_light_lux ?? null} />
            </>
          )}
      </div>
      </ErrorBoundary>

      {/* Recent events */}
      <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1e293b]">Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && events.length === 0 ? (
            <div className="px-4 pb-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : events.length === 0 ? (
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
                    <TableCell className="text-[#64748b] tabular-nums">
                      {mounted ? new Date(e.timestamp).toLocaleString("ro-RO", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
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

      {/* Mini charts */}
      <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Solar Power (W)</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" W" width={40} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="solar" name="Solar" stroke="#f59e0b" fill="url(#solarFill)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Battery Voltage (V)</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" V" width={40} domain={[6, 9]} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="voltage" name="Voltage" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Panel Elevation (°)</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="°" width={40} domain={[0, 180]} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="elevation" name="Elevation" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Charging Power (W)</CardTitle></CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chargingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" W" width={40} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="charging" name="Charging" stroke="#22c55e" fill="url(#chargingFill)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      </ErrorBoundary>
    </div>
  );
}
