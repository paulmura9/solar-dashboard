"use client";

import useSWR from "swr";
import { apiKeys, type EventListEnvelope, type SystemEvent } from "@/types/api";
import { mapEvent } from "@/lib/api";
import { PERF_CONFIG } from "@/config/perfConfig";

const EMPTY: SystemEvent[] = [];

export interface EventsResult {
  data: SystemEvent[];
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

export function useEvents(limit = PERF_CONFIG.cache.eventsCap): EventsResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR<EventListEnvelope>(
    apiKeys.events(limit)
  );

  const events = Array.isArray(data?.data) ? data.data.map(mapEvent) : EMPTY;

  return {
    data: events,
    error: (error as Error | undefined) ?? null,
    isLoading,
    isValidating,
    mutate: async () => {
      await mutate();
    },
  };
}
