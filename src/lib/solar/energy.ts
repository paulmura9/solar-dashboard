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

// Daily energy spans several orders of magnitude on this small panel, so a fixed
// "X.X Wh" hides sub-0.05 Wh values as a misleading "0.0". Switch to milliwatt-hours
// below 1 Wh so tiny-but-real production stays visible. The stored value is always Wh.
export function formatEnergy(wh: number | null | undefined): string {
  if (wh == null || wh === 0) return "0 mWh";
  if (wh >= 1) return `${wh.toFixed(2)} Wh`;
  // Below 1 Wh: present as mWh, up to 1 decimal, dropping a trailing ".0".
  const mwh = parseFloat((wh * MILLI_PER_UNIT).toFixed(1));
  return `${mwh} mWh`;
}

export function formatAngle(deg: number | null): string {
  if (deg == null) return "—";
  return `${deg.toFixed(1)}°`;
}

export function formatPower(w: number | null | undefined): string {
  if (w === null || w === undefined) return "—";
  return `${w.toFixed(1)} W`;
}
