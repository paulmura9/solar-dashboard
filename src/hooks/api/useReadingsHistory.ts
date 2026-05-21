"use client";

import useSWR from "swr";
import { apiKeys, type ReadingListEnvelope, type SensorReading } from "@/types/api";
import { mapReading } from "@/lib/api";
import { PERF_CONFIG } from "@/config/perfConfig";

const EMPTY_HISTORY: SensorReading[] = [];

export interface ReadingsHistoryResult {
  data: SensorReading[];
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

interface ReadingsHistoryParams {
  hours: number;
  limit?: number;
}

export function useReadingsHistory({
  hours,
  limit = PERF_CONFIG.charts.historyHardCap,
}: ReadingsHistoryParams): ReadingsHistoryResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ReadingListEnvelope>(
    apiKeys.readingsHistory(hours, limit),
    { refreshInterval: 0 }
  );

  const readings = Array.isArray(data?.data)
    ? data.data.map(mapReading)
    : EMPTY_HISTORY;

  return {
    data: readings,
    error: (error as Error | undefined) ?? null,
    isLoading,
    isValidating,
    mutate: async () => {
      await mutate();
    },
  };
}
