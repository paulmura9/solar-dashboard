"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLatestVision } from "@/hooks/api/useLatestVision";
import { useVisionHistory } from "@/hooks/api/useVisionHistory";
import { getSignedImageUrl } from "@/lib/api";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import { dirtColor } from "@/lib/solar/status";
import { formatPower } from "@/lib/solar/energy";
import { DirtDetectionSkeleton } from "@/components/skeletons/DirtDetectionSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";

function dirtIcon(pct: number, cleaning: boolean) {
  if (pct > 35 || cleaning) return <AlertTriangle size={18} className="text-red-500" />;
  if (pct > 20) return <AlertTriangle size={18} className="text-amber-500" />;
  return <CheckCircle size={18} className="text-green-500" />;
}

function fmt(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return value.toFixed(decimals);
}

function computeEnergyImpact(dirtPct: number): {
  powerLostW: number;
  energyLostTodayWh: number;
  energyLostWeekWh: number;
  lossFactor: number;
} {
  const lossFactor = Math.min(
    (dirtPct / 100) * SOLAR_CONFIG.panel.maxLossFactor,
    SOLAR_CONFIG.panel.maxLossFactor
  );
  const powerLostW = SOLAR_CONFIG.panel.peakPowerW * lossFactor;
  const energyLostTodayWh = powerLostW * SOLAR_CONFIG.panel.daylightHoursDefault;
  const energyLostWeekWh = energyLostTodayWh * 7;
  return { powerLostW, energyLostTodayWh, energyLostWeekWh, lossFactor };
}

