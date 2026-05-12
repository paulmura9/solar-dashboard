# Frontend Project Brief — Solar Tracker Dashboard

> Generated 2026-05-12. Documents the current implementation state of the LightTrack frontend.
> Do not use this file as a source of truth for code — always read the actual source files.

---

## 1. Frontend Overview

LightTrack is a real-time IoT monitoring and control dashboard for an automated solar panel tracking system. The frontend communicates with two backends: a Supabase cloud database (for sensor telemetry, vision results, events, and device status) and a custom Express REST API running on the Raspberry Pi gateway (for commands and live data).

The application is deployed on Vercel and is the primary interface for:

- Monitoring live solar panel telemetry (power, battery, angles, LDR sensors)
- Issuing movement and mode commands to the physical panel
- Reviewing dirt detection results from the onboard camera
- Watching the live MJPEG camera stream
- Reviewing historical charts and command logs

The system is designed for a single authenticated user, with session-based access control enforced at both the server layout level and via inactivity sign-out.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.6 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 | 4.x |
| Component library | shadcn/ui (Card, Badge, Button, Skeleton, Table) | custom |
| Animation | Framer Motion | 11.x |
| Icons | Lucide React + MUI Icons | latest |
| Charts | Recharts | 2.x |
| Auth / DB | Supabase (`@supabase/ssr` v0.10.3) | 0.10.3 |
| Bundler | Turbopack | (Next.js built-in) |
| Hosting | Vercel | — |

Key library choices:

- `@supabase/ssr` is used instead of `@supabase/supabase-js` for proper cookie-based session handling in Next.js App Router.
- `createBrowserClient` is wrapped in a singleton (`src/lib/supabase/client.ts`) so only one client instance exists per browser session.
- `createServerClient` (with `await cookies()`) is used in server components and layouts for secure `getUser()` validation.

---

## 3. Project Structure

```
src/
  app/
    page.tsx                    Root redirect (server, auth check → /dashboard or /login)
    layout.tsx                  Root layout (DashboardShell wrapper)
    globals.css                 Design tokens, Tailwind base
    dashboard/
      layout.tsx                Auth guard (server, force-dynamic, redirects to /login)
      page.tsx                  Overview page (client, main telemetry dashboard)
    analytics/
      page.tsx                  Historical charts (client)
    control/
      page.tsx                  Panel control + command history (client)
    dirt-detection/
      page.tsx                  Vision results + history (client)
    live/
      page.tsx                  Camera stream status (client)
    settings/
      page.tsx                  System status + device info (client)
    login/
      page.tsx                  Login form (client)
    auth/
      sign-up/
        page.tsx                Sign-up guard (server)
        SignUpForm.tsx          Sign-up form (client)

  components/
    DashboardShell.tsx          Shell wrapper (sidebar + topbar, skips auth pages)
    Sidebar.tsx                 Nav sidebar with links + LightTrack logo
    TopBar.tsx                  Page title + user avatar + sign-out dropdown
    AzimuthView.tsx             Animated SVG compass for horizontal angle
    ElevationView.tsx           Animated SVG panel elevation diagram
    dashboard/
      BatteryCard.tsx           Battery % hero + progress bar + voltage
      DPad.tsx                  Directional pad (manual movement)
      LdrSensorCell.tsx         Single LDR value with progress bar
      LightSensorsCard.tsx      2×2 LDR grid + balance status
      MetricRow.tsx             Label-value row (reusable)
      PanelControlCard.tsx      Mode selector + DPad wrapper
      SolarProductionCard.tsx   Solar power hero + voltage/current/energy
      TrackingStatusCard.tsx    Angles grid + tracking mode + dirt level
      WeatherDataCard.tsx       Sun schedule + ambient light + condition note
    magic/
      BorderBeam.tsx            Animated glowing border effect
      NumberTicker.tsx          Animated counting number display
      ShimmerButton.tsx         Conic gradient shimmer button

  config/
    solarConfig.ts              Calibration constants (LDR thresholds, battery voltages,
                                location, panel limits, refresh intervals)

  hooks/
    useApiToken.ts              Returns live Supabase access token (refreshes on auth change)
    useCommandHistory.ts        Fetches recent device_commands, exposes refresh()
    useInactivitySignOut.ts     8-hour inactivity timer with localStorage
    usePanelCommands.ts         Wraps all command dispatch functions
    usePanelStatus.ts           Derives panel status (balance, mode, etc.) from raw reading
    useWeatherData.ts           Fetches Open-Meteo weather + solar noon

  lib/
    api.ts                      All data-fetching functions (Supabase + backend API)
    backendClient.ts            apiFetch wrapper (auth header, error handling)
    types.ts                    TypeScript types mirroring DB schema
    supabase/
      client.ts                 Singleton getSupabaseBrowserClient()
    solar/
      commands.ts               Command payload builders + label map
      energy.ts                 Formatting utilities (V, A, W, Wh, angle)
      status.ts                 Panel/LDR status derivation logic
      weather.ts                Sun time formatting, weather status, solar noon

  proxy.ts                      Next.js 16 proxy file (passthrough, replaces middleware.ts)
```

