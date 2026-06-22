"use client";

import { useState, useCallback, type MouseEvent } from "react";
import { useXAxisInverseScale, usePlotArea } from "recharts";
import { formatAxisLabel, formatChartValue } from "@/lib/charts/chartStyles";

export interface CrosshairSeries {
  key: string;
  name: string;
  unit: string;
  color: string;
}

export function useCrosshair() {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    setMouseX(e.clientX - e.currentTarget.getBoundingClientRect().left);
  }, []);
  const onMouseLeave = useCallback(() => setMouseX(null), []);
  return { mouseX, onMouseMove, onMouseLeave };
}

function readNumber(point: { ts: number }, key: string): number | null {
  const v = (point as unknown as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function interpolate(data: ReadonlyArray<{ ts: number }>, key: string, t: number): number | null {
  const n = data.length;
  if (n === 0) return null;
  if (t <= data[0].ts) return readNumber(data[0], key);
  if (t >= data[n - 1].ts) return readNumber(data[n - 1], key);

  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (data[mid].ts <= t) lo = mid + 1;
    else hi = mid;
  }
  const a = data[lo - 1];
  const b = data[lo];
  const va = readNumber(a, key);
  const vb = readNumber(b, key);
  if (va === null) return vb;
  if (vb === null) return va;
  const dt = b.ts - a.ts;
  if (dt <= 0) return vb;
  return va + (vb - va) * ((t - a.ts) / dt);
}

const ROW_H = 15;
const BOX_W = 184;

export function ChartCrosshair({
  mouseX,
  data,
  specs,
}: {
  mouseX: number | null;
  data: ReadonlyArray<{ ts: number }>;
  specs: CrosshairSeries[];
}) {
  const inverse = useXAxisInverseScale();
  const plot = usePlotArea();
  if (mouseX === null || !inverse || !plot || data.length === 0) return null;

  const left = plot.x;
  const right = plot.x + plot.width;
  const x = Math.max(left, Math.min(mouseX, right));
  const t = Number(inverse(x));
  if (!Number.isFinite(t)) return null;

  const top = plot.y;
  const bottom = plot.y + plot.height;

  const rows = specs.map((s) => ({ ...s, value: interpolate(data, s.key, t) }));

  const boxH = 12 + ROW_H * (rows.length + 1);
  const boxX = x + 12 + BOX_W <= right ? x + 12 : x - 12 - BOX_W;
  const boxY = Math.min(top + 6, bottom - boxH - 2);

  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={x} x2={x} y1={top} y2={bottom} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
      <g transform={`translate(${boxX}, ${Math.max(top, boxY)})`}>
        <rect width={BOX_W} height={boxH} rx={6} fill="#ffffff" stroke="#e2e8f0" opacity={0.97} />
        <text x={10} y={17} fontSize={11} fontWeight={600} fill="#475569">{formatAxisLabel(t)}</text>
        {rows.map((r, i) => (
          <text key={r.key} x={10} y={17 + ROW_H * (i + 1)} fontSize={11} fill={r.color}>
            {r.name}: {r.value === null ? "—" : formatChartValue(r.value, r.unit)}
          </text>
        ))}
      </g>
    </g>
  );
}
