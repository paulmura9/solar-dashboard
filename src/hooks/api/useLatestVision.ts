"use client";

import useSWR from "swr";
import { apiKeys, type VisionEnvelope, type VisionResult } from "@/types/api";
import { mapVision } from "@/lib/api";

export interface LatestVisionResult {
  data: VisionResult | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

export function useLatestVision(): LatestVisionResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR<VisionEnvelope>(
    apiKeys.latestVision,
    { refreshInterval: 0 }
  );

  const vision = data?.data ? mapVision(data.data) : null;

  return {
    data: vision,
    error: (error as Error | undefined) ?? null,
    isLoading,
    isValidating,
    mutate: async () => {
      await mutate();
    },
  };
}