---

## 4. Pages / Screens

### `/` — Root Redirect (Server)

Pure server component. Calls `supabase.auth.getUser()` and redirects to `/dashboard` (authenticated) or `/login` (unauthenticated). No UI rendered. `force-dynamic` prevents caching.

### `/login` — Login

Full-page auth form with the LightTrack brand identity. Features:

- SolarLogo SVG icon
- `text-4xl` "LightTrack" heading
- "Always on the Bright Side." tagline
- Green gradient accent bar (`from-green-600 to-green-400`)
- Email + password inputs
- Submit button with loading state
- "Don't have an account? Create one" link to `/auth/sign-up`
- Sign-out called before sign-in to clear stale tokens

On success: `window.location.replace("/dashboard")` (hard navigation, no back-button bypass).

### `/auth/sign-up` — Sign Up

Server guard page renders `SignUpForm.tsx` (client component). If already authenticated, redirects to `/dashboard`.

Form features: same visual identity as login, three fields (email, password, confirm), client-side validation, `signUp()` call, success state with 3-second countdown then redirect to `/login`.

### `/dashboard` — Overview

Primary telemetry dashboard. Protected by `dashboard/layout.tsx` (server auth guard). Fetches all telemetry in one `fetchAll()` call with a 10-second debounce guard. Refreshes every 30 seconds and on `visibilitychange`.

Layout:
1. Device status bar (4 cards: ESP32, Gateway, MQTT Broker, Camera)
2. Data cards row (Solar Production, Battery, Tracking Status, Light Sensors, Weather)
3. Recent Events table
4. Mini charts row (Solar Power area, Battery Voltage line, Panel Elevation line, Charging Power area)

### `/analytics` — Analytics

Historical chart page. Time range selector: 6h / 12h / 24h / 3d / 7d. Four charts:

- Solar Power (area, W over time)
- Battery Voltage (line, V over time)
- Panel Angles (line, azimuth + elevation on same chart)
- Daily Solar Energy (bar, Wh per day)

Data from `getReadingsHistory()` API. No Realtime subscription — fetch on mount and range change.

### `/control` — Control

Panel control interface. Uses Supabase Realtime subscription on `sensor_readings` INSERT to auto-refresh angle data. Layout:

1. Panel Visualization card (ElevationView + AzimuthView, with BorderBeam animation)
2. PanelControlCard (mode buttons + DPad)
3. Actions card (Start Tracking / Stop Tracking buttons, last command result, angle summary)
4. Command History table (time, command label, status badge, ACK time or error)

### `/dirt-detection` — Dirt Detection

Shows latest vision result and a history table. Per-result data: dirt level %, cleanliness %, confidence, cleaning required badge, timestamps, signed image URL from Supabase Storage.

### `/live` — Live Camera

Shows camera stream availability status. Checks CAMERA and RASPBERRY_PI device online status. Contains a `ShimmerButton` for the stream action.

### `/settings` — Settings

System information page. Shows:
- Connected services status (Supabase URL, Express backend URL)
- Device status table (device name, firmware/version, last seen)
- Project info card (architecture summary, repo info)

---

## 5. Components

### Shell / Layout

