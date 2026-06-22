export const TOOLTIP_STYLE = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontFamily: "inherit" },
  labelStyle: { color: "#64748b" },
};

export function formatChartValue(value: number | string, unit: string): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)}${unit}` : "—";
}

const HOUR_MS = 3_600_000;

export function tsSpan(points: ReadonlyArray<{ ts: number }>): number {
  if (points.length === 0) return 0;
  return points[points.length - 1].ts - points[0].ts;
}

export function formatAxisTick(ms: number, spanMs: number): string {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  if (spanMs <= 24 * HOUR_MS) return time;
  const date = d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });
  if (spanMs <= 72 * HOUR_MS) return `${date} ${time}`;
  return date;
}

export function formatAxisLabel(ms: number): string {
  return new Date(ms).toLocaleString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}
