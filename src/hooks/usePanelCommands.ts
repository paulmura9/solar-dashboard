"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createCommand } from "@/lib/api";
import { buildMovePanelPayload, buildSetModePayload } from "@/lib/solar/commands";
import type { CommandType, CommandDirection } from "@/lib/types";

interface CommandResult {
  ok: boolean;
  message: string;
}

interface PanelCommandsReturn {
  sending: boolean;
  lastResult: CommandResult | null;
  movePanel: (dir: CommandDirection, currentH: number, currentV: number) => Promise<void>;
  setMode: (mode: string) => Promise<void>;
  resetPosition: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

export function usePanelCommands(token: string | null): PanelCommandsReturn {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const dispatch = useCallback(async (
    type: CommandType,
    payload: Record<string, unknown> = {}
  ): Promise<void> => {
    if (!token) {
      setLastResult({ ok: false, message: "Not authenticated" });
      return;
    }
    setSending(true);
    const result = await createCommand(token, { command_type: type, payload });
    setSending(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setLastResult(
      result.success
        ? { ok: true, message: "Command queued — awaiting acknowledgement" }
        : { ok: false, message: result.error ?? "Failed to send command" }
    );
    timerRef.current = setTimeout(() => setLastResult(null), 4000);
  }, [token]);

  const movePanel = useCallback(
    (dir: CommandDirection, currentH: number, currentV: number) =>
      dispatch("MOVE_PANEL", buildMovePanelPayload(dir, currentH, currentV)),
    [dispatch]
  );

  const setMode    = useCallback((mode: string) => dispatch("SET_MODE", buildSetModePayload(mode)), [dispatch]);
  const resetPosition = useCallback(() => dispatch("RESET_POSITION"), [dispatch]);
  const startTracking  = useCallback(() => dispatch("START_TRACKING"),  [dispatch]);
  const stopTracking   = useCallback(() => dispatch("STOP_TRACKING"),   [dispatch]);

  return { sending, lastResult, movePanel, setMode, resetPosition, startTracking, stopTracking };
}