function ImageWithSkeleton({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-100">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200 rounded-lg" />}
      {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, next/image would require remotePatterns config */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

export default function DirtDetectionPage() {
  const { data: latest, isInitialLoad: latestInitial } = useLatestVision();
  const { data: rawHistory, isInitialLoad: historyInitial } = useVisionHistory();
  const history = useMemo(
    () => (rawHistory.length > 0 ? [...rawHistory].reverse() : rawHistory),
    [rawHistory]
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [imgUrl, procUrl] = await Promise.all([
        latest?.image_path ? getSignedImageUrl(latest.image_path) : Promise.resolve(null),
        latest?.processed_image_path ? getSignedImageUrl(latest.processed_image_path) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setImageUrl(imgUrl);
      setProcessedImageUrl(procUrl);
    })();
    return () => { cancelled = true; };
  }, [latest?.image_path, latest?.processed_image_path]);

  if (latestInitial && historyInitial) return <DirtDetectionSkeleton />;

  const energyImpact = latest ? computeEnergyImpact(latest.dirt_level_percent ?? 0) : null;

  return (
    <ErrorBoundary>
      <div className="space-y-5">
        <Card className="border border-[#e2e8f0] ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
              {latest && latest.dirt_level_percent != null && dirtIcon(latest.dirt_level_percent, latest.cleaning_required)}
              Dirt Detection — Latest Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!latest ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-slate-400">No dirt detection results yet</span>
                <span className="text-slate-300 text-sm">Results will appear after the camera pipeline runs</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-5xl font-bold tabular-nums"
                      style={{ color: latest.dirt_level_percent != null ? dirtColor(latest.dirt_level_percent) : "#94a3b8" }}
                    >
                      {latest.dirt_level_percent != null ? latest.dirt_level_percent.toFixed(1) : "—"}
                    </span>
                    <span className="text-lg text-[#94a3b8]">%</span>
                    <span className="text-sm text-[#64748b] ml-1">dirt level</span>
                  </div>
                  <div className="mt-3 h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${latest.dirt_level_percent ?? 0}%`,
                        background: latest.dirt_level_percent != null ? dirtColor(latest.dirt_level_percent) : "#94a3b8",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
                  <div>
                    <p className="text-[#94a3b8] mb-0.5">Cleanliness</p>
                    <p className="font-semibold text-[#1e293b]">{fmt(latest.cleanliness_percent)} %</p>
                  </div>
                  <div>
                    <p className="text-[#94a3b8] mb-0.5">Confidence</p>
                    <p className="font-semibold text-[#1e293b]">
                      {latest.confidence != null ? (latest.confidence * 100).toFixed(1) : "—"} %
                    </p>
                  </div>
                  <div>
                    <p className="text-[#94a3b8] mb-0.5">Cleaning required</p>
                    <span className={`font-semibold ${latest.cleaning_required ? "text-red-600" : "text-green-600"}`}>
                      {latest.cleaning_required ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#94a3b8] mb-0.5">Last analysis</p>
                    <p className="font-semibold text-[#1e293b]" suppressHydrationWarning>
                      {new Date(latest.timestamp).toLocaleString("ro-RO", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {energyImpact && (
                  <div className="border-t border-[#e2e8f0] pt-4">
                    <div className="bg-[#f8fafc] rounded-lg border border-[#e8edf5] p-4 space-y-3">
                      <p className="text-xs font-semibold text-[#1e293b]">Estimated Energy Impact</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748b]">Estimated power reduction</span>
                          <span className="font-mono font-medium text-[#1e293b]">{formatPower(energyImpact.powerLostW)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748b]">Estimated energy lost today</span>
                          <span className="font-mono font-medium text-[#1e293b]">{energyImpact.energyLostTodayWh.toFixed(1)} Wh</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-[#e8edf5]">
                          <span className="text-[#64748b]">Estimated energy lost this week</span>
                          <span className="font-mono font-medium text-[#1e293b]">{energyImpact.energyLostWeekWh.toFixed(1)} Wh</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#64748b] leading-relaxed border-t border-[#e8edf5] pt-2.5">
                        At {latest.dirt_level_percent != null ? latest.dirt_level_percent.toFixed(1) : "—"}% dirt coverage, the panel surface
                        transmittance is reduced by an estimated {(energyImpact.lossFactor * 100).toFixed(1)}%,
                        resulting in approximately {formatPower(energyImpact.powerLostW)} of lost output.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-[#e2e8f0] ring-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[#1e293b]">Last Captured Image</CardTitle>
            </CardHeader>
            <CardContent>
              {imageUrl ? (
                <ImageWithSkeleton key={imageUrl} src={imageUrl} alt="Panel surface capture" />
              ) : (
                <div className="w-full h-48 rounded-lg bg-slate-100 flex flex-col items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm">No image available</span>
                  <span className="text-slate-300 text-xs">Camera pipeline has not run yet</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-[#e2e8f0] ring-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[#1e293b]">Processed Mask</CardTitle>
            </CardHeader>
            <CardContent>
              {processedImageUrl ? (
                <ImageWithSkeleton key={processedImageUrl} src={processedImageUrl} alt="Dirt detection mask" />
              ) : (
                <div className="w-full h-48 rounded-lg bg-slate-100 flex flex-col items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm">No processed image</span>
                  <span className="text-slate-300 text-xs">Analysis has not completed yet</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-[#e2e8f0] ring-0">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1e293b]">Detection History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No history available yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#e2e8f0]">
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Dirt Level</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Cleanliness</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Cleaning</TableHead>
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((v) => (
                    <TableRow key={v.id} className="border-[#e2e8f0] text-xs">
                      <TableCell className="text-[#64748b] tabular-nums" suppressHydrationWarning>
                        {new Date(v.timestamp).toLocaleString("ro-RO", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-semibold" style={{ color: v.dirt_level_percent != null ? dirtColor(v.dirt_level_percent) : "#94a3b8" }}>
                        {v.dirt_level_percent != null ? v.dirt_level_percent.toFixed(1) : "—"} %
                      </TableCell>
                      <TableCell className="text-[#1e293b]">{fmt(v.cleanliness_percent)} %</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={
                            v.cleaning_required
                              ? { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }
                              : { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }
                          }
                        >
                          {v.cleaning_required ? "Required" : "Clean"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#64748b]">
                        {v.confidence != null ? (v.confidence * 100).toFixed(1) + " %" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
