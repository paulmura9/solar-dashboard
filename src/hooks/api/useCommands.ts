"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { mapCommand } from "@/lib/api";
import { apiKeys, type CommandListEnvelope, type DeviceCommand } from "@/types/api";

const EMPTY: DeviceCommand[] = [];

export interface CommandsResult {
  data: DeviceCommand[];
  error: Error | null;
  isInitialLoad: boolean;
  mutate: () => Promise<void>;
}

export function useCommands(limit = 10): CommandsResult {
  const { data, error, mutate } = useSWR<CommandListEnvelope>(apiKeys.commands(limit));

  const commands = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map(mapCommand) : EMPTY),
    [data]
  );

  return {
    data: commands,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
