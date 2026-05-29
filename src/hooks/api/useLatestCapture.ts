"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiKeys, type CaptureEnvelope, type CameraCapture } from "@/types/api";
import { mapCapture } from "@/lib/api";

export interface LatestCaptureResult {
  data: CameraCapture | null;
  error: Error | null;
  isInitialLoad: boolean;
  mutate: () => Promise<void>;
}

export function useLatestCapture(): LatestCaptureResult {
  const { data, error, mutate } = useSWR<CaptureEnvelope>(
    apiKeys.latestCapture,
    { refreshInterval: 0 }
  );

  const capture = useMemo(
    () => (data?.data ? mapCapture(data.data) : null),
    [data]
  );

  return {
    data: capture,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