**`DashboardShell`** — Client component. Uses `usePathname()` to detect auth pages. Renders bare children for `/login` and `/auth/*` routes. For all other routes, renders inner `AuthShell` which calls `useInactivitySignOut()` and wraps content in Sidebar + TopBar + main layout.

**`Sidebar`** — Navigation links with Lucide icons. Links: Overview (`/dashboard`), Analytics, Dirt Detection, Control, Live Camera, Settings. Active link highlighted. Responsive: collapses on mobile.

**`TopBar`** — Sticky header. Shows page title from `PAGE_TITLES` map. User avatar button (initials) opens dropdown with name, email, and Sign Out button.

### Dashboard Cards

**`SolarProductionCard`** — Hero metric: solar power in W via `NumberTicker`. Secondary: voltage (V), current (A), energy today (Wh) via `MetricRow`.

**`BatteryCard`** — Hero metric: estimated battery % via `NumberTicker` (green ≥ 70%, amber ≥ 30%, red < 30%). Color-coded progress bar. Secondary: voltage, charging status Badge.

**`TrackingStatusCard`** — 2-column grid: commanded azimuth + elevation angles. Tracking mode Badge (color-coded per mode). Panel stable/moving indicator. Dirt level from latest vision result.

**`LightSensorsCard`** — 2×2 grid of `LdrSensorCell` components (TL, TR, BL, BR). Below grid: horizontal difference, vertical difference, balance status Badge.

**`LdrSensorCell`** — Label (TL/TR/BL/BR), raw ADC value (0–4095), Tailwind progress bar (value/4095), percentage text.

**`WeatherDataCard`** — Props: `data: WeatherData | null`, `ambientLux: number | null`. Rows: Ambient light (lux), Sunrise, Sunset, Peak hours (computed ±25% from day span), Solar noon, Daylight duration. Behavior note (italic, based on weather status). Updated timestamp.

**`MetricRow`** — Reusable: label string left, value string right, border-bottom separator.

**`PanelControlCard`** — Mode selector: Auto / Manual / Idle buttons. DPad (disabled unless mode is MANUAL; shows tooltip warning otherwise). Reset Position button.

**`DPad`** — 3×3 grid pad. Center is blank. UP/DOWN/LEFT/RIGHT buttons dispatch direction commands.

### Visualization

**`AzimuthView`** — 180×180 SVG. Compass rose with degree markings at 45° intervals. Framer Motion animated arrow rotates to show horizontal angle. Cardinal labels (N/S/E/W).

**`ElevationView`** — SVG showing solar panel on a pole. Framer Motion rotates the panel around its pivot. 90° = horizontal (default), 0° = pointing up, 180° = pointing down. Sky gradient background.

### Magic / Animation

**`NumberTicker`** — Framer Motion `useSpring` + `useMotionValue`. Counts from previous value to new value smoothly. Triggers only when element enters viewport. Supports decimal precision.

**`BorderBeam`** — Framer Motion `offsetPath` animation. Creates a glowing dot that travels around the card border. Configurable: `colorFrom`, `colorTo`, `size`, `duration`, `borderWidth`. Used on the Control page visualization card.

**`ShimmerButton`** — CSS conic-gradient shimmer effect on button background. Used on the Live Camera page.

---

## 6. Data Fetching

### Pattern

- Only page-level components (`page.tsx`) fetch data directly
- Data is passed down to card components as typed props
- No component fetches its own data (cards are purely presentational)

### Polling Strategy

Dashboard refreshes via `setInterval` (30s) plus `visibilitychange` listener (refetches on tab focus). A `lastFetchRef` guards against duplicate calls within 10 seconds.

Control page uses Supabase Realtime channel subscription on `sensor_readings` INSERT events to update angle display in near real-time, plus a `setInterval` (10s) fallback.

Analytics page fetches once on mount and on time range change. No polling.

### Primary Data Sources

| Data | Source | Hook / Function |
|---|---|---|
| Latest sensor reading | Express API → `getLatestReading()` | Fetched in `fetchAll` |
| Readings history | Express API → `getReadingsHistory()` | Analytics page |
| Latest vision result | Express API → `getLatestVision()` | Fetched in `fetchAll` |
| Vision history | Express API → `getVisionHistory()` | Dirt detection page |
| Recent events | Express API → `getRecentEvents()` | Fetched in `fetchAll` |
| Device status | Express API → `getDevices()` | Fetched in `fetchAll` |
| Recent commands | Express API → `getRecentCommands()` | `useCommandHistory` hook |
| Weather / sun data | Open-Meteo API → `getSunToday()` | `useWeatherData` hook |
| Signed image URLs | Supabase Storage → `getSignedImageUrl()` | Dirt detection page |

