"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiKeys, type ReadingListEnvelope, type SensorReading } from "@/types/api";
import { mapReading } from "@/lib/api";
import { PERF_CONFIG } from "@/config/perfConfig";

const EMPTY_HISTORY: SensorReading[] = [];

export interface ReadingsHistoryResult {
  data: SensorReading[];
  error: Error | null;
  isInitialLoad: boolean;
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
  const { data, error, mutate } = useSWR<ReadingListEnvelope>(
    apiKeys.readingsHistory(hours, limit),
    { refreshInterval: 0 }
  );

  const readings = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map(mapReading) : EMPTY_HISTORY),
    [data]
  );

  return {
    data: readings,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
