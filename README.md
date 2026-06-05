# LightTrack Dashboard

This is the web dashboard for LightTrack, a dual-axis solar tracking system with
camera-based dirt detection. It is the frontend part of my bachelor's thesis project.
The dashboard shows live and historical data from the panel, lets the user send manual
positioning commands, and displays the results of the dirt detection runs.

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (Radix-based components)
- SWR for data fetching and caching
- Recharts for the charts
- Supabase for authentication, realtime, and storage

## How it talks to the rest of the system

The hardware data path is:

ESP32 -> Raspberry Pi gateway -> Express backend (solar-api) -> dashboard

The dashboard does not talk to the hardware directly. It reads telemetry, history,
and vision results from the Express backend over a REST API, and receives live updates
(telemetry, device status, command acknowledgements, vision results) over a WebSocket
connection to the same backend. Supabase is used separately for user authentication,
realtime, and for the storage bucket that holds the captured panel images.

## Features

- Live telemetry cards: solar production, battery, and charging status
- Light sensor (LDR) readings and sun tracking status
- Historical charts for telemetry over time
- Manual panel control to send azimuth/elevation commands
- Dirt detection results with the captured surface image and a confidence value
- Device status for the ESP32, Raspberry Pi, camera, and MQTT broker
- Email and password authentication, including password reset

## Running locally

Install dependencies:

```
npm install
```

Create a `.env.local` file (you can copy `.env.example`) and set the following
environment variables. Values are omitted here.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_WS_URL
NEXT_PUBLIC_CAMERA_STREAM_URL
NEXT_PUBLIC_LOCATION_LAT
NEXT_PUBLIC_LOCATION_LON
```

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` point at the Express backend (REST and
WebSocket). `NEXT_PUBLIC_CAMERA_STREAM_URL` is the MJPEG stream served by the Raspberry
Pi and is only reachable on the same local network. `NEXT_PUBLIC_LOCATION_LAT` and
`NEXT_PUBLIC_LOCATION_LON` are the installation coordinates used for the weather and sun
position calculations; if they are missing the app falls back to a default location.

Start the development server:

```
npm run dev
```

The app runs at http://localhost:3000.

## Deployment

The dashboard is deployed on Vercel.
