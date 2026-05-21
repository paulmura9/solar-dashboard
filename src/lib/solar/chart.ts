export function downsample<T>(arr: readonly T[], maxPoints: number): T[] {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  if (arr.length <= maxPoints) return arr.slice();
  const step = Math.floor(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}
