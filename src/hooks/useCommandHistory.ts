"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getRecentCommands } from "@/lib/api";
import { useWSEvent } from "@/hooks/useWSEvent";
import { useWSReconnectResync } from "@/hooks/useWSReconnectResync";
import type { DeviceCommand } from "@/lib/types";
import type { CommandStatusUpdate } from "@/lib/ws/types";

interface CommandHistoryResult {
  commands: DeviceCommand[];
  refresh: () => void;
}

export function useCommandHistory(token: string | null, limit = 10): CommandHistoryResult {
  const [commands, setCommands] = useState<DeviceCommand[]>([]);

  const doFetch = useCallback(async (): Promise<void> => {
    if (!token) return;
    const data = await getRecentCommands(token, limit);
    setCommands(data);
  }, [token, limit]);

  const doFetchRef = useRef(doFetch);
  useEffect(() => { doFetchRef.current = doFetch; }, [doFetch]);

  useEffect(() => {
    if (!token) return;
    void doFetchRef.current();
  }, [token]);

  const handleStatusUpdate = useCallback((update: CommandStatusUpdate): void => {
    setCommands((prev) =>
      prev.map((c) =>
        c.id === update.commandId
          ? {
              ...c,
              status: update.status,
              acknowledged_at: update.acknowledged_at ?? c.acknowledged_at,
              error_message: update.error_message ?? c.error_message,
            }
          : c,
      ),
    );
  }, []);
  useWSEvent("command_status_update", handleStatusUpdate);

  const resync = useCallback((): void => { void doFetchRef.current(); }, []);
  useWSReconnectResync(resync);

  const refresh = useCallback((): void => { void doFetchRef.current(); }, []);

  return { commands, refresh };
}
