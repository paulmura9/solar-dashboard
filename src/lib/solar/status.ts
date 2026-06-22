import { SOLAR_CONFIG } from "@/config/solarConfig";
import type {
  SensorReading,
  PanelMode,
  LightSensorData,
  PanelStatusData,
} from "@/lib/types";

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
  };
}

export function derivePanelMode(reading: SensorReading): PanelMode {
  if (reading.tracking_mode === "ERROR") return "ERROR";
  if (reading.tracking_mode === "NIGHT") return "NIGHT";
  if (reading.tracking_mode === "MANUAL") return "MANUAL";
  if (reading.tracking_mode === "IDLE") return "IDLE";
  return "TRACKING";
}

export function derivePanelStatusData(reading: SensorReading): PanelStatusData {
  const lightSensors = calculateLightSensorData(reading);
  return {
    mode: derivePanelMode(reading),
    horizontalAngle: reading.horizontal_angle,
    verticalAngle: reading.vertical_angle,
    isMoving: reading.is_moving,
    lightSensors,
  };
}

export function dirtColor(pct: number | null): string {
  if (pct === null) return "#94a3b8";
  if (pct < SOLAR_CONFIG.dirt.cleanThreshold) return "#22c55e";
  if (pct <= SOLAR_CONFIG.dirt.warningThreshold) return "#f59e0b";
  return "#ef4444";
}
