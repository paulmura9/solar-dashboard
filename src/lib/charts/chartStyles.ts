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

// Numeric [start, end] domain for a time-series XAxis: the full selected window ending now.
// Anchoring to the window (not the data) keeps the scale consistent and renders data gaps as
// real gaps instead of compressing them.
export function timeAxisDomain(hours: number): [number, number] {
  const endMs = Date.now();
  return [endMs - hours * HOUR_MS, endMs];
}

// Axis tick label, granularity scaled to the window: hour-of-day for short ranges, day+hour
// for multi-day, day-only for a week. Let scale="time" + tickCount space the ticks; this only
// formats them, so no duplicate labels appear.
export function formatAxisTick(ms: number, hours: number): string {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  if (hours <= 24) return time;
  const date = d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });
  if (hours <= 72) return `${date} ${time}`;
  return date;
}

// Tooltip header: always the full moment, regardless of how the axis tick is abbreviated.
export function formatAxisLabel(ms: number): string {
  return new Date(ms).toLocaleString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
