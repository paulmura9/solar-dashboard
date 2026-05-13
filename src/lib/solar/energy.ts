function isNullOrZero(value: number | null | undefined): boolean {
  return value == null || value === 0;
}

export function formatVoltage(v: number | null): string {
  if (isNullOrZero(v)) return "—";
  return `${v!.toFixed(2)} V`;
}

export function formatCurrent(a: number | null): string {
  if (isNullOrZero(a)) return "—";
  return `${a!.toFixed(3)} A`;
}

export function formatEnergy(wh: number | null): string {
  if (isNullOrZero(wh)) return "—";
  return `${wh!.toFixed(1)} Wh`;
}

export function formatAngle(deg: number | null): string {
  if (deg == null) return "—";
  return `${deg.toFixed(1)}°`;
}

export function formatPower(w: number | null | undefined): string {
  if (w === null || w === undefined) return "—";
  return `${w.toFixed(1)} W`;
}
