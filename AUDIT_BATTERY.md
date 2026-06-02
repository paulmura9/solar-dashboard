# AUDIT — Battery Percentage & MPPT Charging (frontend)

Audit-only. No source modified. Every claim cites `file:line`.

---

## 1. Battery card — `src/components/dashboard/BatteryCard.tsx`

### Fields read & source
The card receives a `SensorReading | null` via the `reading` prop (`BatteryCard.tsx:14-18`), wired from `latest` (the `useLatestReading()` result) in `dashboard/page.tsx:138`. It reads three fields:

- `battery_percent` — `BatteryCard.tsx:46` (`r?.battery_percent ?? null`)
- `battery_status` — `BatteryCard.tsx:47` (`r?.battery_status ?? null`)
- `battery_voltage` — `BatteryCard.tsx:79` (`formatVoltage(r?.battery_voltage ?? null)`)

Endpoint: `/api/readings/latest` (`src/types/api.ts:24`, `apiKeys.latestReading`), parsed by `mapReading()` (`src/lib/api.ts:42-44`). The same shape can also arrive over WebSocket and be merged into the SWR cache (`src/lib/swr/wsCacheBridge.ts:38-40`).

### Is `battery_percent` from backend, or recomputed client-side?
**Straight from the backend value. No client-side recompute from voltage.**
`mapReading` copies the backend `batteryPercent`/`battery_percent` verbatim (`src/lib/api.ts:43`); the card renders it directly through `<NumberTicker value={pct} … />` (`BatteryCard.tsx:64`). A repo-wide search for `battery_percent` returns only: `types.ts`, `api.ts` (mapping), `BatteryCard.tsx` (render), `wsCacheBridge.ts` (cache merge). No derivation from voltage exists anywhere. The fill-bar width is just `${pct}%` (`BatteryCard.tsx:75`).

### Low-battery / critical warning logic
There is **no dedicated low/critical battery warning, banner, or event** in the battery UI. The only percent-driven behavior is **color tiering** plus an icon swap — purely cosmetic, no alert text:

- `getBatteryColor()` (`BatteryCard.tsx:20-25`): `>= goodPercent` → green `#22c55e`; `>= lowColorPercent` → amber `#f59e0b`; else red `#ef4444`. `null` → grey `#94a3b8`.
  - Thresholds from config: `SOLAR_CONFIG.battery.goodPercent = 70`, `battery.lowColorPercent = 30` (`src/config/solarConfig.ts:37-40`).
- `HeaderIcon()` (`BatteryCard.tsx:37-43`): **hardcoded magic numbers** `80` and `40` (not from config) select `BatteryFull` / `BatteryMedium` / `BatteryLow`; `status === "CHARGING"` forces `BatteryCharging`.
- `battery_status === "LOW"` only changes the status badge colors via `STATUS_STYLES.LOW` (`BatteryCard.tsx:33`); the literal text shown is just the raw status string (`BatteryCard.tsx:88`).

Note: CLAUDE.md's "battery voltage below 6.0 V → CRITICAL event" rule is **not** implemented in the frontend. The only place `6`/`9` appear is the battery-voltage **chart Y-axis domain** `[6, 9]` (`DashboardCharts.tsx:55`, `AnalyticsCharts.tsx:55`) — a chart scale, not a warning.

### Units & labels displayed
- Percent: integer ticker + standalone `%` glyph (`BatteryCard.tsx:64-66`), `decimalPlaces={0}`. Null → `—` (`BatteryCard.tsx:69`).
- Voltage: `formatVoltage` → `"X.XX V"` (space before unit), null → `—` (`src/lib/solar/energy.ts:12-15`).
- Status: raw enum string in a badge (`CHARGING`/`DISCHARGING`/`IDLE`/`LOW`/`UNKNOWN`), null → `—` (`BatteryCard.tsx:82-90`).
- Card title label: `"Battery"` (`BatteryCard.tsx:56`). Labels `"Voltage"`, `"Status"` (`BatteryCard.tsx:79,81`).
- The card does **not** use the CLAUDE.md "Estimated battery level" wording — it labels the metric simply `Battery` / `%`.

---

## 2. Charging / MPPT

The `SensorReading` type carries four charging fields: `charging_voltage`, `charging_current`, `charging_power`, `charged_energy_today_wh` (`src/lib/types.ts:27-30`). They are parsed (`src/lib/api.ts:49-52`) and cache-merged (`src/lib/swr/wsCacheBridge.ts:45-48`).

Render status:

