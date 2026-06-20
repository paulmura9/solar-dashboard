export const TOOLTIP_STYLE = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontFamily: "inherit" },
  labelStyle: { color: "#64748b" },
};

// Single source of value formatting for every Analytics chart (tooltips + power/voltage
// Y-axis ticks). Renders a fixed 2-decimal reading with its unit so bare values like "0"
// never reach the UI, e.g. 0 → "0.00 W", 7.453 → "7.45 V". The unit carries its own leading
// space (" W", " V", " Wh") or none ("°"), matching the unit convention used elsewhere in
// the charts. Non-numeric input renders as a dash.
export function formatChartValue(value: number | string, unit: string): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)}${unit}` : "—";
}

const HOUR_MS = 3_600_000;

// Time span (ms) covered by a sorted-ascending series, used to pick the tick granularity.
// The XAxis domain is ['dataMin','dataMax'], so the axis fits the data, not the selected
// window — the tick format follows the same actual extent.
export function tsSpan(points: ReadonlyArray<{ ts: number }>): number {
  if (points.length === 0) return 0;
  return points[points.length - 1].ts - points[0].ts;
}

// Axis tick label, granularity scaled to the displayed data span: hour-of-day when it fits a
// day, day+hour for a few days, day-only beyond that. Let scale="time" + tickCount space the
// ticks; this only formats them, so no duplicate labels appear.
export function formatAxisTick(ms: number, spanMs: number): string {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  if (spanMs <= 24 * HOUR_MS) return time;
  const date = d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });
  if (spanMs <= 72 * HOUR_MS) return `${date} ${time}`;
  return date;
}

// Tooltip header: always the full moment (to the second), regardless of how the axis tick is
// abbreviated — the crosshair can land between ticks, so the exact instant matters.
export function formatAxisLabel(ms: number): string {
  return new Date(ms).toLocaleString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}
