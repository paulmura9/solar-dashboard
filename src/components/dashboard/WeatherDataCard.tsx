import type { FC } from "react";
import WbCloudy from "@mui/icons-material/WbCloudy";
import { Clock, Sunrise, Sunset } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSunTime } from "@/lib/solar/weather";
import type { WeatherData, WeatherStatus } from "@/lib/types";

interface WeatherDataCardProps {
  data: WeatherData | null;
}

const CONDITION_NOTES: Record<WeatherStatus, string> = {
  CLEAR:         "Tracking active — fine adjustments",
  PARTLY_CLOUDY: "Tracking calm — slower movements",
  CLOUDY:        "Position frozen — no tracking benefit",
  RAIN:          "Position frozen — no tracking benefit",
  UNKNOWN:       "Awaiting sensor data",
};

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
  const status = data?.weatherStatus ?? "UNKNOWN";
  const note = CONDITION_NOTES[status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
          <WbCloudy style={{ fontSize: 14, color: "#3b82f6" }} />
          Weather
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
                <span className="text-xs text-[#64748b]">Solar noon</span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {formatSunTime(data.solarNoon)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">Daylight</span>
                <span className="text-xs font-mono font-medium text-[#1e293b]">
                  {formatDaylight(data.sunrise, data.sunset)}
                </span>
              </div>
            </>
          ) : (
            ["Sunrise", "Sunset", "Peak hours", "Solar noon", "Daylight"].map((lbl) => (
              <div key={lbl} className="flex items-center justify-between">
                <span className="text-xs text-[#64748b]">{lbl}</span>
                <span className="text-xs font-mono text-[#94a3b8]">—</span>
              </div>
            ))
          )}
        </div>

        <p className="text-[10px] text-[#64748b] italic leading-relaxed border-t border-[#e2e8f0] pt-2">
          {note}
        </p>

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
