"use client";

import { useState, useEffect, useCallback } from "react";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import { getSunToday } from "@/lib/api";
import type { WeatherData } from "@/lib/types";

export function useWeatherData(): WeatherData | null {
  const [data, setData] = useState<WeatherData | null>(null);

  const fetchWeather = useCallback(async (): Promise<void> => {
    const result = await getSunToday();
    if (result) setData(result);
  }, []);

  useEffect(() => {
    const init = setTimeout(fetchWeather, 0);
    const id = setInterval(fetchWeather, SOLAR_CONFIG.refresh.weatherMs);
    return () => { clearTimeout(init); clearInterval(id); };
  }, [fetchWeather]);

  return data;
}
