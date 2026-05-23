"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiKeys, type VisionEnvelope, type VisionResult } from "@/types/api";
import { mapVision } from "@/lib/api";

export interface LatestVisionResult {
  data: VisionResult | null;
  error: Error | null;
  isInitialLoad: boolean;
  mutate: () => Promise<void>;
}

export function useLatestVision(): LatestVisionResult {
  const { data, error, mutate } = useSWR<VisionEnvelope>(
    apiKeys.latestVision,
    { refreshInterval: 0 }
  );

  const vision = useMemo(
    () => (data?.data ? mapVision(data.data) : null),
    [data]
  );

  return {
    data: vision,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
