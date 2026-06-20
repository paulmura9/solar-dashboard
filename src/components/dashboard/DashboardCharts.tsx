"use client";

import { memo } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardChartPoint } from "@/lib/charts/transformReadings";
import { TOOLTIP_STYLE, tsSpan, formatAxisTick, formatAxisLabel } from "@/lib/charts/chartStyles";
import { SOLAR_CONFIG } from "@/config/solarConfig";

interface DashboardChartsProps {
  data: DashboardChartPoint[];
}

function DashboardChartsBase({ data }: DashboardChartsProps) {
  const span = tsSpan(data);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Solar Power (W)</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 200 }}>
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
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(ms) => formatAxisLabel(ms as number)} />
                <Area type="monotone" dataKey="solar" name="Solar" stroke="#f59e0b" fill="url(#solarFill)" strokeWidth={2} dot={false} isAnimationActive={false} />
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
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="v" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" V" width={40} domain={[6, 9]} />
                <YAxis yAxisId="pct" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="%" width={36} domain={[0, 100]} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(ms) => formatAxisLabel(ms as number)} />
                <Line yAxisId="v" type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="pct" type="monotone" dataKey="percent" name="Est. charge (%)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
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
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="°" width={40} domain={[SOLAR_CONFIG.panel.minAngle, SOLAR_CONFIG.panel.maxAngle]} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(ms) => formatAxisLabel(ms as number)} />
                <Line type="monotone" dataKey="elevation" name="Elevation" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
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
          <div style={{ width: "100%", height: 200 }}>
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
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(ms) => formatAxisLabel(ms as number)} />
                <Area type="monotone" dataKey="charging" name="Charging" stroke="#22c55e" fill="url(#chargingFill)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const DashboardCharts = memo(DashboardChartsBase);
