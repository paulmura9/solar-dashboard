@AGENTS.md
@SKILL.md

# CLAUDE.md - Solar Tracker IoT Dashboard

## Project Identity

This is a **thesis-level engineering project** for a senior engineering student. It is not a prototype, not a demo, not a hackathon project. Every line of code, every design decision, every component must reflect academic maturity, clean engineering, and real-world IoT architecture.

The project name is **Solar Tracker** - an automated solar panel tracking system with computer vision dirt detection, real-time monitoring dashboard, and gateway-based IoT architecture.

---

## System Architecture

```
ESP32 (C, ESP-IDF + FreeRTOS)
    |
    | MQTT (local, sub 100ms latency)
    v
Raspberry Pi 3B (Python gateway + Mosquitto broker)
    |
    | HTTPS (validated, buffered)
    v
Supabase (PostgreSQL + Realtime WebSocket + Storage)
    |
    | HTTPS + WebSocket
    v
Next.js Frontend (Vercel)
```

Commands flow in reverse:

```
Frontend -> Supabase commands table -> Pi (Realtime listener) -> ESP32 (MQTT)
```

### Architecture Rules

- ESP32 NEVER connects directly to Supabase or exposes database credentials
- Raspberry Pi is the ONLY component with Supabase service_role key
- Frontend uses ONLY the anon/publishable key with RLS protection
- All data from ESP32 is validated by Pi before reaching Supabase
- Pi buffers readings locally when internet is unavailable
- MQTT topics follow the pattern: `solar/telemetry`, `solar/events`, `solar/commands`, `solar/commands/ack`

### Hardware Components (do NOT add others unless explicitly requested)

- ESP32 DevKit
- 2x servo motors (azimuth + elevation, GPIO18 + GPIO19)
- 4x LDR sensors (TL, TR, BL, BR)
- INA219 (I2C, solar/charging current measurement)
- BH1750 (I2C, ambient light)
- CN3065 (hardware MPPT, not software)
- 2S 18650 Li-ion battery pack
- Raspberry Pi Camera Module
- Raspberry Pi 3B

Do NOT assume or add: water pump, anemometer, wind sensor, weather station, cleaning actuators, extra displays, or any other hardware.

---

## Database Schema (Supabase PostgreSQL)

Five tables, no foreign keys (time-series architecture):

| Table | Purpose | Write source |
|---|---|---|
| `sensor_readings` | Telemetry every 5 sec | Pi gateway (service_role) |
| `vision_results` | Dirt detection results | Pi gateway (service_role) |
| `system_events` | Audit log | Pi gateway (service_role) |
| `device_commands` | Commands from dashboard | Frontend (anon key, INSERT only) |
| `device_status` | Device online/offline | Pi gateway (service_role, upsert) |

### Constraints enforced in DB

- Servo angles: 0-180
- LDR values: 0-4095 (12-bit ADC)
- Battery percent: 0-100
- Tracking mode: AUTO, MANUAL, IDLE, ERROR
- Battery status: CHARGING, DISCHARGING, IDLE, LOW, UNKNOWN
- Command status: PENDING, SENT, ACKNOWLEDGED, FAILED
- Severity: INFO, WARNING, ERROR, CRITICAL
- Confidence: 0-1
- Dirt/cleanliness percent: 0-100
- Battery voltage: 0-20V
- Solar/charging power: >= 0

### Realtime enabled on

- `sensor_readings` (live dashboard telemetry)
- `device_commands` (Pi listens for new commands)
- `device_status` (live online/offline indicators)

---

## Tech Stack

```
Frontend:     Next.js 14+ App Router, TypeScript, Tailwind CSS, Recharts, Lucide React
Backend:      Supabase (PostgreSQL, Realtime, Auth, Storage, Edge Functions)
Gateway:      Python 3, paho-mqtt, supabase-py, OpenCV, TFLite, Flask (MJPEG stream)
Firmware:     ESP-IDF v5.2 + FreeRTOS, C
Broker:       Mosquitto on Raspberry Pi
Hosting:      Vercel (frontend), Supabase Cloud (backend)
```

---

## Frontend Architecture

