import type { CommandStatus } from "@/lib/types";

export interface CommandStatusUpdate {
  commandId: string;
  status: CommandStatus;
  acknowledged_at?: string;
  error_message?: string;
}
