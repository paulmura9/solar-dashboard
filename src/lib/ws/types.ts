import type { CommandStatus } from "@/lib/types";

export interface CommandStatusUpdate {
  commandId: string;
  status: CommandStatus;
  acknowledged_at?: string;
  error_message?: string;
}

export type WSEventMap = {
  telemetry_update: unknown;
  device_status_update: unknown;
  command_status_update: CommandStatusUpdate;
  vision_update: unknown;
  event_notification: unknown;
  reauth_ok: Record<string, never>;
  server_shutting_down: Record<string, never>;
};

export type WSEventType = keyof WSEventMap;
