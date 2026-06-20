import type { SensorReading } from "@/lib/types";
import { downsample } from "@/lib/solar/chart";
import { PERF_CONFIG } from "@/config/perfConfig";

export interface DashboardChartPoint {
  ts: number;
  time: string;
  solar: number;
  voltage: number;
  percent: number;
  elevation: number;
  charging: number;
}

export interface AnalyticsPowerPoint {
  ts: number;
  time: string;
  solar: number;
  charging: number;
}

export interface AnalyticsVoltagePoint {
  ts: number;
  time: string;
  voltage: number;
}

export interface AnalyticsAnglesPoint {
  ts: number;
  time: string;
  azimuth: number;
  elevation: number;
}

export interface AnalyticsEnergyPoint {
  date: string;
  wh: number;
}

const toTime = (ts: string): string =>
  new Date(ts).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

const toDate = (ts: string): string =>
  new Date(ts).toLocaleDateString("ro-RO", { month: "2-digit", day: "2-digit" });

export function pickEveryN<T>(arr: readonly T[], n: number): T[] {
  if (n <= 1) return arr.slice();
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr[i]);
  if (arr.length > 0 && out[out.length - 1] !== arr[arr.length - 1]) {
    out.push(arr[arr.length - 1]);
  }
  return out;
}

function maybeDecimate(readings: readonly SensorReading[]): readonly SensorReading[] {
  if (readings.length <= PERF_CONFIG.charts.downsampleThreshold) return readings;
  const factor = Math.ceil(readings.length / PERF_CONFIG.charts.downsampleThreshold);
  return pickEveryN(readings, factor);
}

export function transformDashboardChart(
  readings: readonly SensorReading[],
  bucketSize: number
): DashboardChartPoint[] {
  const downsampled = downsample(readings, bucketSize);
  const points = downsampled.map((r) => ({
    ts: new Date(r.timestamp).getTime(),
    time: toTime(r.timestamp),
    solar: Number(r.solar_power) || 0,
    voltage: Number(r.battery_voltage) || 0,
    percent: Math.max(0, Math.min(100, Number(r.battery_percent) || 0)),
    elevation: r.vertical_angle,
    charging: Number(r.charging_power) || 0,
  }));
  points.sort((a, b) => a.ts - b.ts);
  return points;
}

export interface AnalyticsSeries {
  power: AnalyticsPowerPoint[];
  voltage: AnalyticsVoltagePoint[];
  angles: AnalyticsAnglesPoint[];
  energy: AnalyticsEnergyPoint[];
}

export function transformAnalyticsCharts(
  readings: readonly SensorReading[],
  bucketSize: number,
  hours: number
): AnalyticsSeries {
  const decimated = maybeDecimate(readings);
  const sampled = downsample(decimated, bucketSize);
  const labelFor = hours >= 48 ? toDate : toTime;

  const power: AnalyticsPowerPoint[] = sampled.map((r) => ({
    ts: new Date(r.timestamp).getTime(),
    time: labelFor(r.timestamp),
    solar: Number(r.solar_power) || 0,
    charging: Number(r.charging_power) || 0,
  }));
  power.sort((a, b) => a.ts - b.ts);

  const voltage: AnalyticsVoltagePoint[] = sampled.map((r) => ({
    ts: new Date(r.timestamp).getTime(),
    time: labelFor(r.timestamp),
    voltage: Number(r.battery_voltage) || 0,
  }));
  voltage.sort((a, b) => a.ts - b.ts);

  const angles: AnalyticsAnglesPoint[] = sampled.map((r) => ({
    ts: new Date(r.timestamp).getTime(),
    time: labelFor(r.timestamp),
    azimuth: r.horizontal_angle,
    elevation: r.vertical_angle,
  }));
  angles.sort((a, b) => a.ts - b.ts);

  // Bucket energy by calendar day. Key on a sortable yyyy-mm-dd string so the bars come
  // out chronological (Object key order alone is not guaranteed across months); keep the
  // ro-RO "DD.MM" label for display.
  const energyByDay = readings.reduce<Record<string, { wh: number; label: string }>>((acc, r) => {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const wh = r.solar_energy_today_wh ?? 0;
    if (acc[key]) acc[key].wh = Math.max(acc[key].wh, wh);
    else acc[key] = { wh, label: toDate(r.timestamp) };
    return acc;
  }, {});
  const energy: AnalyticsEnergyPoint[] = Object.keys(energyByDay)
    .sort()
    .map((key) => ({ date: energyByDay[key].label, wh: energyByDay[key].wh }));

  return { power, voltage, angles, energy };
}
