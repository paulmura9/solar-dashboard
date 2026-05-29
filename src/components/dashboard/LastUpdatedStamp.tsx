import type { FC } from "react";

interface LastUpdatedStampProps {
  secondsAgo: number | null;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3_600)}h ago`;
  return `${Math.round(seconds / 86_400)}d ago`;
}

const LastUpdatedStamp: FC<LastUpdatedStampProps> = ({ secondsAgo }) => (
  <p className="text-[10px] text-[#94a3b8] tabular-nums" suppressHydrationWarning>
    Last updated {secondsAgo != null ? formatAge(secondsAgo) : "—"}
  </p>
);

export default LastUpdatedStamp;
