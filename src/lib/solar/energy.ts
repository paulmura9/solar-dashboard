export function formatVoltage(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(2)} V`;
}

export function formatCurrentMa(ma: number | null): string {
  if (ma == null) return "—";
  return `${ma.toFixed(1)} mA`;
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
