export const SOLAR_CONFIG = {
  ldr: {
    maxValue: 4095,
    nightThreshold: 100,
    lowLightThreshold: 500,
    balanceDeadband: 50,
  },
  battery: {
    emptyVoltage: 6.6,
    fullVoltage: 8.4,
    lowPercent: 20,
    warningPercent: 40,
  },
  weather: {
    cloudCoverWarningPercent: 60,
    rainProbabilityWarningPercent: 40,
    locationLat: 45.7489,
    locationLon: 21.2087,
    timezone: "Europe/Bucharest",
  },
  panel: {
    minAngle: 0,
    maxAngle: 180,
    stepAngle: 5,
    peakPowerW: 4.2,
    daylightHoursDefault: 6.0,
    maxLossFactor: 0.85,
  },
  refresh: {
    telemetryMs: 30_000,
    controlMs: 10_000,
    weatherMs: 600_000,
  },
  camera: {
    streamUrl: process.env.NEXT_PUBLIC_CAMERA_STREAM_URL ?? "http://192.168.100.145:5000/stream",
  },
} as const;
