"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { apiKeys, type DeviceListEnvelope, type DeviceStatus } from "@/types/api";
import { mapDevice } from "@/lib/api";

const EMPTY: DeviceStatus[] = [];

export interface DevicesResult {
  data: DeviceStatus[];
  error: Error | null;
  isInitialLoad: boolean;
  mutate: () => Promise<void>;
}

export function useDevices(): DevicesResult {
  const { data, error, mutate } = useSWR<DeviceListEnvelope>(apiKeys.devices);

  const devices = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map(mapDevice) : EMPTY),
    [data]
  );

  return {
    data: devices,
    error: (error as Error | undefined) ?? null,
    isInitialLoad: data === undefined && !error,
    mutate: async () => {
      await mutate();
    },
  };
}
