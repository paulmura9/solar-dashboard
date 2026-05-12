"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecentCommands } from "@/lib/api";
import type { DeviceCommand } from "@/lib/types";

const FAST_POLL_MS = 5_000;
const SLOW_POLL_MS = 30_000;

interface CommandHistoryResult {
  commands: DeviceCommand[];
  refresh: () => void;
}

export function useCommandHistory(token: string | null, limit = 10): CommandHistoryResult {
  const [commands, setCommands] = useState<DeviceCommand[]>([]);

  const hasPending = commands.some(
    (c) => c.status === "PENDING" || c.status === "SENT"
  );

  const doFetch = useCallback(async (): Promise<void> => {
    if (!token) return;
    const data = await getRecentCommands(token, limit);
    setCommands(data);
  }, [token, limit]);

  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => { void doFetch(); }, 0);
    const id = setInterval(doFetch, hasPending ? FAST_POLL_MS : SLOW_POLL_MS);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [token, hasPending, doFetch]);

  const refresh = useCallback((): void => { void doFetch(); }, [doFetch]);

  return { commands, refresh };
}
