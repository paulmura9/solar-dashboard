import type {
  SensorReading,
  DeviceStatus,
  VisionResult,
  SystemEvent,
  CommandStatus,
} from "@/lib/types";

export interface CommandStatusUpdate {
  commandId: string;
  status: CommandStatus;
  acknowledged_at?: string;
  error_message?: string;
}

/**
 * All server-pushed event types the dashboard understands.
 *
 * The map below scaffolds the full typed event surface for future consumers
 * (per-hook subscribers seeded directly from payloads). The current page-level
 * code only listens for `telemetry_update` as a refetch trigger.
 *
 * Add a new entry here when introducing a new event type on the backend.
 */
export type WSEventMap = {
  telemetry_update: SensorReading;
  device_status_update: DeviceStatus;
  command_status_update: CommandStatusUpdate;
  vision_update: VisionResult;
  event_notification: SystemEvent;
  reauth_ok: Record<string, never>;
  server_shutting_down: Record<string, never>;
};

export type WSEventType = keyof WSEventMap;
