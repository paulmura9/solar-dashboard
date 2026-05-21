"use client";

import useSWR from "swr";
import { apiKeys, type ReadingEnvelope, type SensorReading } from "@/types/api";
import { mapReading } from "@/lib/api";

export interface LatestReadingResult {
  data: SensorReading | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

export function useLatestReading(): LatestReadingResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ReadingEnvelope>(
    apiKeys.latestReading,
    { refreshInterval: 0 }
  );

  const reading = data?.data ? mapReading(data.data) : null;

  return {
    data: reading,
    error: (error as Error | undefined) ?? null,
    isLoading,
    isValidating,
    mutate: async () => {
      await mutate();
    },
  };
}
