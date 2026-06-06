"use client";

import { useState, useEffect } from "react";
import { getSunToday } from "@/lib/api";
import type { WeatherData } from "@/lib/types";

// Open-Meteo's "current" block advances every 15 min; refetch on that cadence so a
// long-open dashboard never displays an hours-old reading.
const WEATHER_REFRESH_MS = 15 * 60 * 1000;

export function useWeatherData(): WeatherData | null {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const result = await getSunToday();
      if (!cancelled && result) setData(result);
    };
    void load();
    const id = window.setInterval(load, WEATHER_REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  return data;
}
