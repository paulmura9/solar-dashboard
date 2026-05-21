"use client";

import useSWR from "swr";
import { apiKeys, type DeviceListEnvelope, type DeviceStatus } from "@/types/api";
import { mapDevice } from "@/lib/api";

const EMPTY: DeviceStatus[] = [];

export interface DevicesResult {
  data: DeviceStatus[];
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
}

export function useDevices(): DevicesResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR<DeviceListEnvelope>(
    apiKeys.devices
  );

  const devices = Array.isArray(data?.data) ? data.data.map(mapDevice) : EMPTY;

  return {
    data: devices,
    error: (error as Error | undefined) ?? null,
    isLoading,
    isValidating,
    mutate: async () => {
      await mutate();
    },
  };
}
