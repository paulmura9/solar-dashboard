export const MILLI_PER_UNIT = 1000;

function siToMilli(value: number): number {
  return value * MILLI_PER_UNIT;
}

export function formatVoltage(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(2)} V`;
}

export function formatAngle(deg: number | null): string {
  if (deg == null) return "—";
  return `${deg.toFixed(1)}°`;
}

/** Base SI units we auto-scale against their milli- counterparts. */
export type BaseUnit = "W" | "A" | "Wh";

export interface ScaledMetric {
  /** Numeric value already expressed in `unit`. */
  value: number;
  /** Display unit, either the milli- unit ("mW") or the base unit ("W"). */
  unit: string;
  /** Decimal places to render: 1 in milli, 2 in base. */
  decimals: number;
  /** Ready-to-render "value unit" string. */
  text: string;
}

// Promote milli -> base at/above 1000; demote base -> milli only below 950.
// The gap is the hysteresis band that stops the unit flickering around 1000.
const SCALE_UP_MILLI = 1000;
const SCALE_DOWN_MILLI = 950;
const MILLI_DECIMALS = 1;
const BASE_DECIMALS = 2;

/** Auto-scale a base SI value (W/A/Wh) to the most readable unit.
 *  Pass the previously chosen `unit` to apply hysteresis at the 1000-milli
 *  boundary; omit it for a stateless choice with a hard threshold at 1000. */
export function scaleMetric(base: number, baseUnit: BaseUnit, prevUnit?: string): ScaledMetric {
  const milliUnit = `m${baseUnit}`;
  const milli = siToMilli(base);
  const magnitude = Math.abs(milli);

  let useBase: boolean;
  if (prevUnit === baseUnit) {
    useBase = magnitude >= SCALE_DOWN_MILLI;
  } else if (prevUnit === milliUnit) {
    useBase = magnitude >= SCALE_UP_MILLI;
  } else {
    useBase = magnitude >= SCALE_UP_MILLI;
  }

  const unit = useBase ? baseUnit : milliUnit;
  const decimals = useBase ? BASE_DECIMALS : MILLI_DECIMALS;
  const value = useBase ? base : milli;
  return { value, unit, decimals, text: `${value.toFixed(decimals)} ${unit}` };
}

export function formatPower(w: number | null | undefined): string {
  if (w === null || w === undefined) return "—";
  return scaleMetric(w, "W").text;
}
