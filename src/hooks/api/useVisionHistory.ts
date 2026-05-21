"use client";

import useSWR from "swr";
import { apiKeys, type VisionListEnvelope, type VisionResult } from "@/types/api";
import { mapVision } from "@/lib/api";

const EMPTY: VisionResult[] = [];

export interface VisionHistoryResult {
  data: VisionResult[];
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

export function useVisionHistory(): VisionHistoryResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR<VisionListEnvelope>(
    apiKeys.visionHistory
  );

  const history = Array.isArray(data?.data) ? data.data.map(mapVision) : EMPTY;

  return {
    data: history,
    error: (error as Error | undefined) ?? null,
    isLoading,
    isValidating,
    mutate: async () => {
      await mutate();
    },
  };
}
