"use client";

import { useWSConnectionStatus } from "@/hooks/useWSConnectionStatus";

export default function ConnectionStatusBadge() {
  const isConnected = useWSConnectionStatus();

  return (
    <div
      className="flex items-center gap-1.5 text-xs select-none"
      aria-live="polite"
      title={isConnected ? "Live updates connected" : "Reconnecting to live updates"}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isConnected
            ? "bg-green-500 status-dot-online"
            : "bg-amber-500 animate-pulse"
        }`}
      />
      <span className={isConnected ? "text-green-600" : "text-amber-600"}>
        {isConnected ? "Live" : "Reconnecting…"}
      </span>
    </div>
  );
}
