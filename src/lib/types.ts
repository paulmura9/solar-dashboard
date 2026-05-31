export type TrackingMode = "AUTO" | "MANUAL" | "IDLE" | "NIGHT" | "ERROR";
export type BatteryStatus = "CHARGING" | "DISCHARGING" | "IDLE" | "LOW" | "UNKNOWN";
export type CommandType = "SET_MODE" | "MOVE_PANEL" | "RESET_POSITION" | "REQUEST_STATUS" | "START_TRACKING" | "STOP_TRACKING";
export type CommandStatus = "PENDING" | "SENT" | "ACKNOWLEDGED" | "FAILED";
export type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface SensorReading {
  id: number;
  timestamp: string;
  horizontal_angle: number;
  vertical_angle: number;
  tracking_mode: TrackingMode;
  is_moving: boolean;
  ldr_top_left: number | null;
  ldr_top_right: number | null;
  ldr_bottom_left: number | null;
  ldr_bottom_right: number | null;
  horizontal_light_difference: number | null;
  vertical_light_difference: number | null;
  battery_voltage: number | null;
  battery_percent: number | null;
  battery_status: BatteryStatus | null;
  solar_voltage: number | null;
  solar_current: number | null;
  solar_power: number | null;
  solar_energy_today_wh: number | null;
  charging_voltage: number | null;
  charging_current: number | null;
  charging_power: number | null;
  charged_energy_today_wh: number | null;
  ambient_light_lux: number | null;
  created_at: string;
}

export interface VisionResult {
  id: number;
  timestamp: string;
  dirt_level_percent: number;
  cleanliness_percent: number;
  cleaning_required: boolean;
  predicted_class: "clean" | "slightly_dirty" | "dirty" | null;
  confidence: number | null;
  image_path: string | null;
  processed_image_path: string | null;
  created_at: string;
}

export interface CameraCapture {
  id: number;
  command_id: string | null;
  image_path: string | null;
  timestamp: string;
  created_at: string;
}

export interface SystemEvent {
  id: number;
  timestamp: string;
  event_type: string;
  severity: Severity;
  message: string;
  created_at: string;
}

export interface DeviceStatus {
  id: number;
  device_name: string;
  is_online: boolean;
  last_seen: string | null;
  firmware_version: string | null;
  status_message: string | null;
  updated_at: string;
}

export interface DeviceCommand {
  id: string;
  command_type: CommandType;
  payload: Record<string, unknown>;
  status: CommandStatus;
  error_message: string | null;
  ack_payload: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
}

export type BalanceStatus = "BALANCED" | "ADJUSTING" | "UNBALANCED" | "NIGHT" | "LOW_LIGHT";
export type PanelMode = "TRACKING" | "MANUAL" | "IDLE" | "ERROR" | "NIGHT";
export type WeatherStatus = "CLEAR" | "PARTLY_CLOUDY" | "CLOUDY" | "RAIN" | "UNKNOWN";
export type LightState = "NIGHT" | "DARK" | "NORMAL" | "UNKNOWN";
export type CommandDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface LightSensorData {
  topLeft: number | null;
  topRight: number | null;
  bottomLeft: number | null;
  bottomRight: number | null;
  horizontalDiff: number | null;
  verticalDiff: number | null;
  balanceStatus: BalanceStatus;
}

export interface WeatherData {
  weatherStatus: WeatherStatus;
  sunrise: string;
  sunset: string;
  solarNoon: string;
}

export interface PanelStatusData {
  mode: PanelMode;
  horizontalAngle: number;
  verticalAngle: number;
  isMoving: boolean;
  lightSensors: LightSensorData;
}
