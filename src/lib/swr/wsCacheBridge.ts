import type { ScopedMutator } from "swr";
import { mapReading, mapVision, mapEvent, mapDevice } from "@/lib/api";
import { apiKeys } from "@/types/api";
import { PERF_CONFIG } from "@/config/perfConfig";
import type { ApiEnvelope, SensorReading, VisionResult, SystemEvent, DeviceStatus, DeviceCommand } from "@/types/api";
import type { CommandStatusUpdate } from "@/lib/ws/types";

const REVALIDATE_OFF = { revalidate: false } as const;

function mergeReading(prev: SensorReading, next: SensorReading): SensorReading {
  return {
    id:                          next.id,
    timestamp:                   next.timestamp,
    horizontal_angle:            next.horizontal_angle,
    vertical_angle:              next.vertical_angle,
    tracking_mode:               next.tracking_mode,
    is_moving:                   next.is_moving,
    ldr_top_left:                next.ldr_top_left ?? prev.ldr_top_left,
    ldr_top_right:               next.ldr_top_right ?? prev.ldr_top_right,
    ldr_bottom_left:             next.ldr_bottom_left ?? prev.ldr_bottom_left,
    ldr_bottom_right:            next.ldr_bottom_right ?? prev.ldr_bottom_right,
    horizontal_light_difference: next.horizontal_light_difference ?? prev.horizontal_light_difference,
    vertical_light_difference:   next.vertical_light_difference ?? prev.vertical_light_difference,
    battery_voltage:             next.battery_voltage ?? prev.battery_voltage,
    battery_percent:             next.battery_percent ?? prev.battery_percent,
    battery_status:              next.battery_status ?? prev.battery_status,
    solar_voltage:               next.solar_voltage ?? prev.solar_voltage,
    solar_current:               next.solar_current ?? prev.solar_current,
    solar_power:                 next.solar_power ?? prev.solar_power,
    solar_energy_today_wh:       next.solar_energy_today_wh ?? prev.solar_energy_today_wh,
    charging_voltage:            next.charging_voltage ?? prev.charging_voltage,
    charging_current:            next.charging_current ?? prev.charging_current,
    charging_power:              next.charging_power ?? prev.charging_power,
    charged_energy_today_wh:     next.charged_energy_today_wh ?? prev.charged_energy_today_wh,
    ambient_light_lux:           next.ambient_light_lux ?? prev.ambient_light_lux,
    created_at:                  next.created_at,
  };
}

export function applyTelemetryUpdate(mutate: ScopedMutator, raw: unknown): void {
  const reading = mapReading(raw);

  void mutate(
    apiKeys.latestReading,
    (current: ApiEnvelope<unknown> | undefined): ApiEnvelope<SensorReading> => {
      const existing = current?.data as SensorReading | undefined;
      return { data: existing ? mergeReading(existing, reading) : reading };
    },
    REVALIDATE_OFF
  );

  void mutate(
    (key: unknown): boolean =>
      typeof key === "string" && key.startsWith("/api/readings/history"),
    (current: ApiEnvelope<unknown[]> | undefined): ApiEnvelope<unknown[]> | undefined => {
      if (!current || !Array.isArray(current.data)) return current;
      const existing = current.data as SensorReading[];
      if (existing.length > 0 && existing[existing.length - 1].id === reading.id) {
        return current;
      }
      const appended = [...existing, reading];
      const trimmed = appended.length > PERF_CONFIG.cache.historyCap
        ? appended.slice(appended.length - PERF_CONFIG.cache.historyCap)
        : appended;
      return { data: trimmed };
    },
    REVALIDATE_OFF
  );
}

export function applyVisionUpdate(mutate: ScopedMutator, raw: unknown): void {
  const vision = mapVision(raw);
  void mutate(apiKeys.latestVision, { data: vision }, REVALIDATE_OFF);
  void mutate(
    apiKeys.visionHistory,
    (current: ApiEnvelope<unknown[]> | undefined): ApiEnvelope<unknown[]> | undefined => {
      if (!current || !Array.isArray(current.data)) return { data: [vision] };
      const existing = current.data as VisionResult[];
      const next = [vision, ...existing].slice(0, PERF_CONFIG.cache.visionHistoryCap);
      return { data: next };
    },
    REVALIDATE_OFF
  );
}

export function applyEventUpdate(mutate: ScopedMutator, raw: unknown): void {
  const event = mapEvent(raw);
  void mutate(
    (key: unknown): boolean =>
      typeof key === "string" && key.startsWith("/api/events"),
    (current: ApiEnvelope<unknown[]> | undefined): ApiEnvelope<unknown[]> | undefined => {
      if (!current || !Array.isArray(current.data)) return { data: [event] };
      const existing = current.data as SystemEvent[];
      const next = [event, ...existing].slice(0, PERF_CONFIG.cache.eventsCap);
      return { data: next };
    },
    REVALIDATE_OFF
  );
}

export function applyDeviceUpdate(mutate: ScopedMutator, raw: unknown): void {
  const update = mapDevice(raw);
  void mutate(
    apiKeys.devices,
    (current: ApiEnvelope<unknown[]> | undefined): ApiEnvelope<unknown[]> | undefined => {
      if (!current || !Array.isArray(current.data)) return { data: [update] };
      const existing = current.data as DeviceStatus[];
      const idx = existing.findIndex((d) => d.device_name === update.device_name);
      if (idx === -1) return { data: [...existing, update] };
      const next = existing.slice();
      next[idx] = update;
      return { data: next };
    },
    REVALIDATE_OFF
  );
}

const VALID_COMMAND_STATUSES: ReadonlySet<string> = new Set(["PENDING", "SENT", "ACKNOWLEDGED", "FAILED"]);

function isCommandStatusUpdate(value: unknown): value is CommandStatusUpdate {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return false;
  if (typeof o.status !== "string" || !VALID_COMMAND_STATUSES.has(o.status)) return false;
  if (o.acknowledged_at != null && typeof o.acknowledged_at !== "string") return false;
  if (o.error_message != null && typeof o.error_message !== "string") return false;
  return true;
}

export function applyCommandStatusUpdate(mutate: ScopedMutator, raw: unknown): void {
  if (!isCommandStatusUpdate(raw)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[ws] discarded malformed command_status_update", raw);
    }
    return;
  }
  const update = raw;
  void mutate(
    (key: unknown): boolean =>
      typeof key === "string" && key.startsWith("/api/commands"),
    (current: ApiEnvelope<unknown[]> | undefined): ApiEnvelope<unknown[]> | undefined => {
      if (!current || !Array.isArray(current.data)) return current;
      const existing = current.data as DeviceCommand[];
      const next = existing.map((c) =>
        c.id === update.id
          ? {
              ...c,
              status: update.status,
              acknowledged_at: update.acknowledged_at ?? c.acknowledged_at,
              error_message: update.error_message ?? c.error_message,
            }
          : c
      );
      return { data: next };
    },
    REVALIDATE_OFF
  );
}
