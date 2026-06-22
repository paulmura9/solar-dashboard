export const MILLI_PER_UNIT = 1000;

export function siToMilli(value: number): number {
  return value * MILLI_PER_UNIT;
}

export function formatVoltage(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(2)} V`;
}

export function formatCurrentMa(amperes: number | null): string {
  if (amperes == null) return "—";
  return `${siToMilli(amperes).toFixed(1)} mA`;
}

export function formatEnergy(wh: number | null | undefined): string {
  if (wh == null || wh === 0) return "0 mWh";
  if (wh >= 1) return `${wh.toFixed(2)} Wh`;
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

export function formatWh(wh: number | null | undefined): string {
  if (wh == null) return "—";
  return `${wh.toFixed(2)} Wh`;
}
