"use client";

import useSWR from "swr";
import { apiKeys, type CommandListEnvelope, type DeviceCommand } from "@/types/api";
import type {
  CommandStatus,
  CommandType,
} from "@/lib/types";

const EMPTY: DeviceCommand[] = [];

type RawRecord = Record<string, unknown>;

function pickField<T>(o: RawRecord, camel: string, snake: string): T {
  return (o[camel] ?? o[snake]) as T;
}

function mapCommand(raw: unknown): DeviceCommand {
  const o = (raw !== null && typeof raw === "object" ? raw : {}) as RawRecord;
  return {
    id: o.id as string,
    command_type: pickField<CommandType>(o, "commandType", "command_type"),
    payload: (o.payload ?? {}) as Record<string, unknown>,
    status: o.status as CommandStatus,
    error_message: pickField<string | null>(o, "errorMessage", "error_message"),
    ack_payload: (pickField<Record<string, unknown> | null>(o, "ackPayload", "ack_payload") ?? {}) as Record<string, unknown>,
    created_at: pickField<string>(o, "createdAt", "created_at"),
    sent_at: pickField<string | null>(o, "sentAt", "sent_at"),
    acknowledged_at: pickField<string | null>(o, "acknowledgedAt", "acknowledged_at"),
  };
}

export interface CommandsResult {
  data: DeviceCommand[];
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

export function useCommands(limit = 10): CommandsResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR<CommandListEnvelope>(
    apiKeys.commands(limit)
  );

  const commands = Array.isArray(data?.data) ? data.data.map(mapCommand) : EMPTY;

  return {
    data: commands,
    error: (error as Error | undefined) ?? null,
    isLoading,
    isValidating,
    mutate: async () => {
      await mutate();
    },
  };
}

export { mapCommand };
