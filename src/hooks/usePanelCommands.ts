"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { mutate as globalMutate } from "swr";
import { createCommand } from "@/lib/api";
import { buildMovePanelPayload } from "@/lib/solar/commands";
import type { MovePanelTarget } from "@/lib/solar/commands";
import type { CommandType, CommandDirection, DeviceCommand, TrackingMode } from "@/lib/types";

const COOLDOWN_COMMANDS = new Set<CommandType>(["RESET_POSITION"]);
const COOLDOWN_MS = 2_000;
const MOVE_THROTTLE_MS = 200; // 5 commands/second per direction
const COMMAND_HISTORY_CAP = 50;

function insertOptimisticCommand(row: DeviceCommand): void {
  void globalMutate(
    (key: unknown): boolean => typeof key === "string" && key.startsWith("/api/commands"),
    (current: { data: DeviceCommand[] } | undefined): { data: DeviceCommand[] } | undefined => {
      if (!current?.data) return current;
      const without = current.data.filter((c) => c.id !== row.id);
      return { data: [row, ...without].slice(0, COMMAND_HISTORY_CAP) };
    },
    { revalidate: false }
  );
}

interface CommandResult {
  ok: boolean;
  message: string;
}

interface PanelCommandsReturn {
  sending: boolean;
  lastResult: CommandResult | null;
  isCommandCooldown: (type: CommandType) => boolean;
  movePanel: (dir: CommandDirection, currentH: number, currentV: number) => Promise<MovePanelTarget | null>;
  setMode: (mode: TrackingMode) => Promise<void>;
  resetPosition: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

export function usePanelCommands(token: string | null): PanelCommandsReturn {
  const [sendingCount, setSendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [cooldowns, setCooldowns] = useState<Partial<Record<CommandType, boolean>>>({});

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimersRef = useRef<Partial<Record<CommandType, ReturnType<typeof setTimeout>>>>({});
  const moveLastAtRef = useRef<Partial<Record<CommandDirection, number>>>({});

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
    setSendingCount((c) => c + 1);
    let result: Awaited<ReturnType<typeof createCommand>>;
    try {
      result = await createCommand(token, { command_type: type, payload });
    } finally {
      setSendingCount((c) => c - 1);
    }
    if (result.success) {
      const nowIso = new Date().toISOString();
      insertOptimisticCommand({
        id: result.commandId,
        command_type: type,
        payload,
        status: result.status,
        error_message: null,
        created_at: nowIso,
        sent_at: result.status === "SENT" ? nowIso : null,
        acknowledged_at: null,
      });
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setLastResult(
      result.success
        ? { ok: true, message: "Command queued - awaiting acknowledgement" }
        : { ok: false, message: result.error }
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
    async (dir: CommandDirection, currentH: number, currentV: number): Promise<MovePanelTarget | null> => {
      const now = Date.now();
      const last = moveLastAtRef.current[dir] ?? 0;
      if (now - last < MOVE_THROTTLE_MS) return null;
      moveLastAtRef.current[dir] = now;
      const target = buildMovePanelPayload(dir, currentH, currentV);
      await dispatch("MOVE_PANEL", { ...target });
      return target;
    },
    [dispatch]
  );

  const setMode       = useCallback((mode: TrackingMode) => dispatch("SET_MODE", { mode }), [dispatch]);
  const resetPosition = useCallback(() => dispatch("RESET_POSITION"), [dispatch]);
  const startTracking = useCallback(() => dispatch("START_TRACKING"),  [dispatch]);
  const stopTracking  = useCallback(() => dispatch("STOP_TRACKING"),   [dispatch]);

  return {
    sending: sendingCount > 0,
    lastResult,
    isCommandCooldown,
    movePanel,
    setMode,
    resetPosition,
    startTracking,
    stopTracking,
  };
}
