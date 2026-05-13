import type { FC } from "react";
import { AlertTriangle } from "lucide-react";

interface StaleDataBannerProps {
  isStale: boolean;
  secondsSinceLastReading: number | null;
}

function formatAge(seconds: number): string {
  if (seconds >= 86_400) return `${Math.round(seconds / 3_600)} hours`;
  if (seconds >= 3_600) return `${Math.round(seconds / 60)} minutes`;
  return `${seconds} seconds`;
}

const StaleDataBanner: FC<StaleDataBannerProps> = ({ isStale, secondsSinceLastReading }) => {
  if (!isStale) return null;

  const age =
    secondsSinceLastReading != null ? formatAge(secondsSinceLastReading) : "an unknown amount of time";

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2"
    >
      <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
      <span>
        Telemetry is stale, last reading received {age} ago. Gateway may be offline.
      </span>
    </div>
  );
};

export default StaleDataBanner;
