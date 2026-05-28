import { SOLAR_CONFIG } from "@/config/solarConfig";
import type { CommandType, CommandDirection, DeviceCommand } from "@/lib/types";

export interface MovePanelTarget {
  h_angle: number;
  v_angle: number;
}

export function buildMovePanelPayload(
  direction: CommandDirection,
  currentH: number,
  currentV: number
): MovePanelTarget {
  const step = SOLAR_CONFIG.panel.stepAngle;
  const { minAngle, maxAngle } = SOLAR_CONFIG.panel;
  let h = currentH;
  let v = currentV;
  if (direction === "LEFT")  h = Math.max(minAngle, h - step);
  if (direction === "RIGHT") h = Math.min(maxAngle, h + step);
  if (direction === "UP")    v = Math.min(maxAngle, v + step);
  if (direction === "DOWN")  v = Math.max(minAngle, v - step);
  return { h_angle: h, v_angle: v };
}

export function getCommandLabel(commandType: CommandType): string {
  switch (commandType) {
    case "SET_MODE":       return "Set Mode";
    case "MOVE_PANEL":     return "Move Panel";
    case "RESET_POSITION": return "Reset Position";
    case "REQUEST_STATUS": return "Request Status";
    case "START_TRACKING": return "Start Tracking";
    case "STOP_TRACKING":  return "Stop Tracking";
  }
}

const HOME_ANGLE = 90;

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatCommandLabel(cmd: DeviceCommand, previousCmd?: DeviceCommand): string {
  const base = getCommandLabel(cmd.command_type);
  const payload = cmd.payload ?? {};

  if (cmd.command_type === "MOVE_PANEL") {
    const h = toNumber(payload.h_angle);
    const v = toNumber(payload.v_angle);
    if (h === null || v === null) return base;

    const prevPayload = previousCmd?.command_type === "MOVE_PANEL" ? previousCmd.payload ?? {} : null;
    const prevH = (prevPayload && toNumber(prevPayload.h_angle)) ?? HOME_ANGLE;
    const prevV = (prevPayload && toNumber(prevPayload.v_angle)) ?? HOME_ANGLE;

    const dh = h - prevH;
    const dv = v - prevV;
    const parts: string[] = [];
    if (dv > 0) parts.push("Up");
    if (dv < 0) parts.push("Down");
    if (dh > 0) parts.push("Right");
    if (dh < 0) parts.push("Left");
    const direction = parts.length > 0 ? parts.join(" + ") : "Hold";

    return `${base} → ${direction} (H:${h}° V:${v}°)`;
  }

  if (cmd.command_type === "SET_MODE") {
    const mode = payload.mode;
    if (typeof mode === "string" && mode.length > 0) {
      return `${base} → ${mode}`;
    }
    return base;
  }

  return base;
}
