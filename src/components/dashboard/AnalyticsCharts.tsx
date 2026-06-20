"use client";

import { memo } from "react";
import {
  ComposedChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsSeries } from "@/lib/charts/transformReadings";
import { TOOLTIP_STYLE, formatChartValue, tsSpan, formatAxisTick } from "@/lib/charts/chartStyles";
import { ChartCrosshair, useCrosshair, type CrosshairSeries } from "@/components/dashboard/ChartCrosshair";
import { SOLAR_CONFIG } from "@/config/solarConfig";

const CHART_H = 300;

const POWER_SPECS: CrosshairSeries[] = [
  { key: "solar",    name: "Solar panel output",      unit: " W", color: "#f59e0b" },
  { key: "charging", name: "Stored in battery (net)", unit: " W", color: "#3b82f6" },
];
const VOLTAGE_SPECS: CrosshairSeries[] = [
  { key: "voltage", name: "Battery Voltage", unit: " V", color: "#22c55e" },
];
const ANGLES_SPECS: CrosshairSeries[] = [
  { key: "azimuth",   name: "Commanded horizontal angle", unit: "°", color: "#f59e0b" },
  { key: "elevation", name: "Commanded vertical angle",   unit: "°", color: "#3b82f6" },
];

function AnalyticsChartsBase({ series }: { series: AnalyticsSeries }) {
  // power/voltage/angles share the same timestamps; one span drives every time axis.
  const span = tsSpan(series.power);
  const powerCross = useCrosshair();
  const voltageCross = useCrosshair();
  const anglesCross = useCrosshair();
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Solar Power (W)</CardTitle></CardHeader>
        <CardContent>
          <div onMouseMove={powerCross.onMouseMove} onMouseLeave={powerCross.onMouseLeave} style={{ width: "100%", height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series.power}>
                <defs>
                  <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatChartValue(v, " W")} width={64} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                {/* Same W axis on purpose: the vertical gap between the gross area and the net
                    line reads directly as system self-consumption. Net is a crisp line (not a
                    second opaque area) so it stays legible even when it sits well below gross. */}
                <Area type="monotone" dataKey="solar"    name="Solar panel output"      stroke="#f59e0b" fill="url(#solarGrad)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="charging" name="Stored in battery (net)" stroke="#3b82f6" fill="none" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <ChartCrosshair mouseX={powerCross.mouseX} data={series.power} specs={POWER_SPECS} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-[#64748b] leading-relaxed">
            The gap between the two lines is the system&apos;s own consumption. Stored power can read 0 W
            when the battery is full or the load matches charging — expected, not missing data.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Battery Voltage (V)</CardTitle></CardHeader>
        <CardContent>
          <div onMouseMove={voltageCross.onMouseMove} onMouseLeave={voltageCross.onMouseLeave} style={{ width: "100%", height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.voltage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatChartValue(v, " V")} width={64} domain={[6, 9]} />
                <Line type="monotone" dataKey="voltage" name="Battery Voltage" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <ChartCrosshair mouseX={voltageCross.mouseX} data={series.voltage} specs={VOLTAGE_SPECS} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Panel Angles (°)</CardTitle></CardHeader>
        <CardContent>
          <div onMouseMove={anglesCross.onMouseMove} onMouseLeave={anglesCross.onMouseLeave} style={{ width: "100%", height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.angles}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(ms) => formatAxisTick(ms as number, span)} tickCount={5} minTickGap={60} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="°" width={48} domain={[SOLAR_CONFIG.panel.minAngle, SOLAR_CONFIG.panel.maxAngle]} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Line type="monotone" dataKey="azimuth"   name="Commanded horizontal angle" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="elevation" name="Commanded vertical angle"   stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" connectNulls isAnimationActive={false} />
                <ChartCrosshair mouseX={anglesCross.mouseX} data={series.angles} specs={ANGLES_SPECS} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Daily Solar Energy (Wh)</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.energy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" Wh" width={56} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatChartValue(v as number, " Wh")} />
                <Bar dataKey="wh" name="Energy" fill="#3b82f6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const AnalyticsCharts = memo(AnalyticsChartsBase);
