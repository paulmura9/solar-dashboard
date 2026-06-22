import { useEffect, useRef, useState } from "react";

const DEFAULT_STALE_FRAMES = 2;

/** Reports whether a single telemetry field is still arriving fresh from the
 *  device. The WS cache bridge carries the previous value forward when a field
 *  is missing from an incoming frame (see wsCacheBridge.mergeReading), so a field
 *  the firmware stopped sending shows up as the *same* value repeating across new
 *  frames. We detect that and flag it stale, letting the UI mark a frozen reading
 *  as "last known" instead of presenting it as a live number.
 *
 *  `frameKey` must change once per incoming reading (use the reading timestamp).
 *  A field is considered stale once its value has been carried over `staleAfterFrames`
 *  consecutive frames; null values are not stale (handled by the caller's "—" path). */
export function useFieldFreshness(
  frameKey: string | number | null,
  value: number | null | undefined,
  staleAfterFrames: number = DEFAULT_STALE_FRAMES
): boolean {
  const last = useRef<{ key: string | number | null; value: number | null }>({
    key: null,
    value: null,
  });
  const carriedFrames = useRef<number>(0);
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    if (frameKey === last.current.key) return;

    const next = value ?? null;
    if (next == null || next !== last.current.value) {
      carriedFrames.current = 0;
      setIsStale(false);
    } else {
      carriedFrames.current += 1;
      if (carriedFrames.current >= staleAfterFrames) setIsStale(true);
    }

    last.current = { key: frameKey, value: next };
  }, [frameKey, value, staleAfterFrames]);

  return isStale;
}