```
src/
  app/
    page.tsx              Main dashboard (client component)
    layout.tsx            Root layout
    globals.css           Design tokens and base styles
  components/
    StatusCard.tsx         Reusable card wrapper (icon, title, accent color)
    MetricRow.tsx          Label-value pair row
    PanelPositionCard.tsx  Angles + tracking mode
    SolarProductionCard.tsx Voltage, current, power, energy
    BatteryCard.tsx        Percent bar, voltage, charging status
    ChargingCard.tsx       MPPT output to battery
    LightSensorsCard.tsx   4 LDR grid + differences + balance
    DirtDetectionCard.tsx  Dirt level, confidence, cleaning required
    SystemHealthCard.tsx   Device online/offline with animated dots
    EventLog.tsx           Recent system events with severity colors
    PowerChart.tsx         Solar + charging power area chart (24h)
    BatteryChart.tsx       Voltage + percent dual-axis line chart (24h)
    AnglesChart.tsx        Horizontal + vertical angle line chart (24h)
  lib/
    supabase.ts           Supabase client singleton
    types.ts              TypeScript types mirroring DB schema
    queries.ts            All Supabase queries in one place
    utils.ts              Formatting (V, A, W, Wh, %, deg) + status helpers
```

### Component Rules

- Every component receives typed props, never `any`
- No component fetches data directly, all data comes from props
- Only `page.tsx` calls `queries.ts` functions
- Charts downsample to ~100 points for performance
- All values display with units: V, A, W, Wh, %, deg
- Use "Estimated" for battery percent and servo angles (no physical feedback)
- Use "Commanded" for angles if context requires precision

---

## Anti-AI-Slop Rules

This is the most critical section. Generated code must NOT look like generic AI output.

### Code Quality

NEVER produce:

- Unused functions, variables, imports, or constants
- Dead code or unreachable branches
- Placeholder logic or fake implementations (`return true`, `// TODO`)
- Overcomplicated abstractions or design patterns added for show
- Copy-pasted blocks with minor variations
- Inconsistent naming (mixing camelCase and snake_case in same layer)
- Magic numbers without named constants
- Comments that explain obvious code (`// increment counter` above `counter++`)
- Hardware components that were not requested
- Random delays without justification
- Functions declared but never called
- Modules imported but never used

ALWAYS:

- Every function must be called somewhere
- Every variable must be read somewhere
- Every import must be used
- Every constant must have a descriptive name
- Every module must have a clear single responsibility
- Remove dead code before committing
- Validate inputs at boundaries
- Handle errors explicitly, never silently swallow them

### Architecture Quality

NEVER:

- Mix hardware logic with database logic in the same file
- Put secrets in frontend code or ESP32 firmware
- Let ESP32 talk directly to Supabase
- Use monolithic files with 500+ lines
- Create classes/abstractions that wrap a single function call
- Add middleware layers that just pass data through unchanged

ALWAYS:

- Separate concerns into focused modules
- Use configuration files or constants for calibration values
- Validate at system boundaries (Pi validates before DB insert)
- Use environment variables for credentials
- Keep functions small and focused (under 40 lines ideally)

---

## Frontend Aesthetics - NO AI SLOP

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Cliched color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>

### Project-Specific Design Tokens

Current palette (defined in `globals.css`):

```css
--bg-primary: #0a0e17;     /* Deep navy-black */
--bg-secondary: #111827;    /* Dark blue-grey */
--bg-card: #151d2e;         /* Card surface */
--border-color: #1e293b;    /* Subtle borders */
--text-primary: #e2e8f0;    /* Light grey text */
--text-secondary: #94a3b8;  /* Medium grey */
--text-muted: #64748b;      /* Dim labels */
--solar-amber: #f59e0b;     /* Primary accent, solar/energy */
--energy-green: #22c55e;    /* Positive states, charging */
--battery-blue: #3b82f6;    /* Battery, secondary data */
--alert-red: #ef4444;       /* Errors, critical states */
--alert-orange: #f97316;    /* Warnings */
```

Good font choices for this project: JetBrains Mono, Fira Code, Cascadia Code, IBM Plex Mono, Commit Mono.

### What Makes This Dashboard Distinctive

- Monospace font gives it a terminal/engineering feel
- Amber as primary accent references sunlight and solar energy
- Cards use gradient backgrounds, not flat solid colors
- LDR sensors displayed as a 2x2 visual grid with progress bars
- Battery shown as a colored progress bar, not just a number
- Event log styled as a compact feed with severity-colored dots
- Timestamps in Romanian locale (ro-RO) for local context
- Some cards feel dense and data-rich, others spacious with a single hero metric
- Contrast in visual weight across cards creates interest