---

## 7. API Integration

### Backend Client (`src/lib/backendClient.ts`)

All backend calls go through `apiFetch<T>()`:
- Base URL: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`)
- Adds `Authorization: Bearer <token>` header when token provided
- Returns `null` on 404, 429, or any non-2xx response
- Logs warnings/errors via `console.warn` / `console.error`
- All backend responses are wrapped: `{ data: T, timestamp: string, total?: number }`

### Field Mapping (`src/lib/api.ts`)

The Express API returns snake_case field names matching the database schema. Mapper functions in `api.ts` convert these to camelCase TypeScript types:

- `mapReading()` — DB row → `SensorReading`
- `mapVision()` — DB row → `VisionResult`
- `mapEvent()` — DB row → `SystemEvent`
- `mapDevice()` — DB row → `DeviceStatus`
- `mapCommand()` — DB row → `DeviceCommand`

### Supabase Direct Access

The frontend uses Supabase directly only for:
1. Authentication (`supabase.auth.signIn/Out/getUser/getSession`)
2. Realtime channel subscription on `sensor_readings` (Control page)
3. Realtime channel subscription on `device_commands` (not active on frontend — Pi subscribes)
4. Signed image URLs via `supabase.storage.from().createSignedUrl()`

All telemetry read queries go through the Express API, not direct Supabase queries from the frontend.

### Open-Meteo Integration

`getSunToday()` calls the Open-Meteo geocoding/forecast API with coordinates from `SOLAR_CONFIG.location` (lat 45.7489, lon 21.2087 — Timișoara, Romania). Returns sunrise, sunset, and solar noon times in ISO 8601 format. Used by `useWeatherData` hook.

---

## 8. Command / Control UI

### Command Flow

```
User clicks button
  → usePanelCommands hook
    → createCommand() in api.ts
      → POST /commands on Express API (with Bearer token)
        → Pi gateway receives via Supabase Realtime
          → Pi publishes MQTT to ESP32
            → ESP32 ACKs
              → Pi UPSERTs status in device_commands
