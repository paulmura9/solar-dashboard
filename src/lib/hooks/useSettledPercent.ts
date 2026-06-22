import { useState } from "react";
import type { BatteryStatus } from "@/lib/types";

/** Settles an estimated battery percentage for display. The raw SoC is derived
 *  from voltage, which sags and recovers with load (servo peaks), so the number
 *  jitters frame-to-frame even when the real charge is steady. This hook only
 *  moves the displayed value when a deviation is *sustained*:
 *
 *  - HYSTERESIS: deviations within `holdBand` of the displayed value are noise
 *    and never move the number.
 *  - CONFIRM: a deviation beyond the band must persist for `settleFrames`
 *    consecutive samples (same direction) before it is adopted; a value that
 *    snaps back before confirming is discarded as transient.
 *  - MONOTONIC BY STATE: while DISCHARGING the displayed value can only fall or
 *    hold (a transient voltage recovery never pushes it up); while CHARGING it
 *    can only rise or hold; otherwise both directions are allowed (still banded).
 *  - LIVE DRIFT: once a new level is confirmed the number ramps toward it by at
 *    most `driftStep` per sample — smooth, never a jump, never frozen.
 *
 *  `sampleKey` (the reading id) gates the state machine to genuine new samples,
 *  so the drift advances exactly once per reading regardless of unrelated
 *  re-renders and even when two consecutive readings share the same value. */
interface SettleOptions {
  holdBand?: number;
  settleFrames?: number;
  driftStep?: number;
}

interface SettleState {
  shown: number;
  target: number;
  key: number | string | null;
  dir: -1 | 0 | 1;
  count: number;
}

function advance(
  s: SettleState,
  value: number,
  status: BatteryStatus | null,
  key: number | string | null,
  { holdBand, settleFrames, driftStep }: Required<SettleOptions>
): SettleState {
  let { shown, target, dir, count } = s;
  const diff = value - shown;
  const sampleDir = (Math.sign(diff) || 0) as -1 | 0 | 1;
  const outside = Math.abs(diff) > holdBand;
  const allowUp = status !== "DISCHARGING";
  const allowDown = status !== "CHARGING";
  const directionAllowed = (sampleDir > 0 && allowUp) || (sampleDir < 0 && allowDown);

  if (!outside) {
    // Inside the hysteresis band — a genuine settle, drop any pending candidate.
    dir = 0;
    count = 0;
  } else if (!directionAllowed) {
    // Moves against the known battery state (e.g. a recovery blip while
    // discharging): ignore it, but keep the existing candidate intact.
  } else if (sampleDir === dir) {
    count += 1;
  } else {
    dir = sampleDir;
    count = 1;
  }

  if (count >= settleFrames) {
    target = value;
    dir = 0;
    count = 0;
  }

  const gap = target - shown;
  shown = Math.abs(gap) <= driftStep ? target : shown + Math.sign(gap) * driftStep;

  return { shown, target, key, dir, count };
}

export function useSettledPercent(
  value: number | null,
  status: BatteryStatus | null,
  sampleKey: number | string | null,
  { holdBand = 2.5, settleFrames = 4, driftStep = 1 }: SettleOptions = {}
): number | null {
  const [state, setState] = useState<SettleState | null>(null);

  if (value == null) return state?.shown ?? null;

  if (state == null) {
    const init: SettleState = { shown: value, target: value, key: sampleKey, dir: 0, count: 0 };
    setState(init);
    return init.shown;
  }

  // Only step the machine on a genuinely new reading. Adjusting state during
  // render (React's pattern for previous-render info) re-renders immediately;
  // the next pass sees the stored key and short-circuits, so it cannot loop.
  if (sampleKey === state.key) return state.shown;

  const next = advance(state, value, status, sampleKey, { holdBand, settleFrames, driftStep });
  setState(next);
  return next.shown;
}
