import { useEffect, useRef, useState } from "react";

/** Holds a live value steady against transient spikes while staying responsive.
 *  Normal changes (up to `bigJump` of the current value, with an absolute `floor`)
 *  are adopted with no extra latency — tiny ones get light EMA smoothing, the rest
 *  pass straight through. A very large jump (> `bigJump`) is treated as a likely
 *  single-sample spike and is NOT shown until it repeats for `persist` consecutive
 *  frames. Keeps the last value when input is null. */
export function useStableValue(
  value: number | null,
  { jump = 0.05, floor = 0.5, persist = 3, alpha = 0.3, bigJump = 0.4 }:
    { jump?: number; floor?: number; persist?: number; alpha?: number; bigJump?: number } = {}
): number | null {
  const [shown, setShown] = useState<number | null>(value);
  const cand = useRef<{ v: number; n: number } | null>(null);

  useEffect(() => {
    if (value == null) return;
    setShown((cur) => {
      if (cur == null) return value;
      const delta = Math.abs(value - cur);
      const bigLimit = Math.max(floor, Math.abs(cur) * bigJump);

      if (delta > bigLimit) {
        if (cand.current && Math.abs(value - cand.current.v) <= bigLimit) {
          if (++cand.current.n >= persist) { cand.current = null; return value; }
        } else {
          cand.current = { v: value, n: 1 };
        }
        return cur;
      }

      cand.current = null;
      const smoothLimit = Math.max(floor, Math.abs(cur) * jump);
      return delta <= smoothLimit ? cur + alpha * (value - cur) : value;
    });
  }, [value, jump, floor, persist, alpha, bigJump]);

  return shown;
}
