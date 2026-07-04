# LightTrack Dashboard (solar-dashboard)

The web dashboard for **LightTrack**, a dual-axis solar tracking system with
camera-based dirt detection. This repository contains the Next.js frontend of the
project. It shows live and historical data from the solar panel, lets the user send
manual positioning commands, and displays the results of the camera dirt-detection runs.

---

## 1. Project

### What it is

`solar-dashboard` is the user-facing web application of the LightTrack system. It is a
Next.js (App Router) single-page style dashboard written in TypeScript. It is where a
user logs in and monitors the panel, reviews its history, and controls it.

### Where it sits in the system

The full hardware-to-user data path is:

```
ESP32  ->  Raspberry Pi gateway  ->  solar-api (Express backend)  ->  dashboard
```

The dashboard **does not talk to the hardware directly**. It only communicates with the
backend service (`solar-api`):

- It reads the latest telemetry, historical readings, events, device status, and
  dirt-detection results from the backend over a **REST API**.
- It receives live updates (telemetry, device status, command acknowledgements, and
  vision results) over a **WebSocket** connection to the same backend.

Supabase is used separately from the telemetry path. It provides **user
authentication** and the **storage bucket** that holds the captured panel images shown
in the dirt-detection view.

### Main features

- **Live telemetry cards** — solar production (voltage, current, power), battery state,
  and charging status, updated live over the WebSocket.
- **Light sensors and sun tracking** — the four LDR light-sensor readings and a
  sun-tracking view that computes the sun's position (via `suncalc`) for the installation
  location and compares it with the panel orientation.
- **Historical charts / analytics** — time-series charts of telemetry over time,
  rendered with Recharts and downsampled for performance.
- **Manual panel control** — a control page to send manual azimuth/elevation positioning
  commands to the panel through the backend.
- **Dirt detection** — the latest dirt-detection result together with the captured
  surface image and a confidence value.
- **Device status** — online/offline status for the devices in the system (ESP32,
  gateway, camera, broker).
- **Weather context** — local weather / solar-irradiance data for the installation site.
- **Authentication** — email and password sign-in and sign-up, password reset, and
  Google sign-in.

### Technology

Versions below are taken from `package.json`.

- **Next.js 16.2.6** (App Router) and **React 19.2.4**
- **TypeScript 5**
- **Tailwind CSS 4** (with `@tailwindcss/postcss`)
- **UI components**: shadcn/ui built on **Radix UI**, alongside **MUI (Material UI) 9**
  (`@mui/material`, `@mui/icons-material`, Emotion)
- **SWR 2** for data fetching and caching
- **Recharts 3** for charts
- **framer-motion 12** for animation
- **suncalc** for sun-position calculations
- **lucide-react** for icons
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) for authentication and storage
- Font: **JetBrains Mono** (via `next/font`)

---

## 2. Deliverables / Repository

- **Repository:** `<https://gitlab.upt.ro/...>` *(placeholder — replace with the actual
  project URL)*

The repository contains the **full source code** of the dashboard, with **no compiled
binaries**. In particular, the Next.js build output (`.next/`) and the installed
dependencies (`node_modules/`) are **not committed** — they are generated locally from
the sources during installation and build (see below). Local secrets in `.env.local` are
also not committed; `.env.example` is provided as a template.

---

## 3. Requirements / dependencies

- **Node.js 20.9 or newer.** Next.js 16 requires this minimum version. Older Node
  versions (18 and below) are not supported.
- **npm** (bundled with Node.js).

Install all project dependencies from the repository root:

```
npm install
```

This reads `package.json` and installs the exact dependency versions into a local
`node_modules/` directory.

---

## 4. Configuration

The application is configured through environment variables. Create a file named
**`.env.local`** in the project root (you can copy `.env.example` as a starting point)
and set the variables below. All variables are prefixed with `NEXT_PUBLIC_` because they
are read in the browser. Only the variable **names** are listed here — real values must
not be committed.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (authentication and storage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key (safe for the browser) |
| `NEXT_PUBLIC_API_URL` | Base URL of the `solar-api` backend (REST) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL of the `solar-api` backend (live updates) |
| `NEXT_PUBLIC_LOCATION_LAT` | Latitude of the installation site |
| `NEXT_PUBLIC_LOCATION_LON` | Longitude of the installation site |

**Fallback behavior:** if `NEXT_PUBLIC_LOCATION_LAT` or `NEXT_PUBLIC_LOCATION_LON` is
missing or not a valid number, the application falls back to a default location
(Timișoara, Romania) for its sun-position and weather calculations.

---

## 5. Build / compilation

To compile the application for production:

```
npm run build
```

This runs `next build`, which type-checks the TypeScript sources and produces an
optimized production build in the `.next/` directory.

---

## 6. Run / launch

**Development server** (with hot reloading):

```
npm run dev
```

The dashboard is then available at **http://localhost:3000**.

**Production** (after `npm run build`):

```
npm start
```

This runs `next start` and serves the compiled production build.

**Deployment:** the dashboard is deployed on **Vercel**, which runs the build and hosts
the production application automatically from the repository.
