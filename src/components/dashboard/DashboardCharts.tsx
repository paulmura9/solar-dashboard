"use client";

import { memo } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardChartPoint } from "@/lib/charts/transformReadings";
import { tsSpan, formatAxisTick } from "@/lib/charts/chartStyles";
import { ChartCrosshair, useCrosshair, type CrosshairSeries } from "@/components/dashboard/ChartCrosshair";
import { SOLAR_CONFIG } from "@/config/solarConfig";

interface DashboardChartsProps {
  data: DashboardChartPoint[];
}

const SOLAR_SPECS: CrosshairSeries[] = [
  { key: "solar", name: "Solar", unit: " W", color: "#f59e0b" },
];
const BATTERY_SPECS: CrosshairSeries[] = [
  { key: "voltage", name: "Voltage (V)",     unit: " V", color: "#22c55e" },
  { key: "percent", name: "Est. charge (%)", unit: "%",  color: "#3b82f6" },
];
const ELEVATION_SPECS: CrosshairSeries[] = [
  { key: "elevation", name: "Elevation", unit: "°", color: "#3b82f6" },
];
const CHARGING_SPECS: CrosshairSeries[] = [
  { key: "charging", name: "Charging", unit: " W", color: "#22c55e" },
];

function DashboardChartsBase({ data }: DashboardChartsProps) {
  const span = tsSpan(data);
  const solarCross = useCrosshair();
  const batteryCross = useCrosshair();
  const elevationCross = useCrosshair();
  const chargingCross = useCrosshair();
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Solar Power (W)</CardTitle>
        </CardHeader>
        <CardContent>
          <div onMouseMove={solarCross.onMouseMove} onMouseLeave={solarCross.onMouseLeave} style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" W" width={40} />
                <Area type="monotone" dataKey="solar" name="Solar" stroke="#f59e0b" fill="url(#solarFill)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <ChartCrosshair mouseX={solarCross.mouseX} data={data} specs={SOLAR_SPECS} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Battery (V / est. %)</CardTitle>
        </CardHeader>
        <CardContent>
          <div onMouseMove={batteryCross.onMouseMove} onMouseLeave={batteryCross.onMouseLeave} style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="v" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" V" width={40} domain={[6, 9]} />
                <YAxis yAxisId="pct" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="%" width={36} domain={[0, 100]} />
                <Line yAxisId="v" type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <Line yAxisId="pct" type="monotone" dataKey="percent" name="Est. charge (%)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={false} connectNulls isAnimationActive={false} />
                <ChartCrosshair mouseX={batteryCross.mouseX} data={data} specs={BATTERY_SPECS} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Panel Elevation (°)</CardTitle>
        </CardHeader>
        <CardContent>
          <div onMouseMove={elevationCross.onMouseMove} onMouseLeave={elevationCross.onMouseLeave} style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="°" width={40} domain={[SOLAR_CONFIG.panel.minAngle, SOLAR_CONFIG.panel.maxAngle]} />
                <Line type="monotone" dataKey="elevation" name="Elevation" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <ChartCrosshair mouseX={elevationCross.mouseX} data={data} specs={ELEVATION_SPECS} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Charging Power (W)</CardTitle>
        </CardHeader>
        <CardContent>
          <div onMouseMove={chargingCross.onMouseMove} onMouseLeave={chargingCross.onMouseLeave} style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="chargingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" W" width={40} />
                <Area type="monotone" dataKey="charging" name="Charging" stroke="#22c55e" fill="url(#chargingFill)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <ChartCrosshair mouseX={chargingCross.mouseX} data={data} specs={CHARGING_SPECS} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const DashboardCharts = memo(DashboardChartsBase);
