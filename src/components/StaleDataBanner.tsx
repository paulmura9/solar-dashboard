import type { FC } from "react";
import { AlertTriangle } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface StaleDataBannerProps {
  isStale: boolean;
  secondsSinceLastReading: number | null;
  esp32Online?: boolean | null;
  gatewayOnline?: boolean | null;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  return formatDuration(Math.floor(seconds / 60));
}

const StaleDataBanner: FC<StaleDataBannerProps> = ({
  isStale,
  secondsSinceLastReading,
  esp32Online = null,
  gatewayOnline = null,
}) => {
  if (!isStale) return null;

  const age =
    secondsSinceLastReading != null ? formatAge(secondsSinceLastReading) : "an unknown amount of time";

  // The gateway (Pi) is what relays ESP32 telemetry. If we can see that the ESP32 is
  // offline while the gateway is still online, name the ESP32 instead of blaming the gateway.
  const cause =
    esp32Online === false && gatewayOnline === true
      ? "No telemetry from ESP32."
      : "Gateway may be offline.";

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2"
    >
      <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
      <span>
        Telemetry is stale, last reading received {age} ago. {cause}
      </span>
    </div>
  );
};

export default StaleDataBanner;