```

### Available Commands

| UI Action | Command Type | Payload |
|---|---|---|
| Move Up | MOVE | `{ direction: "UP", currentH, currentV }` |
| Move Down | MOVE | `{ direction: "DOWN", ... }` |
| Move Left | MOVE | `{ direction: "LEFT", ... }` |
| Move Right | MOVE | `{ direction: "RIGHT", ... }` |
| Set Auto | SET_MODE | `{ mode: "AUTO" }` |
| Set Manual | SET_MODE | `{ mode: "MANUAL" }` |
| Set Idle | SET_MODE | `{ mode: "IDLE" }` |
| Reset Position | RESET | `{}` |
| Start Tracking | START_TRACKING | `{}` |
| Stop Tracking | STOP_TRACKING | `{}` |

### DPad Behavior

DPad buttons are disabled unless the current tracking mode is `MANUAL`. If mode is not MANUAL, a tooltip-style note is shown. This prevents accidental movement commands when the panel is in auto-tracking mode.

### Command History

Control page shows the last 10 commands via `useCommandHistory` hook. Each row: timestamp (ro-RO locale), human-readable command label, status Badge (`PENDING` / `SENT` / `ACKNOWLEDGED` / `FAILED`), detail column (ACK time or error message).

---

## 9. Telemetry UI

### Sensor Reading Fields Displayed

| Field | Card | Display |
|---|---|---|
| `solarVoltage` | SolarProductionCard | formatVoltage() — "X.XX V" |
| `solarCurrent` | SolarProductionCard | formatCurrent() — "X.XX A" |
| `solarPower` | SolarProductionCard | Hero NumberTicker — "X.X W" |
| `energyToday` | SolarProductionCard | formatEnergy() — "X.XX Wh" |
| `batteryPercent` | BatteryCard | Hero NumberTicker — "XX %" |
| `batteryVoltage` | BatteryCard | formatVoltage() |
| `batteryStatus` | BatteryCard | Badge (CHARGING/DISCHARGING/etc.) |
| `horizontalAngle` | TrackingStatusCard | formatAngle() — "XX°" |
| `verticalAngle` | TrackingStatusCard | formatAngle() |
| `trackingMode` | TrackingStatusCard | Badge (AUTO/MANUAL/IDLE/ERROR) |
| `ldrTopLeft` | LightSensorsCard | Raw ADC + progress bar |
| `ldrTopRight` | LightSensorsCard | Raw ADC + progress bar |
| `ldrBottomLeft` | LightSensorsCard | Raw ADC + progress bar |
| `ldrBottomRight` | LightSensorsCard | Raw ADC + progress bar |
| `ambientLight` | WeatherDataCard | "XXXX lux" |

### Precision Wording

Per CLAUDE.md requirements, values are displayed with precise engineering language:
- Battery percent: "Estimated battery level"
- Angles: "Commanded horizontal/vertical angle"
- No raw floats without units
- Space before unit: `7.6 V`, `11.4 W`, `55 %`, `90°`

### Charts (Dashboard Mini Charts)

Four `Recharts` area/line charts at the bottom of the Overview page:
1. Solar Power (W) — area chart, 24h
2. Battery Voltage (V) — line chart, 24h
3. Panel Elevation angle (°) — line chart, 24h
4. Charging Power (W) — area chart, 24h

All charts downsample to ~100 data points for performance. X-axis shows HH:MM time labels.

---

## 10. Computer Vision / Dirt Detection UI

### Latest Result Display

`/dirt-detection` shows the most recent vision inference result:
- Dirt level % (0–100) — color-coded (green clean, amber warning, red dirty)
- Cleanliness % (complement of dirt level)
- Confidence score (0–1, shown as %)
- "Cleaning Required" badge (shown if dirt > threshold)
- Captured timestamp in ro-RO locale
- Signed image URL loaded from Supabase Storage (temporary URL, valid for limited time)

### History Table

Shows last N vision results in a table: timestamp, dirt %, confidence, cleaning required indicator.

### Thresholds

From `SOLAR_CONFIG` (implicit in `solarConfig.ts`):
- Dirt detection thresholds referenced but exact values not exposed in UI labels — the UI derives its display from the `VisionResult.cleaningRequired` boolean returned by the Pi gateway.

---

## 11. Events / Device Status UI

### Device Status Bar (Overview Page)

Four status cards across the top of the Overview page:
- **ESP32** — online/offline with animated pulsing dot
- **Raspberry Pi Gateway** — online/offline
- **MQTT Broker** — online/offline
- **Camera** — online/offline

Status is derived from the `device_status` table via `getDevices()`. Online = last heartbeat within threshold. Dots are green (online) or red (offline), with CSS pulse animation.

### Recent Events Table (Overview Page)

Shows last 20 `system_events` entries:
- Timestamp
- Severity badge: `INFO` (blue), `WARNING` (amber), `ERROR` (red), `CRITICAL` (red, bold)
- Event message text
- Source device

Styled as a compact feed with severity-colored left border or dot per row.

### Settings Device Table

`/settings` shows a more detailed device table from the same `getDevices()` data: device name, firmware version or type, last seen timestamp.

---

## 12. Styling and UI Quality

### Design System

Light theme. Design tokens defined in `globals.css`:

```
Background:    #f8fafc (page), white (cards)
Text primary:  #1e293b
Text secondary:#64748b
Text muted:    #94a3b8
Border:        #e2e8f0
Accent blue:   #3b82f6
Accent green:  #22c55e
Accent amber:  #f59e0b
Alert red:     #ef4444
Alert orange:  #f97316
```

Note: CLAUDE.md defines a dark theme palette (`--bg-primary: #0a0e17`) but the current implementation uses a light theme with the color values above hardcoded inline. The CSS variables from globals.css are not consistently applied — most components use Tailwind utility classes or inline hex values directly.

### Typography

No custom font is imported. The dashboard uses the browser's default sans-serif stack via Tailwind defaults. This is a gap relative to the project's stated goals (monospace terminal aesthetic, distinctive fonts like JetBrains Mono).

