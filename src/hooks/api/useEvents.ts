"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiKeys, type EventListEnvelope, type SystemEvent } from "@/types/api";
import { mapEvent } from "@/lib/api";
import { PERF_CONFIG } from "@/config/perfConfig";

const EMPTY: SystemEvent[] = [];

export interface EventsResult {
  data: SystemEvent[];
  error: Error | null;
  isInitialLoad: boolean;
  mutate: () => Promise<void>;
}

export function useEvents(limit = PERF_CONFIG.cache.eventsCap): EventsResult {
  const { data, error, mutate } = useSWR<EventListEnvelope>(apiKeys.events(limit));

  const events = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map(mapEvent) : EMPTY),
    [data]
  );

  return {
    data: events,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
