// Telemetry currents/powers are stored in SI base units (A, W). The dashboard
// presents the small panel values in milli-units; the ×1000 happens only at the
// presentation boundary, never to the stored data.
export const MILLI_PER_UNIT = 1000;

// SI base unit (A or W) → milli-unit (mA or mW). Single source of the
// presentation conversion, shared by the formatters and the card's hero ticker.
export function siToMilli(value: number): number {
  return value * MILLI_PER_UNIT;
}

export function formatVoltage(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(2)} V`;
}

// Accepts current in Amperes (SI, as stored) and renders it in milliamps.
export function formatCurrentMa(amperes: number | null): string {
  if (amperes == null) return "—";
  return `${siToMilli(amperes).toFixed(1)} mA`;
}

export function formatEnergy(wh: number | null): string {
  if (wh == null) return "—";
  return `${wh.toFixed(1)} Wh`;
}

export function formatAngle(deg: number | null): string {
  if (deg == null) return "—";
  return `${deg.toFixed(1)}°`;
}

export function formatPower(w: number | null | undefined): string {
  if (w === null || w === undefined) return "—";
  return `${w.toFixed(1)} W`;
}
