import { SOLAR_CONFIG } from "@/config/solarConfig";
import { getWeatherStatus, computeSolarNoon } from "@/lib/solar/weather";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiFetch } from "./backendClient";
import type {
  SensorReading,
  VisionResult,
  SystemEvent,
  DeviceStatus,
  DeviceCommand,
  CommandType,
  WeatherData,
} from "./types";

type RawJson = Record<string, unknown>;

function pick<T>(o: RawJson, camel: string, snake: string): T {
  return (o[camel] ?? o[snake]) as T;
}

function asRecord(d: unknown): RawJson {
  return (d !== null && typeof d === "object" ? d : {}) as RawJson;
}

export function mapReading(d: unknown): SensorReading {
  const o = asRecord(d);
  return {
    id:                          o.id as number,
    timestamp:                   o.timestamp as string,
    horizontal_angle:            pick<number>(o, "horizontalAngle", "horizontal_angle"),
    vertical_angle:              pick<number>(o, "verticalAngle", "vertical_angle"),
    tracking_mode:               pick(o, "trackingMode", "tracking_mode"),
    is_moving:                   pick<boolean>(o, "isMoving", "is_moving"),
    ldr_top_left:                pick<number | null>(o, "ldrTopLeft", "ldr_top_left"),
    ldr_top_right:               pick<number | null>(o, "ldrTopRight", "ldr_top_right"),
    ldr_bottom_left:             pick<number | null>(o, "ldrBottomLeft", "ldr_bottom_left"),
    ldr_bottom_right:            pick<number | null>(o, "ldrBottomRight", "ldr_bottom_right"),
    horizontal_light_difference: pick<number | null>(o, "horizontalLightDifference", "horizontal_light_difference"),
    vertical_light_difference:   pick<number | null>(o, "verticalLightDifference", "vertical_light_difference"),
    battery_voltage:             pick<number | null>(o, "batteryVoltage", "battery_voltage"),
    battery_percent:             pick<number | null>(o, "batteryPercent", "battery_percent"),
    battery_status:              pick(o, "batteryStatus", "battery_status"),
    solar_voltage:               pick<number | null>(o, "solarVoltage", "solar_voltage"),
    solar_current:               pick<number | null>(o, "solarCurrent", "solar_current"),
    solar_power:                 pick<number | null>(o, "solarPower", "solar_power"),
    solar_energy_today_wh:       pick<number | null>(o, "solarEnergyTodayWh", "solar_energy_today_wh"),
    charging_voltage:            pick<number | null>(o, "chargingVoltage", "charging_voltage"),
    charging_current:            pick<number | null>(o, "chargingCurrent", "charging_current"),
    charging_power:              pick<number | null>(o, "chargingPower", "charging_power"),
    charged_energy_today_wh:     pick<number | null>(o, "chargedEnergyTodayWh", "charged_energy_today_wh"),
    ambient_light_lux:           pick<number | null>(o, "ambientLightLux", "ambient_light_lux"),
    created_at:                  pick<string>(o, "createdAt", "created_at"),
  };
}

export function mapVision(d: unknown): VisionResult {
  const o = asRecord(d);
  return {
    id:                   o.id as number,
    timestamp:            o.timestamp as string,
    dirt_level_percent:   pick<number>(o, "dirtLevelPercent", "dirt_level_percent"),
    cleanliness_percent:  pick<number>(o, "cleanlinessPercent", "cleanliness_percent"),
    cleaning_required:    pick<boolean>(o, "cleaningRequired", "cleaning_required"),
    confidence:           o.confidence as number | null,
    image_path:           pick<string | null>(o, "imagePath", "image_path"),
    processed_image_path: pick<string | null>(o, "processedImagePath", "processed_image_path"),
    created_at:           pick<string>(o, "createdAt", "created_at"),
  };
}

export function mapEvent(d: unknown): SystemEvent {
  const o = asRecord(d);
  return {
    id:         o.id as number,
    timestamp:  o.timestamp as string,
    event_type: pick<string>(o, "eventType", "event_type"),
    severity:   o.severity as SystemEvent["severity"],
    message:    o.message as string,
    created_at: pick<string>(o, "createdAt", "created_at"),
  };
}

export function mapDevice(d: unknown): DeviceStatus {
  const o = asRecord(d);
  return {
    id:               o.id as number,
    device_name:      pick<string>(o, "deviceName", "device_name"),
    is_online:        pick<boolean>(o, "isOnline", "is_online"),
    last_seen:        pick<string | null>(o, "lastSeen", "last_seen"),
    firmware_version: pick<string | null>(o, "firmwareVersion", "firmware_version"),
    status_message:   pick<string | null>(o, "statusMessage", "status_message"),
    updated_at:       pick<string>(o, "updatedAt", "updated_at"),
  };
}

