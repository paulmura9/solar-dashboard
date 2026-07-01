"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle, CheckCircle2, AlertTriangle, Camera, LoaderCircle, WifiOff, AlertCircle, Maximize2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLatestVision } from "@/hooks/api/useLatestVision";
import { useVisionHistory } from "@/hooks/api/useVisionHistory";
import { useLatestCapture } from "@/hooks/api/useLatestCapture";
import { useDevices } from "@/hooks/api/useDevices";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { useApiToken } from "@/hooks/useApiToken";
import { getSignedImageUrl } from "@/lib/api";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import { dirtColor } from "@/lib/solar/status";
import { formatPower } from "@/lib/solar/energy";
import { DirtDetectionSkeleton } from "@/components/skeletons/DirtDetectionSkeleton";
import { STATUS_BADGE_OK, STATUS_BADGE_ERROR, STATUS_BADGE_WARNING, PREDICTED_CLASS_BADGE } from "@/lib/ui/statusBadgeStyle";
import ErrorBoundary from "@/components/ErrorBoundary";

const SEVERITY_COLOR: Record<"clean" | "slightly_dirty" | "dirty", { text: string; bar: string }> = {
  clean:          { text: "#22c55e", bar: "#22c55e" },
  slightly_dirty: { text: STATUS_BADGE_WARNING.color as string, bar: "#f59e0b" },
  dirty:          { text: "#ef4444", bar: "#ef4444" },
};

function dirtIcon(pct: number, cleaning: boolean) {
  if (pct > 35 || cleaning) return <AlertTriangle size={18} className="text-red-500" />;
  if (pct > 20) return <AlertTriangle size={18} className="text-amber-500" />;
  return <CheckCircle size={18} className="text-green-500" />;
}

function fmt(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return value.toFixed(decimals);
}

const QUALITY_REASON_LABEL: Record<string, string> = {
  too_dark: "Image too dark",
  too_bright: "Image too bright",
  not_panel: "Panel not in view",
  low_detail: "Camera may be covered",
};

function qualityReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return QUALITY_REASON_LABEL[reason] ?? null;
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

