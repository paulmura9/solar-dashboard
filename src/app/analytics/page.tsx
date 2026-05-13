"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiToken } from "@/hooks/useApiToken";
import { getReadingsHistory } from "@/lib/api";
import type { SensorReading } from "@/lib/types";

const RANGES = [
  { label: "6h",     hours: 6   },
  { label: "12h",    hours: 12  },
  { label: "24h",    hours: 24  },
  { label: "3 days", hours: 72  },
  { label: "7 days", hours: 168 },
] as const;

const CHART_TOOLTIP = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontFamily: "inherit" },
  labelStyle: { color: "#64748b" },
};

const MAX_POINTS = 120;
const CHART_H    = 300;

function downsample(arr: SensorReading[]): SensorReading[] {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  if (arr.length <= MAX_POINTS) return arr;
  const step = Math.floor(arr.length / MAX_POINTS);
  return arr.filter((_, i) => i % step === 0);
}

function toTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

function toDate(ts: string): string {
  return new Date(ts).toLocaleDateString("ro-RO", { month: "2-digit", day: "2-digit" });
}

export default function AnalyticsPage() {
  const [hours,    setHours]   = useState(24);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [mounted,  setMounted]  = useState(false);

  const token = useApiToken();

  const fetchData = useCallback(async (h: number): Promise<void> => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getReadingsHistory(token, h);
    setReadings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { void fetchData(hours); }, 0);
    return () => clearTimeout(id);
  }, [fetchData, hours]);

  const sampled   = downsample(readings);
  const timeLabel = hours >= 48 ? toDate : toTime;

  const powerData   = sampled.map((r) => ({ time: timeLabel(r.timestamp), solar: Number(r.solar_power) || 0, charging: Number(r.charging_power) || 0 }));
  const voltageData = sampled.map((r) => ({ time: timeLabel(r.timestamp), voltage: Number(r.battery_voltage) || 0 }));
  const anglesData  = sampled.map((r) => ({ time: timeLabel(r.timestamp), azimuth: r.horizontal_angle, elevation: r.vertical_angle }));

  const energyByDay = readings.reduce<Record<string, number>>((acc, r) => {
    const day = toDate(r.timestamp);
    acc[day] = Math.max(acc[day] ?? 0, r.solar_energy_today_wh ?? 0);
    return acc;
  }, {});
  const energyData = Object.entries(energyByDay).map(([date, wh]) => ({ date, wh }));

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      {/* Time range selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[#64748b] mr-1">Time range:</span>
        {RANGES.map(({ label, hours: h }) => (
          <button
            key={h}
            onClick={() => setHours(h)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
              hours === h
                ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#3b82f6] hover:text-[#3b82f6]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="pt-4"><Skeleton className="h-[300px] w-full" /></CardContent></Card>)}</div>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Solar Power (W)</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: CHART_H }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={powerData}>
                    <defs>
                      <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="chargeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" W" width={48} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                    <Area type="monotone" dataKey="solar"    name="Solar Power"    stroke="#f59e0b" fill="url(#solarGrad)"  strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="charging" name="Charging Power" stroke="#3b82f6" fill="url(#chargeGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Battery Voltage (V)</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: CHART_H }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={voltageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" V" width={48} domain={[6, 9]} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Line type="monotone" dataKey="voltage" name="Battery Voltage" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Panel Angles (°)</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: CHART_H }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={anglesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="°" width={48} domain={[0, 180]} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                    <Line type="monotone" dataKey="azimuth"   name="Commanded horizontal angle" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="elevation" name="Commanded vertical angle"   stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Daily Solar Energy (Wh)</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: CHART_H }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={energyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" Wh" width={56} />
                    <Tooltip {...CHART_TOOLTIP} />
                    <Bar dataKey="wh" name="Energy" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