### Component Quality

- Cards use shadcn/ui `Card` / `CardHeader` / `CardContent` with clean whitespace
- Badges use shadcn/ui `Badge` with inline style overrides for custom status colors
- Tables use shadcn/ui `Table` components with custom column widths
- Animations: `NumberTicker` (number counting), `BorderBeam` (control page card glow), `AzimuthView` / `ElevationView` (Framer Motion panel visualization)
- Responsive layout: single column on mobile, multi-column grid on desktop

### Consistency Gaps

- Some pages use `text-[#1e293b]` directly; others use `text-slate-800` — not fully unified
- Icon sizes are inconsistently specified (some use `size={14}`, others `style={{ fontSize: 14 }}`)
- Card padding varies slightly across pages

---

## 13. Environment Variables

| Variable | Used In | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All client and server components | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All client and server components | Supabase anon/publishable key |
| `NEXT_PUBLIC_API_URL` | `backendClient.ts` | Express API base URL (defaults to `http://localhost:3001`) |

Stored in `.env.local` (gitignored). No service_role key is present in the frontend — it lives only on the Raspberry Pi.

---

## 14. Current Implementation Status

| Feature | Status | Notes |
|---|---|---|
| Authentication (login) | Complete | Singleton client, stale token clear, hard redirect |
| Authentication (sign-up) | Complete | Email confirmation flow, 3s countdown redirect |
| Auth guard (dashboard layout) | Complete | Server-side, force-dynamic |
| Root redirect | Complete | Server, getUser(), force-dynamic |
| Inactivity sign-out (8h) | Complete | localStorage, event listeners |
| Cache-Control headers | Complete | no-store on all non-auth routes |
| Overview dashboard | Complete | Telemetry + charts + events + device status |
| Analytics page | Complete | 4 charts, 5 time ranges |
| Control page | Complete | Visualization, DPad, mode, tracking, history |
| Dirt detection page | Complete | Latest result, history, signed image URL |
| Live camera page | Partial | Status check only, no actual stream embed |
| Settings page | Complete | Service status, device table, project info |
| Weather card | Complete | Sun schedule, ambient light, condition note |
| Solar production card | Complete | Power hero, voltage/current/energy |
| Battery card | Complete | % hero, progress bar, voltage, status |
| Tracking status card | Complete | Angles, mode, dirt level |
| Light sensors card | Complete | 2×2 LDR grid, balance status |
| AzimuthView animation | Complete | Framer Motion compass |
| ElevationView animation | Complete | Framer Motion panel |
| Command dispatch | Complete | All 10 command types |
| Command history | Complete | Last 10, status badges, ACK times |
| Open-Meteo integration | Complete | Sunrise/sunset/solar noon for Timișoara |
| Custom monospace font | Missing | Default browser font used |
| Dark theme | Missing | Design tokens defined but not applied |
| Push notifications | Missing | Planned (Web Push API), not started |
| Supabase Realtime (telemetry) | Partial | Only used on Control page; Overview uses polling |
| Error boundary / fallback UI | Missing | Null values show "—" but no error boundaries |

---

## 15. What Is Good

**Architecture clarity** — Clean separation of concerns: server components handle auth guards, client components handle interactivity, hooks encapsulate data fetching, and `lib/` modules have focused responsibilities.

**Type safety** — All components receive typed props. The mapper functions in `api.ts` translate DB snake_case to TypeScript camelCase types. No `any` types visible in components.

**Command flow** — The command dispatch pattern is well-structured: `usePanelCommands` abstracts all command types, `createCommand()` handles the API call, and the history table gives immediate feedback.

**Solar physics integration** — Weather card computes peak solar hours and daylight duration from actual sunrise/sunset times. `solarConfig.ts` centralizes calibration values.

**Inactivity sign-out** — Production-grade 8-hour timeout with localStorage persistence, survives page refreshes.

**Singleton Supabase client** — Prevents the performance issue of multiple `createBrowserClient` instances accumulating in memory.

**Responsive visualization** — `AzimuthView` and `ElevationView` are distinctive engineering-grade SVG components that visually communicate the panel's physical state in a way a number alone cannot.

