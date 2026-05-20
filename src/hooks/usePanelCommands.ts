"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createCommand } from "@/lib/api";
import { buildMovePanelPayload } from "@/lib/solar/commands";
import type { CommandType, CommandDirection } from "@/lib/types";

const COOLDOWN_COMMANDS = new Set<CommandType>(["MOVE_PANEL", "RESET_POSITION"]);
const COOLDOWN_MS = 2_000;

interface CommandResult {
  ok: boolean;
  message: string;
}

interface PanelCommandsReturn {
  sending: boolean;
  lastResult: CommandResult | null;
  isCommandCooldown: (type: CommandType) => boolean;
  movePanel: (dir: CommandDirection, currentH: number, currentV: number) => Promise<void>;
  setMode: (mode: string) => Promise<void>;
  resetPosition: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

export function usePanelCommands(token: string | null): PanelCommandsReturn {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [cooldowns, setCooldowns] = useState<Partial<Record<CommandType, boolean>>>({});

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimersRef = useRef<Partial<Record<CommandType, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    for (const id of Object.values(cooldownTimersRef.current)) {
      if (id != null) clearTimeout(id);
    }
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
        ? { ok: true, message: "Command queued - awaiting acknowledgement" }
        : { ok: false, message: result.error ?? "Failed to send command" }
    );
    timerRef.current = setTimeout(() => setLastResult(null), 4_000);

    if (COOLDOWN_COMMANDS.has(type)) {
      const existing = cooldownTimersRef.current[type];
      if (existing != null) clearTimeout(existing);
      setCooldowns((prev) => ({ ...prev, [type]: true }));
      cooldownTimersRef.current[type] = setTimeout(() => {
        setCooldowns((prev) => ({ ...prev, [type]: false }));
      }, COOLDOWN_MS);
    }
  }, [token]);

  const isCommandCooldown = useCallback(
    (type: CommandType) => !!cooldowns[type],
    [cooldowns]
  );

  const movePanel = useCallback(
    (dir: CommandDirection, currentH: number, currentV: number) =>
      dispatch("MOVE_PANEL", buildMovePanelPayload(dir, currentH, currentV)),
    [dispatch]
  );

  const setMode       = useCallback((mode: string) => dispatch("SET_MODE", { mode }), [dispatch]);
  const resetPosition = useCallback(() => dispatch("RESET_POSITION"), [dispatch]);
  const startTracking = useCallback(() => dispatch("START_TRACKING"),  [dispatch]);
  const stopTracking  = useCallback(() => dispatch("STOP_TRACKING"),   [dispatch]);

  return { sending, lastResult, isCommandCooldown, movePanel, setMode, resetPosition, startTracking, stopTracking };
}
