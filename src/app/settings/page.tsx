"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Cpu, Server, Camera, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiToken } from "@/hooks/useApiToken";
import { getDevices } from "@/lib/api";
import type { DeviceStatus } from "@/lib/types";

const DEVICE_DISPLAY: Record<string, { label: string; icon: React.ElementType }> = {
  ESP32:        { label: "ESP32",           icon: Cpu    },
  RASPBERRY_PI: { label: "Raspberry Pi 3B", icon: Server },
  CAMERA:       { label: "Camera Module",   icon: Camera },
  MQTT_BROKER:  { label: "MQTT Broker",     icon: Radio  },
};

const SETTINGS_OFFLINE_DEVICES: DeviceStatus[] = [
  { id: -1, device_name: "ESP32",        is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
  { id: -2, device_name: "RASPBERRY_PI", is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
  { id: -3, device_name: "CAMERA",       is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
  { id: -4, device_name: "MQTT_BROKER",  is_online: false, last_seen: null, firmware_version: null, status_message: null, updated_at: "" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseDomain = supabaseUrl.replace(/^https?:\/\//, "").split(".")[0];
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function SettingsPage() {
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const token = useApiToken();

  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) {
      setLoading(false);
      return;
    }
    const data = await getDevices(token);
    setDevices(data);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchData(); }, 0);
    return () => clearTimeout(id);
  }, [fetchData]);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Connected services */}
      <Card className="border border-[#e2e8f0] ring-0">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1e293b]">Connected Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#e2e8f0]">
            <div>
              <p className="text-xs font-semibold text-[#1e293b]">Supabase (PostgreSQL)</p>
              <p className="text-xs text-[#64748b] mt-0.5">
                {supabaseDomain ? `${supabaseDomain}.supabase.co` : "Not configured"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {supabaseUrl ? (
                <>
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-green-600 font-medium">Configured</span>
                </>
              ) : (
                <>
                  <XCircle size={14} className="text-red-500" />
                  <span className="text-red-500 font-medium">Missing</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-semibold text-[#1e293b]">Express REST Backend</p>
              <p className="text-xs text-[#64748b] mt-0.5">
                {apiUrl || "Not configured"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {apiUrl ? (
                <>
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-green-600 font-medium">Configured</span>
                </>
              ) : (
                <>
                  <XCircle size={14} className="text-red-500" />
                  <span className="text-red-500 font-medium">Missing</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device status */}
      <Card className="border border-[#e2e8f0] ring-0">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1e293b]">Device Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 pb-4 space-y-2 pt-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#e2e8f0]">
                  <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Device</TableHead>
                  <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Firmware</TableHead>
                  <TableHead className="text-xs text-[#94a3b8] uppercase tracking-wider">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(devices.length > 0 ? devices : SETTINGS_OFFLINE_DEVICES).map((d) => {
                  const meta = DEVICE_DISPLAY[d.device_name] ?? { label: d.device_name, icon: Cpu };
                  const Icon = meta.icon;
                  return (
                    <TableRow key={d.device_name} className="border-[#e2e8f0] text-xs">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon size={13} className="text-[#64748b]" />
                          <span className="font-medium text-[#1e293b]">{meta.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={
                            d.is_online
                              ? { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }
                              : { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }
                          }
                        >
                          {d.is_online ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#64748b]">{d.firmware_version ?? "—"}</TableCell>
                      <TableCell className="text-[#64748b] tabular-nums">
                        {d.last_seen
                          ? new Date(d.last_seen).toLocaleString("ro-RO", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Project info */}
      <Card className="border border-[#e2e8f0] ring-0">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1e293b]">Project Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[#64748b]">
          <div className="flex justify-between">
            <span>Project</span>
            <span className="text-[#1e293b] font-medium">LightTrack</span>
          </div>
          <div className="flex justify-between">
            <span>Frontend</span>
            <span className="text-[#1e293b] font-medium">Next.js 16 · Vercel</span>
          </div>
          <div className="flex justify-between">
            <span>API</span>
            <span className="text-[#1e293b] font-medium">Express · Raspberry Pi 3B</span>
          </div>
          <div className="flex justify-between">
            <span>Database</span>
            <span className="text-[#1e293b] font-medium">Supabase Cloud</span>
          </div>
          <div className="flex justify-between">
            <span>Firmware</span>
            <span className="text-[#1e293b] font-medium">ESP32 DevKit</span>
          </div>
          <div className="flex justify-between">
            <span>Gateway</span>
            <span className="text-[#1e293b] font-medium">Python 3 · Raspberry Pi 3B</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
