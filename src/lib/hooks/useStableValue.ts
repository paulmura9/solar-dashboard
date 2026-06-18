import { useEffect, useRef, useState } from "react";

/** Holds a live value steady against transient spikes. A jump larger than `jump`
 *  (fraction of the current value, with an absolute `floor`) is NOT shown until it
 *  persists for `persist` frames; small changes pass through with light smoothing.
 *  Keeps the last value when input is null. */
export function useStableValue(
  value: number | null,
  { jump = 0.05, floor = 0.5, persist = 3, alpha = 0.3 }:
    { jump?: number; floor?: number; persist?: number; alpha?: number } = {}
): number | null {
  const [shown, setShown] = useState<number | null>(value);
  const cand = useRef<{ v: number; n: number } | null>(null);

  useEffect(() => {
    if (value == null) return;
    setShown((cur) => {
      if (cur == null) return value;
      const limit = Math.max(floor, Math.abs(cur) * jump);
      if (Math.abs(value - cur) <= limit) {
        cand.current = null;
        return cur + alpha * (value - cur);          // small change: smooth
      }
      if (cand.current && Math.abs(value - cand.current.v) <= limit) {
        if (++cand.current.n >= persist) { cand.current = null; return value; } // confirmed
      } else {
        cand.current = { v: value, n: 1 };
      }
      return cur;                                     // big jump: hold until it persists
    });
  }, [value, jump, floor, persist, alpha]);

  return shown;
}
