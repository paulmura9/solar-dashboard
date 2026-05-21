"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { apiKeys } from "@/types/api";

export function ShellPrefetch(): null {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    void mutate(apiKeys.latestReading);
    void mutate(apiKeys.devices);
  }, [mutate]);

  return null;
}
