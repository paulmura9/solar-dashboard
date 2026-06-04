import type { FC } from "react";
import { Clock, CloudSun, Sunrise, Sunset } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSunTime } from "@/lib/solar/weather";
import type { WeatherData } from "@/lib/types";

interface WeatherDataCardProps {
  data: WeatherData | null;
}

function roundToHalfHour(date: Date): string {
  const mins = date.getHours() * 60 + date.getMinutes();
  const rounded = Math.round(mins / 30) * 30;
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function computePeakHours(sunrise: string, sunset: string): string {
  const start = new Date(sunrise).getTime();
  const end = new Date(sunset).getTime();
  const span = end - start;
  const peakStart = new Date(start + span * 0.25);
  const peakEnd = new Date(end - span * 0.25);
  return `${roundToHalfHour(peakStart)} – ${roundToHalfHour(peakEnd)}`;
}

function formatDaylight(sunrise: string, sunset: string): string {
  const totalMinutes = Math.round(
    (new Date(sunset).getTime() - new Date(sunrise).getTime()) / 60_000
  );
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const WeatherDataCard: FC<WeatherDataCardProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <CloudSun size={14} className="text-amber-500" />
          Solar conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {data ? (
            <>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-[#64748b]">
                  <Sunrise size={11} className="text-amber-400" />
                  Sunrise
                </span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {formatSunTime(data.sunrise)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">Solar noon</span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {formatSunTime(data.solarNoon)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-[#64748b]">
                  <Sunset size={11} className="text-orange-400" />
                  Sunset
                </span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {formatSunTime(data.sunset)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">Peak hours</span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {computePeakHours(data.sunrise, data.sunset)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">Daylight</span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {formatDaylight(data.sunrise, data.sunset)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">Clouds</span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {Math.round(data.cloudCover)}%
                </span>
              </div>
            </>
          ) : (
            ["Sunrise", "Solar noon", "Sunset", "Peak hours", "Daylight", "Clouds"].map((lbl) => (
              <div key={lbl} className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">{lbl}</span>
                <span className="text-xs font-mono text-[#94a3b8]">—</span>
              </div>
            ))
          )}
        </div>

        {data && (
          <div className="flex items-center gap-1 text-[10px] text-[#c0cad8]">
            <Clock size={9} />
            <span>
              Updated {new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherDataCard;