**Data debouncing** — The 10-second `lastFetchRef` guard on `fetchAll` prevents request storms on rapid re-renders.

---

## 16. What Is Weak or Incomplete

**No custom font loaded** — CLAUDE.md specifies JetBrains Mono or similar for the terminal/engineering aesthetic. The current dashboard uses default browser fonts, which undermines the intended visual identity.

**Dark theme not applied** — The design token variables (`--bg-primary`, etc.) are defined in `globals.css` but the actual components use hardcoded light theme hex values. The dark palette exists only on paper.

**Live camera page is a stub** — `/live` checks device status but does not embed the actual MJPEG stream from the Pi's Flask endpoint. The core feature of the page is absent.

**No error boundaries** — Any component that receives null data shows "—" but there are no React error boundaries to catch rendering errors. A single malformed API response could white-screen a page.

**Polling instead of Realtime on Overview** — The main dashboard refreshes on a 30-second interval. This means live sensor data is up to 30 seconds stale. The Control page uses Realtime correctly; the Overview page should too.

**`src/lib/supabase.ts` is orphaned dead code** — The old `createClient` (non-SSR) file still exists but nothing imports from it. It should be deleted.

**Inline hex values instead of CSS variables** — Tailwind arbitrary values like `text-[#64748b]` are scattered throughout instead of a consistent token system. This makes theme changes require touching dozens of files.

**No loading skeletons on most pages** — Only the Control page uses `<Skeleton>` for the loading state. Other pages show blank space or "—" while fetching.

**`proxy.ts` is a passthrough** — The Next.js 16 proxy file does nothing. Auth enforcement is entirely in the dashboard layout. If a route outside `/dashboard/**` is added, it would have no auth protection.

**No unit or integration tests** — The entire frontend has zero test coverage.

---

## 17. Recommended Next Steps

In priority order:

1. **Load a monospace font** — Add JetBrains Mono or IBM Plex Mono via `next/font/google` in `layout.tsx`. Apply it as the base font family in `globals.css`. This single change makes the dashboard look substantially more intentional.

2. **Delete `src/lib/supabase.ts`** — It is dead code. Remove it to avoid confusion about which client to use.

3. **Add Realtime to Overview page** — Replace the 30-second polling interval with a Supabase Realtime subscription on `sensor_readings` INSERT events (same pattern already working on the Control page).

4. **Implement the live camera stream** — Embed the MJPEG stream URL (`http://<pi-ip>:5000/stream` or similar) in the Live page. Add a connection status indicator. This is the most glaring incomplete feature.

5. **Add error boundaries** — Wrap each major page section in a React error boundary so a single failed fetch does not crash the entire page.

6. **Migrate to CSS variables** — Replace hardcoded hex values with the design tokens already defined in `globals.css`. This enables future theme switching.

7. **Add loading skeletons** — Use `<Skeleton>` for each card while data is null. This improves perceived performance significantly.

8. **Enable dark theme toggle** — The dark palette is defined but never applied. Adding a theme toggle (stored in localStorage) would complete the visual design vision.

9. **Web Push notifications** — Planned in CLAUDE.md for critical alerts (battery low, tracking failure, cleaning required). Requires a service worker and backend integration.

10. **Add tests** — At minimum, unit tests for the formatter functions (`energy.ts`, `weather.ts`, `status.ts`) and smoke tests for page rendering.

---

## 18. Final Summary

The LightTrack frontend is a well-structured Next.js 16 App Router application with a clear separation between server and client concerns, a solid authentication architecture, and a complete set of pages covering all major system functions.

The core telemetry monitoring, panel control, dirt detection review, and analytics features are fully implemented and functional. The authentication flow — including sign-in, sign-up, server-side guards, inactivity sign-out, and stale token handling — is production-grade.

The main gaps are cosmetic (no custom font, dark theme not applied) or feature-level (live camera stream is a stub, Overview page uses polling instead of Realtime). The codebase is clean enough that these gaps are straightforward to address: they are additions, not architectural problems.

The project demonstrates academic engineering maturity in its IoT command flow, data validation architecture, and integration of real physical sensor data. The frontend reflects the multi-layer system design described in CLAUDE.md faithfully.
