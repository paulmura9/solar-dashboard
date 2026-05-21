import type { SensorReading } from "@/lib/types";
import { downsample } from "@/lib/solar/chart";
import { PERF_CONFIG } from "@/config/perfConfig";

export interface DashboardChartPoint {
  time: string;
  solar: number;
  voltage: number;
  elevation: number;
  charging: number;
}

export interface AnalyticsPowerPoint {
  time: string;
  solar: number;
  charging: number;
}

export interface AnalyticsVoltagePoint {
  time: string;
  voltage: number;
}

export interface AnalyticsAnglesPoint {
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
  return downsampled.map((r) => ({
    time: toTime(r.timestamp),
    solar: Number(r.solar_power) || 0,
    voltage: Number(r.battery_voltage) || 0,
    elevation: r.vertical_angle,
    charging: Number(r.charging_power) || 0,
  }));
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
    time: labelFor(r.timestamp),
    solar: Number(r.solar_power) || 0,
    charging: Number(r.charging_power) || 0,
  }));

  const voltage: AnalyticsVoltagePoint[] = sampled.map((r) => ({
    time: labelFor(r.timestamp),
    voltage: Number(r.battery_voltage) || 0,
  }));

  const angles: AnalyticsAnglesPoint[] = sampled.map((r) => ({
    time: labelFor(r.timestamp),
    azimuth: r.horizontal_angle,
    elevation: r.vertical_angle,
  }));

  const energyByDay = readings.reduce<Record<string, number>>((acc, r) => {
    const day = toDate(r.timestamp);
    acc[day] = Math.max(acc[day] ?? 0, r.solar_energy_today_wh ?? 0);
    return acc;
  }, {});
  const energy: AnalyticsEnergyPoint[] = Object.entries(energyByDay).map(([date, wh]) => ({
    date,
    wh,
  }));

  return { power, voltage, angles, energy };
}
