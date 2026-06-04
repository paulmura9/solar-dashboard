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
