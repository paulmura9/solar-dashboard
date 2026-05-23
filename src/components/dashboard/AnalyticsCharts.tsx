"use client";

import { memo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsSeries } from "@/lib/charts/transformReadings";

const TOOLTIP_STYLE = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontFamily: "inherit" },
  labelStyle: { color: "#64748b" },
};

const CHART_H = 300;

function AnalyticsChartsBase({ series }: { series: AnalyticsSeries }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Solar Power (W)</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.power}>
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
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Area type="monotone" dataKey="solar"    name="Solar Power"    stroke="#f59e0b" fill="url(#solarGrad)"  strokeWidth={2} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="charging" name="Charging Power" stroke="#3b82f6" fill="url(#chargeGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Battery Voltage (V)</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.voltage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit=" V" width={48} domain={[6, 9]} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="voltage" name="Battery Voltage" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-[#1e293b]">Panel Angles (°)</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.angles}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="°" width={48} domain={[0, 180]} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Line type="monotone" dataKey="azimuth"   name="Commanded horizontal angle" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="elevation" name="Commanded vertical angle"   stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
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
                <Tooltip {...TOOLTIP_STYLE} />
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
