export const PERF_CONFIG = {
  swr: {
    dedupingIntervalMs: 2_000,
    errorRetryCount: 3,
    errorRetryBaseMs: 1_000,
    errorRetryMaxMs: 8_000,
  },
  charts: {
    historyHardCap: 500,
    downsampleThreshold: 2_000,
  },
  cache: {
    eventsCap: 10,
    historyCap: 500,
    visionHistoryCap: 50,
  },
} as const;