function ImageLightbox({
  src,
  open,
  onOpenChange,
}: {
  src: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          aria-label="Captured image, full screen"
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
          onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
        >
          <Dialog.Title className="sr-only">Captured panel image (full screen)</Dialog.Title>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, next/image would require remotePatterns config */}
          <img
            src={src}
            alt="Panel surface capture, full screen"
            className="max-h-[90vh] max-w-[90vw] h-auto w-auto object-contain rounded-lg shadow-2xl"
          />
          <Dialog.Close
            aria-label="Close full screen"
            className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white outline-none transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function DirtDetectionPage() {
  const { data: latest, isInitialLoad: latestInitial } = useLatestVision();
  const { data: rawHistory, isInitialLoad: historyInitial } = useVisionHistory();
  const history = useMemo(
    () =>
      [...rawHistory].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [rawHistory]
  );

  const token = useApiToken();
  const { data: latestCapture } = useLatestCapture();
  const { data: devices, isInitialLoad: devicesInitial } = useDevices();
  const { phase, error: captureError, capturedRow, capture } = useCameraCapture(token);

  const piOnline = devices.some((d) => d.device_name === "RASPBERRY_PI" && d.is_online);
  const capturing = phase === "capturing";
  const captureDisabled = !token || !piOnline || capturing || phase === "cooldown";

  const [latestCaptureUrl, setLatestCaptureUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [surfaceLightboxOpen, setSurfaceLightboxOpen] = useState(false);
  const [showCaptured, setShowCaptured] = useState(false);
  const [flashImage, setFlashImage] = useState(false);

  const displayCapture = capturedRow ?? latestCapture;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = displayCapture?.image_path ? await getSignedImageUrl(displayCapture.image_path) : null;
      if (!cancelled) setLatestCaptureUrl(url);
    })();
    return () => { cancelled = true; };
  }, [displayCapture?.image_path]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = latest?.processed_image_path ? await getSignedImageUrl(latest.processed_image_path) : null;
      if (!cancelled) setProcessedImageUrl(url);
    })();
    return () => { cancelled = true; };
  }, [latest?.processed_image_path]);

  useEffect(() => {
    if (!capturedRow) return;
    const reveal = setTimeout(() => { setShowCaptured(true); setFlashImage(true); }, 0);
    const hideToast = setTimeout(() => setShowCaptured(false), 2500);
    const hideFlash = setTimeout(() => setFlashImage(false), 1000);
    return () => {
      clearTimeout(reveal);
      clearTimeout(hideToast);
      clearTimeout(hideFlash);
    };
  }, [capturedRow]);

  const captureConfirmed = showCaptured && phase !== "capturing";
  const flashActive = flashImage && phase !== "capturing";

  if (latestInitial && historyInitial) return <DirtDetectionSkeleton />;

  const qualityFailed = latest != null && latest.quality_ok === false;
  const qualityReasonText = qualityReasonLabel(latest?.quality_reason);

  const needsCleaning =
    latest != null &&
    !qualityFailed &&
    (latest.predicted_class === "dirty" || latest.cleaning_required === true);

  const energyImpact = latest && !qualityFailed ? computeEnergyImpact(latest.dirt_level_percent ?? 0) : null;

  const severityColor = !qualityFailed && latest?.predicted_class ? SEVERITY_COLOR[latest.predicted_class] : null;

  return (
    <ErrorBoundary>
      <div className="space-y-5">
        {needsCleaning && (
          <div className="flex items-start gap-3 rounded-lg border border-[#fca5a5] bg-[#fef2f2] p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#ef4444]" />
            <div className="space-y-0.5">
              <p className="text-base font-semibold text-[#991b1b]">Panel needs cleaning</p>
              <p className="text-xs text-[#b91c1c]">
                Estimated soiling score: {latest.dirt_level_percent != null ? latest.dirt_level_percent.toFixed(1) : "—"} %
              </p>
            </div>
          </div>
        )}
        <Card className="border border-[#e2e8f0] ring-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
              {latest && latest.dirt_level_percent != null && dirtIcon(latest.dirt_level_percent, latest.cleaning_required)}
              Dirt Detection — Latest Analysis
            </CardTitle>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="border-[#e2e8f0] hover:border-[#3b82f6] hover:text-[#3b82f6]"
                disabled={captureDisabled}
                onClick={() => void capture()}
              >
                {capturing ? <LoaderCircle className="animate-spin" /> : <Camera />}
                {capturing ? "Capturing..." : "Capture Image"}
              </Button>
              <div aria-live="polite" aria-atomic="true">
                {captureConfirmed ? (
                  <span className="text-[11px] text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={11} className="shrink-0" /> Captured
                  </span>
                ) : !devicesInitial && !piOnline ? (
                  <span className="text-[11px] text-[#94a3b8] flex items-center gap-1">
                    <WifiOff size={11} /> Gateway offline
                  </span>
                ) : captureError ? (
                  <span className="text-[11px] text-red-500 flex items-center gap-1 max-w-[220px] text-right">
                    <AlertCircle size={11} className="shrink-0" /> {captureError}
                  </span>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!latest ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-slate-400">No dirt detection results yet</span>
                <span className="text-slate-300 text-sm">Results will appear after the camera pipeline runs</span>
              </div>
            ) : (
              <div className="space-y-4">
                {qualityFailed && (
                  <div className="flex items-start gap-3 rounded-lg border border-[#fdba74] bg-[#fff7ed] p-3.5">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#f97316]" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-[#9a3412]">Camera obstructed — analysis paused</p>
                      {qualityReasonText && (
                        <p className="text-xs text-[#c2410c]">{qualityReasonText}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className={qualityFailed ? "opacity-40" : undefined}>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-5xl font-bold tabular-nums"
                      style={{ color: severityColor?.text ?? "#94a3b8" }}
                    >
                      {!qualityFailed && latest.dirt_level_percent != null ? latest.dirt_level_percent.toFixed(1) : "—"}
                    </span>
                    <span className="text-lg text-[#94a3b8]">%</span>
                    <span className="text-sm text-[#64748b] ml-1">Soiling Score</span>
                    {latest.predicted_class && (
                      <Badge
                        variant="outline"
                        className="ml-2 self-center"
                        style={PREDICTED_CLASS_BADGE[latest.predicted_class].style}
                      >
                        {PREDICTED_CLASS_BADGE[latest.predicted_class].label}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-snug text-[#94a3b8]">
                    Severity estimate from the vision model (0 = clean, 100 = heavily soiled) - not the share of surface covered.
                  </p>
                  <div className="mt-3 h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: qualityFailed ? "0%" : `${latest.dirt_level_percent ?? 0}%`,
                        background: severityColor?.bar ?? "#94a3b8",
                      }}
                    />
                  </div>
                </div>

                <div className={`grid grid-cols-3 gap-4 pt-2 text-xs ${qualityFailed ? "opacity-40" : ""}`}>
                  <div>
                    <p className="text-[#94a3b8] mb-0.5">Confidence</p>
                    <p className="font-semibold text-[#1e293b]">
                      {qualityFailed ? "—" : `${latest.confidence != null ? (latest.confidence * 100).toFixed(1) : "—"} %`}
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
                        At {latest.dirt_level_percent != null ? latest.dirt_level_percent.toFixed(1) : "—"}% soiling score, the panel surface
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
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-[#1e293b]">Last Captured Image</CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="View captured image full screen"
                className="text-[#64748b] hover:text-[#3b82f6]"
                disabled={!latestCaptureUrl}
                onClick={() => setLightboxOpen(true)}
              >
                <Maximize2 />
              </Button>
            </CardHeader>
            <CardContent>
              {latestCaptureUrl ? (
                <div
                  className={`rounded-lg transition-all duration-500 ${flashActive ? "ring-2 ring-green-500 ring-offset-2" : "ring-0 ring-offset-0"}`}
                >
                  <ImageWithSkeleton key={latestCaptureUrl} src={latestCaptureUrl} alt="Panel surface capture" />
                </div>
              ) : (
                <div className="w-full h-48 rounded-lg bg-slate-100 flex flex-col items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm">No image available</span>
                  <span className="text-slate-300 text-xs">Camera pipeline has not run yet</span>
                </div>
              )}
            </CardContent>
          </Card>
          {latestCaptureUrl && (
            <ImageLightbox src={latestCaptureUrl} open={lightboxOpen} onOpenChange={setLightboxOpen} />
          )}

          <Card className="border border-[#e2e8f0] ring-0">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-[#1e293b]">Surface Analysis</CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="View surface analysis full screen"
                className="text-[#64748b] hover:text-[#3b82f6]"
                disabled={!processedImageUrl}
                onClick={() => setSurfaceLightboxOpen(true)}
              >
                <Maximize2 />
              </Button>
            </CardHeader>
            <CardContent>
              {processedImageUrl ? (
                <ImageWithSkeleton key={processedImageUrl} src={processedImageUrl} alt="Surface analysis" />
              ) : (
                <div className="w-full h-48 rounded-lg bg-slate-100 flex flex-col items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm">No surface analysis yet</span>
                  <span className="text-slate-300 text-xs">Analysis has not completed yet</span>
                </div>
              )}
            </CardContent>
          </Card>
          {processedImageUrl && (
            <ImageLightbox src={processedImageUrl} open={surfaceLightboxOpen} onOpenChange={setSurfaceLightboxOpen} />
          )}
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
                    <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Soiling Score</TableHead>
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
                          style={v.cleaning_required ? STATUS_BADGE_ERROR : STATUS_BADGE_OK}
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
