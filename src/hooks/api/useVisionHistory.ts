"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiKeys, type VisionListEnvelope, type VisionResult } from "@/types/api";
import { mapVision } from "@/lib/api";

const EMPTY: VisionResult[] = [];

export interface VisionHistoryResult {
  data: VisionResult[];
  error: Error | null;
  isInitialLoad: boolean;
  mutate: () => Promise<void>;
}

export function useVisionHistory(): VisionHistoryResult {
  const { data, error, mutate } = useSWR<VisionListEnvelope>(apiKeys.visionHistory);

  const history = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map(mapVision) : EMPTY),
    [data]
  );

  return {
    data: history,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
