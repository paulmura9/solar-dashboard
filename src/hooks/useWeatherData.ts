"use client";

import { useState, useEffect } from "react";
import { getSunToday } from "@/lib/api";
import type { WeatherData } from "@/lib/types";

export function useWeatherData(): WeatherData | null {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      const result = await getSunToday();
      if (!cancelled && result) setData(result);
    })();
    return () => { cancelled = true; };
  }, []);

  return data;
}
