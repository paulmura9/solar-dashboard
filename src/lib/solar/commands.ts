import { SOLAR_CONFIG } from "@/config/solarConfig";
import type { CommandType, CommandDirection } from "@/lib/types";

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