---

## Naming Conventions

### TypeScript / Frontend

- Components: PascalCase (`PanelPositionCard.tsx`)
- Functions: camelCase (`getLatestReading()`)
- Types/Interfaces: PascalCase (`SensorReading`)
- Constants: UPPER_SNAKE_CASE only for true constants (`MAX_LDR_VALUE`)
- CSS variables: kebab-case (`--bg-primary`)
- Files: PascalCase for components, camelCase for utilities

### Database

- Tables: snake_case (`sensor_readings`)
- Columns: snake_case (`battery_voltage`)
- Enums in CHECK constraints: UPPER_SNAKE_CASE (`CHARGING`)

### MQTT

- Topics: slash-separated lowercase (`solar/telemetry`)
- Payload keys: camelCase JSON (`horizontalAngle`)

### ESP32 / C

- Functions: camelCase (`readLightSensors()`)
- Constants: UPPER_SNAKE_CASE (`H_MIN_ANGLE`)
- Structs: PascalCase (`TelemetryPayload`)

---

## Wording Precision (for UI and thesis)

Use precise technical wording everywhere:

| Wrong | Correct |
|---|---|
| Battery level: 55% | Estimated battery level: 55% |
| Horizontal angle: 90deg | Commanded horizontal angle: 90deg |
| Solar power: 11.4W | Solar power: 11.4 W |
| Dirt: dirty | Dirt level: 24.5% |
| ESP32 connected | ESP32 online |
| exact angle | estimated angle (no encoder feedback) |

Always display units with a space before: `7.6 V`, `0.62 A`, `11.4 W`, `43.8 Wh`, `55%`, `90deg`

---

## Error Handling Philosophy

Never ignore errors silently. Handle these edge cases:

- Missing or null sensor values: display dash in UI
- Invalid LDR readings (outside 0-4095): reject at gateway
- Servo angles outside 0-180: constrain and log warning
- INA219 not responding: log error, use null values
- MQTT disconnected: Pi retries with backoff, ESP32 buffers locally
- Supabase unavailable: Pi buffers to local SQLite, uploads when reconnected
- Camera unavailable: log error, skip vision cycle
- Command timeout (no ACK in 10s): mark as FAILED
- Battery voltage out of range (below 6.0V or above 9.0V): log CRITICAL event
- Division by zero in MPPT efficiency calculation: check denominator first

---

## Performance Guidelines

- Sensor readings query uses index on `timestamp DESC`
- Charts request only last 24h of data, downsampled to ~100 points
- Dashboard auto-refreshes every 30 seconds (not realtime subscription for MVP)
- Partial index on `device_commands WHERE status = 'PENDING'` for gateway performance
- Images stored in Supabase Storage, not as base64 in database
- Gateway validates JSON structure before database insert

---

## Security Checklist

- Frontend uses only anon/publishable key
- RLS enabled on all tables
- Frontend can only INSERT commands as PENDING (no UPDATE policy for anon)
- Pi uses service_role key (stored in environment variable, never committed)
- ESP32 has no database credentials
- WiFi credentials stored in NVS flash, not hardcoded
- No secrets in git repository
- `.env.local` is in `.gitignore`

---

## File Organization Rules

- One component per file
- No file exceeds 200 lines (split if it does)
- All database queries live in `lib/queries.ts`
- All types live in `lib/types.ts`
- All formatting utilities live in `lib/utils.ts`
- Configuration constants go at the top of the file that uses them, or in a dedicated config file if shared
- No circular imports

---

## Git Commit Messages

Use conventional commits:

```
feat: add battery voltage chart to dashboard
fix: resolve hydration mismatch on timestamp display
refactor: extract MetricRow into reusable component
docs: update CLAUDE.md with architecture diagram
chore: update supabase-js to v2.45
```

---

## What This Project Is NOT

- Not a weather station (no anemometer, no temperature sensor)
- Not a home automation system
- Not a generic IoT demo
- Not a mobile app (web dashboard only, with push notifications via Web Push API)
- Not a multi-panel system (single panel, single ESP32)
- Not using Firebase, MongoDB, or any NoSQL database
- Not using Arduino IDE (uses ESP-IDF + FreeRTOS)
- Not exposing ESP32 directly to the internet