- `charging_power` — **rendered, but only in charts**, never as a card metric. Plotted as the "Charging Power (W)" area on the dashboard (`transformReadings.ts:67` → `DashboardCharts.tsx:84-106`) and as the "Charging Power" series on analytics (`transformReadings.ts:90` → `AnalyticsCharts.tsx:40`).
- `charging_voltage` — **never rendered.** Only appears in `api.ts:49` and `wsCacheBridge.ts:45`.
- `charging_current` — **never rendered.** Only `api.ts:50` and `wsCacheBridge.ts:46`.
- `charged_energy_today_wh` — **never rendered.** Only `api.ts:52` and `wsCacheBridge.ts:48`. (The Solar Production card's "Energy today" uses `solar_energy_today_wh`, a different field — `SolarProductionCard.tsx:42`.)

There is **no MPPT / charging card** component at all. No component displays charging voltage, charging current, or charged-energy-today as a numeric metric. CLAUDE.md's described `ChargingCard.tsx` does not exist in `src/components/`.

---

## 3. Charts — battery / charging series

| Chart | Series (dataKey) | Source field | Where |
|---|---|---|---|
| Dashboard "Battery Voltage (V)" | `voltage` | `battery_voltage` | `transformReadings.ts:64` → `DashboardCharts.tsx:47-62` |
| Dashboard "Charging Power (W)" | `charging` | `charging_power` | `transformReadings.ts:67` → `DashboardCharts.tsx:83-106` |
| Analytics "Solar Power (W)" (dual area) | `charging` | `charging_power` | `transformReadings.ts:90` → `AnalyticsCharts.tsx:40` |
| Analytics "Battery Voltage (V)" | `voltage` | `battery_voltage` | `transformReadings.ts:94` → `AnalyticsCharts.tsx:47-62` |

- **`battery_percent` is never plotted** in any chart — only battery *voltage* is. (CLAUDE.md's described `BatteryChart` "voltage + percent dual-axis" is not implemented; percent has no series.)
- Both battery-voltage charts use a fixed Y domain `[6, 9]` (`DashboardCharts.tsx:55`, `AnalyticsCharts.tsx:55`).
- Chart values coerce null → `0` via `Number(...) || 0` (`transformReadings.ts:65-67`, `89-91`), so a missing/null charging or voltage sample is plotted as `0`, not as a gap.

---

## 4. Types / contracts

The reading contract is `interface SensorReading` (`src/lib/types.ts:7-33`), re-exported through `src/types/api.ts:35-42`.

Battery/charging fields **defined** (7): `battery_voltage`, `battery_percent`, `battery_status`, `charging_voltage`, `charging_current`, `charging_power`, `charged_energy_today_wh` (`types.ts:20-22, 27-30`).

Actually **consumed by the UI** (4):
- `battery_percent` — card hero + bar (`BatteryCard.tsx:46`)
- `battery_status` — card badge/icon (`BatteryCard.tsx:47`)
- `battery_voltage` — card metric + both voltage charts (`BatteryCard.tsx:79`, `transformReadings.ts:64,94`)
- `charging_power` — charts only (`transformReadings.ts:67,90`)

Defined but **never consumed by any UI** (3): `charging_voltage`, `charging_current`, `charged_energy_today_wh` — mapped/cached only.

`BatteryStatus` enum: `"CHARGING" | "DISCHARGING" | "IDLE" | "LOW" | "UNKNOWN"` (`types.ts:2`); all five have style entries in `STATUS_STYLES` (`BatteryCard.tsx:29-35`).

---

## 5. Dead / placeholder code & hardcoded values

- **`charging_voltage`, `charging_current`, `charged_energy_today_wh`** — defined in the type, parsed (`api.ts:49,50,52`), and cache-merged (`wsCacheBridge.ts:45,46,48`), but **rendered nowhere**. Effectively dead in the UI layer.
- **Hardcoded magic numbers `80` / `40`** for the header battery icon (`BatteryCard.tsx:40-41`) — not in `SOLAR_CONFIG`, and inconsistent with the color thresholds `70` / `30`.
- **Hardcoded hex colors** for battery color tiers and status badges (`BatteryCard.tsx:21-24, 30-34`).
- **Hardcoded voltage chart domain `[6, 9]`** (`DashboardCharts.tsx:55`, `AnalyticsCharts.tsx:55`).
- No `// TODO` / `return true` placeholders or mock/hardcoded battery values found in these components; values flow from the backend reading.

---

## Summary table — UI element → source field → endpoint → computed where

| UI element | Source field | Endpoint / origin | Computed where |
|---|---|---|---|
| Battery % hero ticker + fill bar | `battery_percent` | `/api/readings/latest` → `mapReading` (`api.ts:43`) | Backend value, passthrough (no client compute) |
| Battery % color tier | `battery_percent` | same | Client: `getBatteryColor`, thresholds 70/30 (`BatteryCard.tsx:20-25`) |
| Battery header icon | `battery_percent` + `battery_status` | same | Client: hardcoded 80/40 + CHARGING (`BatteryCard.tsx:37-43`) |
| Battery "Voltage" metric | `battery_voltage` | same | `formatVoltage` "X.XX V" (`energy.ts:12`) |
| Battery "Status" badge | `battery_status` | same | Raw enum string + style map (`BatteryCard.tsx:82-90`) |
| Chart: Battery Voltage (dash + analytics) | `battery_voltage` | `/api/readings/history` | `Number(v)||0`, domain [6,9] (`transformReadings.ts:64,94`) |
| Chart: Charging Power (dash + analytics) | `charging_power` | `/api/readings/history` | `Number(v)||0` (`transformReadings.ts:67,90`) |
| Charging voltage / current / energy-today | `charging_voltage`, `charging_current`, `charged_energy_today_wh` | parsed but **no UI** | Not rendered anywhere |

---

## Gaps — battery/charging info the UI implies but has no real numeric data source rendered

- **MPPT charging detail.** A "Charging Power" chart implies an MPPT/charging subsystem, but `charging_voltage`, `charging_current`, and `charged_energy_today_wh` are received and cached yet shown nowhere — no charging card, no charged-energy figure. The dashboard surfaces charging *power* only.
- **Battery percent provenance.** Percent is displayed as a precise number with no "Estimated" qualifier (contra CLAUDE.md wording guidance), implying a measured value; it is whatever the backend sends, with no client validation/clamping and no indication it is an estimate without encoder/coulomb feedback.
- **Low / critical battery warning.** The CLAUDE.md "battery voltage below 6.0 V → CRITICAL" rule is implied by the project spec but is **not** implemented in the frontend; the only low-battery signal is a color change and the `LOW` badge color, with no warning text, banner, or threshold for voltage. The `6`/`9` numbers present are only a chart axis domain.
- **Battery percent history.** No chart plots `battery_percent` over time (only voltage), so the historical state-of-charge trend the spec's "voltage + percent" chart implies has no rendered series.
