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
