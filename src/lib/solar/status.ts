import { SOLAR_CONFIG } from "@/config/solarConfig";
import type {
  SensorReading,
  BalanceStatus,
  PanelMode,
  LightSensorData,
  PanelStatusData,
} from "@/lib/types";

export function calculateBalanceStatus(
  hDiff: number | null,
  vDiff: number | null,
  topLeft: number | null
): BalanceStatus {
  const ldr = topLeft ?? SOLAR_CONFIG.ldr.lowLightThreshold + 1;
  if (ldr < SOLAR_CONFIG.ldr.nightThreshold) return "NIGHT";
  if (ldr < SOLAR_CONFIG.ldr.lowLightThreshold) return "LOW_LIGHT";
  const absH = Math.abs(hDiff ?? 0);
  const absV = Math.abs(vDiff ?? 0);
  const dead = SOLAR_CONFIG.ldr.balanceDeadband;
  if (absH <= dead && absV <= dead) return "BALANCED";
  if (absH <= dead * 3 && absV <= dead * 3) return "ADJUSTING";
  return "UNBALANCED";
}

export function calculateLightSensorData(reading: SensorReading): LightSensorData {
  const {
    ldr_top_left,
    ldr_top_right,
    ldr_bottom_left,
    ldr_bottom_right,
    horizontal_light_difference,
    vertical_light_difference,
  } = reading;
  return {
    topLeft: ldr_top_left,
    topRight: ldr_top_right,
    bottomLeft: ldr_bottom_left,
    bottomRight: ldr_bottom_right,
    horizontalDiff: horizontal_light_difference,
    verticalDiff: vertical_light_difference,
    balanceStatus: calculateBalanceStatus(
      horizontal_light_difference,
      vertical_light_difference,
      ldr_top_left
    ),
  };
}

export function derivePanelMode(
  reading: SensorReading,
  lightSensors: LightSensorData
): PanelMode {
  if (reading.tracking_mode === "ERROR") return "ERROR";
  if (lightSensors.balanceStatus === "NIGHT") return "NIGHT";
  if (reading.tracking_mode === "MANUAL") return "MANUAL";
  if (reading.tracking_mode === "IDLE") return "IDLE";
  return "TRACKING";
}

export function derivePanelStatusData(reading: SensorReading): PanelStatusData {
  const lightSensors = calculateLightSensorData(reading);
  return {
    mode: derivePanelMode(reading, lightSensors),
    horizontalAngle: reading.horizontal_angle,
    verticalAngle: reading.vertical_angle,
    isMoving: reading.is_moving,
    lightSensors,
  };
}

export function getBalanceBadgeVariant(
  status: BalanceStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "BALANCED":   return "default";
    case "ADJUSTING":  return "secondary";
    case "NIGHT":
    case "LOW_LIGHT":  return "outline";
    case "UNBALANCED": return "destructive";
  }
}

export function dirtColor(pct: number | null): string {
  if (pct === null) return "#94a3b8";
  if (pct < SOLAR_CONFIG.dirt.cleanThreshold) return "#22c55e";
  if (pct <= SOLAR_CONFIG.dirt.warningThreshold) return "#f59e0b";
  return "#ef4444";
}