function mapCommand(d: unknown): DeviceCommand {
  const o = asRecord(d);
  return {
    id:              o.id as string,
    command_type:    pick(o, "commandType", "command_type"),
    payload:         (o.payload ?? {}) as Record<string, unknown>,
    status:          o.status as DeviceCommand["status"],
    error_message:   pick<string | null>(o, "errorMessage", "error_message"),
    ack_payload:     (pick(o, "ackPayload", "ack_payload") ?? {}) as Record<string, unknown>,
    created_at:      pick<string>(o, "createdAt", "created_at"),
    sent_at:         pick<string | null>(o, "sentAt", "sent_at"),
    acknowledged_at: pick<string | null>(o, "acknowledgedAt", "acknowledged_at"),
  };
}

interface ApiResponse<T> {
  data: T;
}

export async function getLatestReading(token: string): Promise<SensorReading | null> {
  const res = await apiFetch<ApiResponse<unknown>>("/api/readings/latest", token);
  if (!res.ok || !res.data?.data) return null;
  return mapReading(res.data.data);
}

export async function getReadingsHistory(token: string, hours = 24): Promise<SensorReading[]> {
  const res = await apiFetch<ApiResponse<unknown[]>>(
    `/api/readings/history?hours=${hours}&limit=500`,
    token
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data.map(mapReading);
}

export async function getLatestVision(token: string): Promise<VisionResult | null> {
  const res = await apiFetch<ApiResponse<unknown>>("/api/vision/latest", token);
  if (!res.ok || !res.data?.data) return null;
  return mapVision(res.data.data);
}

export async function getVisionHistory(token: string): Promise<VisionResult[]> {
  const res = await apiFetch<ApiResponse<unknown[]>>("/api/vision/history", token);
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data.map(mapVision);
}

export async function getRecentEvents(token: string, limit = 20): Promise<SystemEvent[]> {
  const res = await apiFetch<ApiResponse<unknown[]>>(`/api/events?limit=${limit}`, token);
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data.map(mapEvent);
}

export async function getDevices(token: string): Promise<DeviceStatus[]> {
  const res = await apiFetch<ApiResponse<unknown[]>>("/api/devices", token);
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data.map(mapDevice);
}

export interface CreateCommandPayload {
  command_type: CommandType;
  payload: Record<string, unknown>;
}

export type CreateCommandResult =
  | { success: true; commandId: string; status: "PENDING" | "SENT" }
  | { success: false; error: string };

export async function createCommand(
  token: string,
  command: CreateCommandPayload
): Promise<CreateCommandResult> {
  const res = await apiFetch<ApiResponse<RawJson>>(
    "/api/commands",
    token,
    { method: "POST", body: JSON.stringify(command) }
  );
  if (!res.ok) return { success: false, error: res.error };

  const body = res.data?.data as { id?: unknown; status?: unknown } | undefined;
  const id = body?.id;
  const status = body?.status;
  if (typeof id !== "string" || (status !== "PENDING" && status !== "SENT")) {
    if (process.env.NODE_ENV === "development") {
      console.warn("createCommand: unexpected response shape", res.data); // dev: contract drift with backend
    }
    return { success: false, error: "Invalid response" };
  }
  return { success: true, commandId: id, status };
}

export async function getRecentCommands(token: string, limit = 10): Promise<DeviceCommand[]> {
  const res = await apiFetch<ApiResponse<unknown[]>>(`/api/commands?limit=${limit}`, token);
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data.map(mapCommand);
}

export async function getSunToday(): Promise<WeatherData | null> {
  try {
    const { locationLat: lat, locationLon: lon, timezone } = SOLAR_CONFIG.weather;
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=cloud_cover,weather_code` +
      `&daily=sunrise,sunset` +
      `&timezone=${encodeURIComponent(timezone)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = await res.json() as {
      current: { cloud_cover: number; weather_code: number };
      daily:   { sunrise: string[]; sunset: string[] };
    };
    const cur     = json.current;
    const sunrise = json.daily.sunrise[0];
    const sunset  = json.daily.sunset[0];
    return {
      weatherStatus: getWeatherStatus(cur.weather_code, cur.cloud_cover),
      sunrise,
      sunset,
      solarNoon:     computeSolarNoon(sunrise, sunset),
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("getSunToday:", err); // dev: surfaces Open-Meteo upstream issues
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
    if (process.env.NODE_ENV === "development") console.debug("[storage] No signed URL for path:", path); // dev: non-fatal missing image path
    return null;
  }

  return data.signedUrl;
}
