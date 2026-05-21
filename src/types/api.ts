import type {
  SensorReading,
  VisionResult,
  SystemEvent,
  DeviceStatus,
  DeviceCommand,
} from "@/lib/types";

export interface ApiEnvelope<T> {
  data: T;
}

export type ReadingEnvelope = ApiEnvelope<unknown>;
export type ReadingListEnvelope = ApiEnvelope<unknown[]>;
export type VisionEnvelope = ApiEnvelope<unknown>;
export type VisionListEnvelope = ApiEnvelope<unknown[]>;
export type EventListEnvelope = ApiEnvelope<unknown[]>;
export type DeviceListEnvelope = ApiEnvelope<unknown[]>;
export type CommandListEnvelope = ApiEnvelope<unknown[]>;

export const apiKeys = {
  latestReading: "/api/readings/latest",
  readingsHistory: (hours: number, limit: number): string =>
    `/api/readings/history?hours=${hours}&limit=${limit}`,
  latestVision: "/api/vision/latest",
  visionHistory: "/api/vision/history",
  events: (limit: number): string => `/api/events?limit=${limit}`,
  devices: "/api/devices",
  commands: (limit: number): string => `/api/commands?limit=${limit}`,
} as const;

export type {
  SensorReading,
  VisionResult,
  SystemEvent,
  DeviceStatus,
  DeviceCommand,
};
