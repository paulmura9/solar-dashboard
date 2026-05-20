import { SOLAR_CONFIG } from "@/config/solarConfig";
import type { WeatherStatus } from "@/lib/types";

export function formatSunTime(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getWeatherStatus(weatherCode: number, cloudCover: number): WeatherStatus {
  if (weatherCode >= 51) return "RAIN";
  if (cloudCover >= SOLAR_CONFIG.weather.cloudCoverWarningPercent) return "CLOUDY";
  if (cloudCover >= 30) return "PARTLY_CLOUDY";
  return "CLEAR";
}

export function computeSolarNoon(sunrise: string, sunset: string): string {
  const mid = (new Date(sunrise).getTime() + new Date(sunset).getTime()) / 2;
  return new Date(mid).toISOString();
}
