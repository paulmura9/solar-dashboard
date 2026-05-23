"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiKeys, type ReadingEnvelope, type SensorReading } from "@/types/api";
import { mapReading } from "@/lib/api";

export interface LatestReadingResult {
  data: SensorReading | null;
  error: Error | null;
  isInitialLoad: boolean;
  mutate: () => Promise<void>;
}

export function useLatestReading(): LatestReadingResult {
  const { data, error, mutate } = useSWR<ReadingEnvelope>(
    apiKeys.latestReading,
    { refreshInterval: 0 }
  );

  const reading = useMemo(
    () => (data?.data ? mapReading(data.data) : null),
    [data]
  );

  return {
    data: reading,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
