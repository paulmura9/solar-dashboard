import type { CSSProperties } from "react";

export const STATUS_BADGE_OK: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  borderColor: "#bbf7d0",
};

export const STATUS_BADGE_ERROR: CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  borderColor: "#fca5a5",
};

// Amber sibling of STATUS_BADGE_OK/ERROR for intermediate severity.
export const STATUS_BADGE_WARNING: CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  borderColor: "#fde68a",
};

// Maps the vision model's predicted_class to a labelled, colour-coded badge style
// (green / amber / red). Shared so the Dirt Detection card and the Tracking Status
// summary render the identical badge from the same field, never recomputed from the score.
export const PREDICTED_CLASS_BADGE: Record<
  "clean" | "slightly_dirty" | "dirty",
  { label: string; style: CSSProperties }
> = {
  clean:          { label: "Clean",          style: STATUS_BADGE_OK },
  slightly_dirty: { label: "Slightly Dirty", style: STATUS_BADGE_WARNING },
  dirty:          { label: "Dirty",          style: STATUS_BADGE_ERROR },
};
