"use client";

import { Video, Camera, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShimmerButton } from "@/components/magic/ShimmerButton";
import { useDevices } from "@/hooks/api/useDevices";
import { LiveSkeleton } from "@/components/skeletons/LiveSkeleton";
import { SOLAR_CONFIG } from "@/config/solarConfig";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function LiveCameraPage() {
  const { data: devices, isInitialLoad } = useDevices();

  if (isInitialLoad) return <LiveSkeleton />;

  const camera = devices.find((d) => d.device_name === "CAMERA");
  const pi = devices.find((d) => d.device_name === "RASPBERRY_PI");
  const cameraOnline = camera?.is_online ?? false;
  const piOnline = pi?.is_online ?? false;

  return (
    <ErrorBoundary>
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <Camera size={14} className="text-[#64748b]" />
            <span className="text-[#64748b]">Camera:</span>
            <Badge
              variant="outline"
              style={
                cameraOnline
                  ? { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }
                  : { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }
              }
            >
              {cameraOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {piOnline ? (
              <Wifi size={14} className="text-green-500" />
            ) : (
              <WifiOff size={14} className="text-red-500" />
            )}
            <span className="text-[#64748b]">Gateway:</span>
            <Badge
              variant="outline"
              style={
                piOnline
                  ? { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }
                  : { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }
              }
            >
              {piOnline ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        <Card className="border border-[#e2e8f0] ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
              <Video size={16} className="text-blue-500" />
              Live Camera Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cameraOnline && piOnline ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- MJPEG stream; next/image does not support multipart/x-mixed-replace */}
                <img
                  src={SOLAR_CONFIG.camera.streamUrl}
                  alt="Live MJPEG stream"
                  className="w-full rounded-xl border border-[#e2e8f0]"
                />
                <p className="text-xs text-[#94a3b8] text-center">
                  Stream available on local network only.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[420px] rounded-xl border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] gap-5">
                <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center">
                  <Video size={28} className="text-[#94a3b8]" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-[#475569]">
                    Camera stream will appear here
                  </p>
                  <p className="text-xs text-[#94a3b8] max-w-sm">
                    Connect the Raspberry Pi gateway and enable the MJPEG stream server to activate live feed.
                  </p>
                </div>
                <ShimmerButton
                  background="rgba(59, 130, 246, 1)"
                  shimmerColor="#93c5fd"
                  borderRadius="8px"
                  shimmerDuration="2.5s"
                  className="text-sm font-medium px-5 py-2.5"
                  disabled
                >
                  Start Stream
                </ShimmerButton>
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <WifiOff size={12} />
                  {!cameraOnline ? "Camera is offline — stream unavailable" : "Gateway is offline — stream unavailable"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-[#e2e8f0] ring-0">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1e293b]">
              Recent Captures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg border border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center"
                >
                  <Camera size={20} className="text-[#cbd5e1]" />
                </div>
              ))}
            </div>
            <p className="text-xs text-[#94a3b8] mt-3 text-center">
              Captured images will appear here once the gateway starts the vision pipeline.
            </p>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
