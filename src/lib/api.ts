import { SOLAR_CONFIG } from "@/config/solarConfig";
import {
  getWeatherStatus,
  getEfficiencyWarning,
  computeSolarNoon,
  isDaytime as checkDaytime,
} from "@/lib/solar/weather";
import { apiFetch } from "./backendClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  SensorReading,
  VisionResult,
  SystemEvent,
  DeviceStatus,
  DeviceCommand,
  CommandType,
  WeatherData,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReading(d: any): SensorReading {
  return {
    id: d.id,
    timestamp: d.timestamp,
    horizontal_angle:             d.horizontalAngle             ?? d.horizontal_angle,
    vertical_angle:               d.verticalAngle               ?? d.vertical_angle,
    tracking_mode:                d.trackingMode                ?? d.tracking_mode,
    is_moving:                    d.isMoving                    ?? d.is_moving,
    ldr_top_left:                 d.ldrTopLeft                  ?? d.ldr_top_left,
    ldr_top_right:                d.ldrTopRight                 ?? d.ldr_top_right,
    ldr_bottom_left:              d.ldrBottomLeft               ?? d.ldr_bottom_left,
    ldr_bottom_right:             d.ldrBottomRight              ?? d.ldr_bottom_right,
    horizontal_light_difference:  d.horizontalLightDifference   ?? d.horizontal_light_difference,
    vertical_light_difference:    d.verticalLightDifference     ?? d.vertical_light_difference,
    battery_voltage:              d.batteryVoltage              ?? d.battery_voltage,
    battery_percent:              d.batteryPercent              ?? d.battery_percent,
    battery_status:               d.batteryStatus               ?? d.battery_status,
    solar_voltage:                d.solarVoltage                ?? d.solar_voltage,
    solar_current:                d.solarCurrent                ?? d.solar_current,
    solar_power:                  d.solarPower                  ?? d.solar_power,
    solar_energy_today_wh:        d.solarEnergyTodayWh          ?? d.solar_energy_today_wh,
    charging_voltage:             d.chargingVoltage             ?? d.charging_voltage,
    charging_current:             d.chargingCurrent             ?? d.charging_current,
    charging_power:               d.chargingPower               ?? d.charging_power,
    charged_energy_today_wh:      d.chargedEnergyTodayWh        ?? d.charged_energy_today_wh,
    ambient_light_lux:            d.ambientLightLux             ?? d.ambient_light_lux,
    created_at:                   d.createdAt                   ?? d.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVision(d: any): VisionResult {
  return {
    id: d.id,
    timestamp: d.timestamp,
    dirt_level_percent:    d.dirtLevelPercent    ?? d.dirt_level_percent,
    cleanliness_percent:   d.cleanlinessPercent  ?? d.cleanliness_percent,
    cleaning_required:     d.cleaningRequired    ?? d.cleaning_required,
    confidence:            d.confidence,
    image_path:            d.imagePath           ?? d.image_path,
    processed_image_path:  d.processedImagePath  ?? d.processed_image_path,
    created_at:            d.createdAt           ?? d.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(d: any): SystemEvent {
  return {
    id: d.id,
    timestamp: d.timestamp,
    event_type:  d.eventType  ?? d.event_type,
    severity:    d.severity,
    message:     d.message,
    created_at:  d.createdAt  ?? d.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDevice(d: any): DeviceStatus {
  return {
    id: d.id,
    device_name:      d.deviceName      ?? d.device_name,
    is_online:        d.isOnline        ?? d.is_online,
    last_seen:        d.lastSeen        ?? d.last_seen,
    firmware_version: d.firmwareVersion ?? d.firmware_version,
    status_message:   d.statusMessage   ?? d.status_message,
    updated_at:       d.updatedAt       ?? d.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCommand(d: any): DeviceCommand {
  return {
    id: d.id,
    command_type:    d.commandType    ?? d.command_type,
    payload:         d.payload,
    status:          d.status,
    error_message:   d.errorMessage   ?? d.error_message,
    ack_payload:     d.ackPayload     ?? d.ack_payload,
    created_at:      d.createdAt      ?? d.created_at,
    sent_at:         d.sentAt         ?? d.sent_at,
    acknowledged_at: d.acknowledgedAt ?? d.acknowledged_at,
  };
}

interface ApiResponse<T> {
  data: T;
  timestamp: string;
  total?: number;
}

export async function getLatestReading(token: string): Promise<SensorReading | null> {
  const result = await apiFetch<ApiResponse<unknown>>("/api/readings/latest", token);
  if (!result?.data) return null;
  return mapReading(result.data);
}

export async function getReadingsHistory(token: string, hours = 24): Promise<SensorReading[]> {
  const result = await apiFetch<ApiResponse<unknown[]>>(
    `/api/readings/history?hours=${hours}&limit=500`,
    token
  );
  if (!Array.isArray(result?.data)) return [];
  return result.data.map(mapReading);
}

export async function getLatestVision(token: string): Promise<VisionResult | null> {
  const result = await apiFetch<ApiResponse<unknown>>("/api/vision/latest", token);
  if (!result?.data) return null;
  return mapVision(result.data);
}

export async function getVisionHistory(token: string): Promise<VisionResult[]> {
  const result = await apiFetch<ApiResponse<unknown[]>>("/api/vision/history", token);
  if (!Array.isArray(result?.data)) return [];
  return result.data.map(mapVision);
}

export async function getRecentEvents(token: string, limit = 20): Promise<SystemEvent[]> {
  const result = await apiFetch<ApiResponse<unknown[]>>(`/api/events?limit=${limit}`, token);
  if (!Array.isArray(result?.data)) return [];
  return result.data.map(mapEvent);
}

export async function getDevices(token: string): Promise<DeviceStatus[]> {
  const result = await apiFetch<ApiResponse<unknown[]>>("/api/devices", token);
  if (!Array.isArray(result?.data)) return [];
  return result.data.map(mapDevice);
}

export interface CreateCommandPayload {
  command_type: CommandType;
  payload: Record<string, unknown>;
}

export async function createCommand(
  token: string,
  command: CreateCommandPayload
): Promise<{ success: boolean; error?: string }> {
  const result = await apiFetch<ApiResponse<unknown>>(
    "/api/commands",
    token,
    { method: "POST", body: JSON.stringify(command) }
  );
  if (!result) return { success: false, error: "Request failed" };
  return { success: true };
}

export async function getRecentCommands(token: string, limit = 10): Promise<DeviceCommand[]> {
  const result = await apiFetch<ApiResponse<unknown[]>>(`/api/commands?limit=${limit}`, token);
  if (!Array.isArray(result?.data)) return [];
  return result.data.map(mapCommand);
}

export async function getSunToday(): Promise<WeatherData | null> {
  try {
    const { locationLat: lat, locationLon: lon, timezone } = SOLAR_CONFIG.weather;
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=cloud_cover,precipitation_probability,temperature_2m,weather_code,is_day` +
      `&daily=sunrise,sunset` +
      `&timezone=${encodeURIComponent(timezone)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = await res.json() as {
      current: { cloud_cover: number; precipitation_probability: number; temperature_2m: number; weather_code: number };
      daily:   { sunrise: string[]; sunset: string[] };
    };
    const cur     = json.current;
    const sunrise = json.daily.sunrise[0];
    const sunset  = json.daily.sunset[0];
    return {
      cloudCoverPercent:        cur.cloud_cover,
      rainProbabilityPercent:   cur.precipitation_probability,
      temperatureC:             cur.temperature_2m,
      weatherCode:              cur.weather_code,
      weatherStatus:            getWeatherStatus(cur.weather_code, cur.cloud_cover),
      sunrise,
      sunset,
      solarNoon:                computeSolarNoon(sunrise, sunset),
      isDaytime:                checkDaytime(sunrise, sunset),
      efficiencyWarning:        getEfficiencyWarning(cur.cloud_cover, cur.precipitation_probability),
    };
  } catch (err) {
    console.error("getSunToday:", err);
    return null;
  }
}

export async function getSignedImageUrl(path: string): Promise<string | null> {
  if (!path) return null;

  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.storage
    .from("panel-images")
    .createSignedUrl(path, SOLAR_CONFIG.storage.signedUrlTtlSeconds);

  if (error || !data?.signedUrl) {
    console.debug("[storage] No signed URL for path:", path);
    return null;
  }

  return data.signedUrl;
}
