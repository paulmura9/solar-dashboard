"use client";

import { useState, useMemo } from "react";
import { useReadingsHistory } from "@/hooks/api/useReadingsHistory";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { AnalyticsSkeleton } from "@/components/skeletons/AnalyticsSkeleton";
import { transformAnalyticsCharts } from "@/lib/charts/transformReadings";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import ErrorBoundary from "@/components/ErrorBoundary";

const RANGES = [
  { label: "6h",     hours: 6   },
  { label: "12h",    hours: 12  },
  { label: "24h",    hours: 24  },
  { label: "3 days", hours: 72  },
  { label: "7 days", hours: 168 },
] as const;

export default function AnalyticsPage() {
  const [hours, setHours] = useState<number>(24);
  const { data: readings, isInitialLoad } = useReadingsHistory({ hours });

  const series = useMemo(
    () => transformAnalyticsCharts(readings, SOLAR_CONFIG.chart.downsampleAnalytics, hours),
    [readings, hours]
  );

  return (
    <ErrorBoundary>
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#64748b] mr-1">Time range:</span>
          {RANGES.map(({ label, hours: h }) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
                hours === h
                  ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                  : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#3b82f6] hover:text-[#3b82f6]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isInitialLoad ? <AnalyticsSkeleton /> : <AnalyticsCharts series={series} hours={hours} />}
      </div>
    </ErrorBoundary>
  );
}
