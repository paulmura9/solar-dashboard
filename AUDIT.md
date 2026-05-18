# LightTrack Code Audit

> **Scope:** Frontend Next.js application at `C:\Users\paulm\Desktop\solar-dashboard`.
> The audit covered every TypeScript, TSX, CSS, SQL, JSON, and Markdown file under
> the repo root and `src/` except `node_modules` and `.next`. The companion firmware
> (ESP32), Pi gateway (Python), and Express REST backend are **not present in this
> repository** and therefore could not be audited; CLAUDE.md describes them as
> separate components.
>
> **Audit date:** 2026-05-13
> **Branch:** `master`
> **Files inspected:** 46 source files

---

## Summary

| Metric | Value |
|---|---|
| Overall quality score | **6.5 / 10** |
| Critical issues | **9** |
| Warning issues | **31** |
| Info issues | **20** |

**One-paragraph verdict.** The codebase has a clean, modular file structure and
the architectural intent matches `CLAUDE.md` (server auth guards, singleton
Supabase client, separation of `lib/`, `hooks/`, `components/`). However, the
implementation has several thesis-level violations of its own rules: zero-valued
real sensor readings are silently rendered as `"—"` (precision loss); five
mapper functions use explicit `any` and provide no fallback for non-nullable
fields; the public sign-up route is still reachable by any visitor; the design
tokens defined in `globals.css` are a light theme while `CLAUDE.md` mandates the
dark palette and tokens are bypassed by hard-coded hex literals throughout; and
`WeatherDataCard` displays a fake "Updated" timestamp computed at render time
rather than at fetch time. Multiple constants are duplicated across pages.
Several unused/dead WeatherData fields exist in the type. None of these issues
would prevent the dashboard from running, but they fall short of the "thesis
quality" bar set by `CLAUDE.md`.

---

## Critical Issues

> Things that will cause bugs, crashes, incorrect data display, or security holes.

### C1 — Public sign-up route is unprotected (security)
- **File:** `src/app/auth/sign-up/page.tsx`, `src/app/auth/sign-up/SignUpForm.tsx`,
  `src/middleware.ts:32-41`, `src/app/login/page.tsx:118-122`
- Middleware matcher excludes `/auth/sign-up`; the login page links to it with
  "Create one". Any anonymous visitor who can reach `/login` can create an
  account on this private IoT controller. Per `FRONTEND_SECURITY_AUDIT.md` S-1
  this was deferred but **no code change has been applied**.
- **Impact:** Unauthorised account creation → ability to issue panel commands
  (MOVE_PANEL, START_TRACKING, etc.) to physical hardware once RLS permits an
  authenticated user to INSERT into `device_commands`.
- **Fix:** Remove the "Create one" link in `src/app/login/page.tsx:118-122`,
  delete `src/app/auth/sign-up/` (or short-circuit the route), and disable
  Email sign-up in the Supabase dashboard.

### C2 — `formatVoltage` / `formatCurrent` / `formatEnergy` treat a real `0` as missing data
- **File:** `src/lib/solar/energy.ts:1-18`
- `isNullOrZero(v)` returns `true` when `v === 0`. As a result, a genuine
  reading of `0 V`, `0 A`, or `0 Wh` is rendered as `"—"` instead of `"0.00 V"`.
  This breaks the "Wording Precision" rule in `CLAUDE.md` ("Always display
  units; never silently substitute"), and is misleading for a thesis: night-time
  solar power is genuinely `0 W` but the dashboard pretends data is missing.
  `formatPower` (lines 25-28) correctly handles `0`, exposing an inconsistency
  within the same module.
- **Fix:** Replace `isNullOrZero` with a strict null/undefined check (`v == null`).

### C3 — `mapReading` / `mapVision` / `mapEvent` / `mapDevice` / `mapCommand` use `any` and have **no fallback** for non-nullable fields
- **File:** `src/lib/api.ts:20-104`
- All five mapper functions declare `(d: any)` (with an `eslint-disable-next-line`
  on every one) and return values like `d.horizontalAngle ?? d.horizontal_angle`.
  If the Express API omits a field (e.g. after a backend schema drift), the
  returned object will have `undefined` for a TypeScript-non-nullable field
  (`SensorReading.horizontal_angle: number`, `SensorReading.tracking_mode: TrackingMode`,
  `SensorReading.is_moving: boolean`, etc.). Downstream consumers
  (`derivePanelMode`, `calculateLightSensorData`, chart math) assume these
  fields exist and will throw `TypeError: Cannot read properties of undefined`
  or silently render `NaN`.
- This is also a direct violation of CLAUDE.md "Every component receives typed
  props, never `any`" and of the boundary-validation rule.
- **Fix:** Use Zod or a hand-written runtime guard; reject the record (or fill
  numeric fields with `null` and widen the types to `number | null`) instead of
  trusting the wire format.

### C4 — `getCommandLabel` and `getBalanceBadgeVariant` silently return `undefined` for unknown values
- **File:** `src/lib/solar/commands.ts:24-33`, `src/lib/solar/status.ts:72-82`
- Both `switch` statements cover all current union members and have no
  `default` arm. Because `tsconfig.json` does not enable `noImplicitReturns`,
  TS does not warn. If the Express backend ever returns a new `command_type`
  value (e.g. `"CALIBRATE"`) it will be typed as `CommandType` at runtime in
  JS but the function returns `undefined`, which then renders as `"undefined"`
  in the badge or table cell.
- **Fix:** Add `default: return commandType;` and enable
  `noImplicitReturns` + `noFallthroughCasesInSwitch` in `tsconfig.json`.

### C5 — `WeatherDataCard` "Updated" timestamp is computed at render, not at fetch
- **File:** `src/components/dashboard/WeatherDataCard.tsx:123-129`
- `Updated {new Date().toLocaleTimeString(...)}` re-evaluates on every render.
  If the weather fetch fails for an hour but the component re-renders for any
  other reason (telemetry tick, prop change), the "Updated" timestamp will
  still show the current minute, falsely indicating fresh data. For a thesis
  IoT dashboard this is misleading.
- **Fix:** Track the fetch timestamp in `useWeatherData` and pass it through
  `WeatherData`.

### C6 — `computeEnergyImpact` contains dead `Math.min` and no input validation
- **File:** `src/app/dirt-detection/page.tsx:37-51`
- `Math.min((dirtPct / 100) * maxLossFactor, maxLossFactor)` is mathematically
  equivalent to the first term whenever `dirtPct ≤ 100` (which `solar/status.ts`
  silently assumes). For `dirtPct > 100` the function caps correctly, but the
  data is never validated. If the Pi sends a `dirt_level_percent` of `150`
  (out of the DB constraint range) the UI will render `"150.0 %"` and the
  energy-loss calculation will still cap, hiding the data quality problem.
- **Fix:** Validate `dirt_level_percent` is in `[0, 100]` at the API boundary
  and either clamp or surface the anomaly.

### C7 — Hard-coded battery / angle chart domains decouple the UI from `solarConfig.ts`
- **File:** `src/app/dashboard/page.tsx:316` (`domain={[6, 9]}`),
  `src/app/dashboard/page.tsx:333` (`domain={[0, 180]}`),
  `src/app/analytics/page.tsx:146` (`domain={[6, 9]}`),
  `src/app/analytics/page.tsx:163` (`domain={[0, 180]}`)
- The battery voltage chart's Y axis is hard-coded to `[6, 9]` even though
  `SOLAR_CONFIG.battery.emptyVoltage = 6.6` and `fullVoltage = 8.4`. The angle
  axes are hard-coded `[0, 180]` despite `SOLAR_CONFIG.panel.minAngle / maxAngle`
  already existing. If anyone changes the calibration constants the charts will
  silently mis-scale. Magic numbers in a thesis dashboard.
- **Fix:** Reference `SOLAR_CONFIG.battery.*` and `SOLAR_CONFIG.panel.*`.

### C8 — `dirtIcon` thresholds (35 %, 20 %) are hard-coded instead of using `SOLAR_CONFIG.dirt`
- **File:** `src/app/dirt-detection/page.tsx:24-30`
- The "cleaning required" icon switches at 35 % and the warning icon at 20 %,
  but `SOLAR_CONFIG.dirt.cleaningRequiredThreshold = 35` and
  `SOLAR_CONFIG.dirt.cleanThreshold = 20` already exist. If the threshold is
  ever tuned, the icon and the colour (`dirtColor`, which **does** use the
  config) will disagree.
- **Fix:** Replace literals with `SOLAR_CONFIG.dirt.cleaningRequiredThreshold` /
  `cleanThreshold`.

### C9 — Mixed-content failure on `/live`: HTTP MJPEG stream embedded in an HTTPS page
- **File:** `src/config/solarConfig.ts:66-68`, `src/app/live/page.tsx:99-101`
- `streamUrl` defaults to `http://192.168.100.145:5000/stream`. When the
  dashboard is served from Vercel over HTTPS, browsers will refuse to load this
  resource (mixed content). The page shows the offline placeholder *only* when
  the device-status check fails; if the API reports the camera as online but the
  `<img>` request is blocked by the browser, the user sees a broken image and
  no error message. Documented in `FRONTEND_SECURITY_AUDIT.md` S-8 as
  informational, but the UI offers no visible cue.
- **Fix:** Detect protocol mismatch on the client and render a clear notice;
  in production, tunnel the stream through an HTTPS reverse proxy.

---

## Warnings

> Things that reduce code quality, maintainability, or correctness without
> immediately breaking the dashboard.

### W1 — `SolarLogo` SVG is duplicated in two files
- `src/components/Sidebar.tsx:23-58` and `src/components/SolarLogo.tsx:1-36`
  contain byte-equivalent SVG markup. Only one of them is the exported
  component used by `/login` and `/auth/sign-up`. The inline copy in `Sidebar`
  should `import { SolarLogo }` from the shared file.

### W2 — `OFFLINE_PLACEHOLDER_DEVICES` is duplicated
- `src/app/dashboard/page.tsx:45-50` (`OFFLINE_PLACEHOLDER_DEVICES`) and
  `src/app/settings/page.tsx:28-33` (`SETTINGS_OFFLINE_DEVICES`) define the same
  four placeholder rows under different names.

### W3 — `DEVICE_DISPLAY` mapping is duplicated
- `src/app/dashboard/page.tsx:38-43` and `src/app/settings/page.tsx:21-26`
  define different but overlapping versions of the same device-to-label/icon
  mapping (dashboard has `iconBg`/`iconColor`, settings does not). The Live
  page does its own one-off lookup (`live/page.tsx:36-40`).

### W4 — Five `eslint-disable-next-line @typescript-eslint/no-explicit-any` in `src/lib/api.ts`
- Violates `CLAUDE.md` "every component receives typed props, never `any`".
  Pair with C3.

### W5 — `globals.css` design tokens do not match `CLAUDE.md`
- `src/app/globals.css:7-28` defines a **light** palette
  (`--background: #eef2f7; --foreground: #1e293b`), but `CLAUDE.md` section
  "Project-Specific Design Tokens" prescribes a **dark** palette
  (`--bg-primary: #0a0e17` etc.). Either the spec or the implementation is
  wrong; either way, the documentation no longer matches the code.

### W6 — Inline hex colours bypass the design tokens
- `text-[#1e293b]`, `bg-[#3b82f6]`, `border-[#e2e8f0]`, etc. appear in **every**
  page and most components (e.g. `src/components/Sidebar.tsx:69-105`,
  `src/components/TopBar.tsx:62-91`, `src/app/dashboard/page.tsx:206-218`).
  Even after fixing W5, swapping themes will require touching dozens of files.

### W7 — `globals.css` body font stack starts with a font that is **not loaded**
- `src/app/globals.css:51` reads
  `font-family: "Geist Mono", var(--font-jetbrains), "JetBrains Mono", ...`
  but only `JetBrains_Mono` is imported in `src/app/layout.tsx:7-10`. The
  browser will fall back to JetBrains Mono via the variable, but the stack is
  misleading: anyone reading the CSS will assume Geist Mono is loaded.

### W8 — `WeatherData` has six fields that are computed but never displayed
- `src/lib/types.ts:101-112`: `temperatureC`, `weatherCode`, `cloudCoverPercent`,
  `rainProbabilityPercent`, `isDaytime`, `efficiencyWarning` are written by
  `getSunToday` (`src/lib/api.ts:193-204`) and never read anywhere in the
  components. `weatherStatus` is used only as a lookup key for the
  `CONDITION_NOTES` map in `WeatherDataCard`. This is dead data being shipped
  on every weather refresh.

### W9 — `useInactivitySignOut` only fires on mount, never while the tab is idle
- `src/hooks/useInactivitySignOut.ts:12-33` reads `localStorage` once on mount.
  If a user opens the dashboard and never closes the tab, no event ever
  re-evaluates the inactivity threshold. The 8-hour timeout cannot fire until
  the next page load.
- **Fix:** Add a `setInterval` (e.g. 60 s) inside the effect to re-check the
  stored timestamp.

### W10 — TopBar's user identity comes from `getSession()`, not `getUser()`
- `src/components/TopBar.tsx:28-34`. `getSession` returns the cookie payload
  without round-tripping to Supabase Auth, so a tampered cookie could display a
  spoofed name/email. Display-only impact, but inconsistent with the
  middleware/layout pattern.

### W11 — `useStaleTelemetry` ticks every second even when the threshold is 30 s
- `src/hooks/useStaleTelemetry.ts:18-22`. The `setInterval(setNow, 1_000)`
  triggers ~30 unnecessary re-renders before staleness can transition.
  Refresh interval should be ≥ thresholdMs / 6, or it should listen only to
  `visibilitychange` and recompute on next render.

### W12 — No timeout / `AbortController` on Open-Meteo fetch
- `src/lib/api.ts:175-209`. A hung connection will pile up promises forever.
  Should use `AbortController` with a 5–10 s deadline.

### W13 — Hard-coded `limit=500` in `getReadingsHistory`
- `src/lib/api.ts:118-125`. A 7-day range (Analytics page) requests 500 rows
  but only 168 hours × 12 readings/h = 2,016 rows actually exist. The limit
  silently truncates the dataset → the 7-day chart shows ~25 % of the data.

### W14 — Dashboard fetches 10 recent events but the project brief says 20
- `src/app/dashboard/page.tsx:102`. `FRONTEND_PROJECT_BRIEF.md:432-438`
  describes "last 20 system_events entries". The intent is ambiguous; either
  the doc or the code is wrong.

### W15 — `cn` import not strictly necessary in `src/app/layout.tsx`
- `src/app/layout.tsx:4,19`: `cn(jetbrainsMono.variable)` collapses to a
  single class; `jetbrainsMono.variable` already returns a string. `cn` is
  doing nothing useful here.

### W16 — `getReadingsHistory` defensive-copy is redundant
- `src/app/analytics/page.tsx:55` and `src/app/dashboard/page.tsx:106-108`
  wrap `getReadingsHistory` results in `Array.isArray(...)` checks even though
  the function is already typed to return `SensorReading[]` and **does**
  return `[]` on null. Pure noise.

### W17 — `setTimeout(fn, 0)` used as a hydration crutch in three pages
- `src/app/analytics/page.tsx:64`, `src/app/dirt-detection/page.tsx:87`,
  `src/app/live/page.tsx:32`, `src/app/settings/page.tsx:56`,
  `src/hooks/useWeatherData.ts:17`. None of these need to defer execution; the
  pattern hides the real intent (avoid a hydration race), which would be
  better solved with `useEffect` alone (already used).

### W18 — `if (!mounted) return null` discards the SSR/streaming benefit
- `src/app/dashboard/page.tsx:182`, `src/app/analytics/page.tsx:82`. Each page
  manually re-implements "hydrate-then-render" with a `useState(false)` flag.
  This causes a flash-of-empty-page on every navigation and disables any
  loading skeleton until React reconciles client-side.

### W19 — `dispatchAndRefresh` in `/control` ignores the dispatch's failure result
- `src/app/control/page.tsx:84-87`. `await action()` returns void; we cannot
  tell if the command was queued or rejected before `refreshCommands()` runs.
  Result feedback only comes via the shared `lastResult` state. Fine, but the
  history table may refresh on a no-op.

### W20 — `SignUpForm` validation is partly redundant
- `src/app/auth/sign-up/SignUpForm.tsx:22-33`. The `email.trim() === ""` check
  is unreachable: the `<input required>` attribute and `type="email"`
  prevent empty submits. The minimum-password-length literal `6` is a magic
  number unrelated to Supabase's actual rule (configurable in dashboard).

### W21 — `TopBar` initials fallback hard-codes "P"
- `src/components/TopBar.tsx:55`. `initials = userName ? ... : "P"`.
  This is the developer's initial leaking into the UI for any signed-out
  edge case.

### W22 — `ErrorBoundary` recovery is a full page reload
- `src/components/ErrorBoundary.tsx:30-35`. `window.location.reload()` is
  brutal and unnecessary; resetting the boundary state via a key bump suffices
  and preserves auth context.

### W23 — `ErrorBoundary` swallows the error without logging
- `src/components/ErrorBoundary.tsx`. No `componentDidCatch`, so production
  errors never reach the console or any telemetry sink.

### W24 — Login page calls `supabase.auth.signOut()` unconditionally before sign-in
- `src/app/login/page.tsx:22`. This is justified (clears stale tokens) but
  causes an extra network round-trip and emits an unnecessary `SIGNED_OUT`
  auth event for valid first-time sign-ins.

### W25 — `useCommandHistory` keeps a global `setInterval` even when the page is hidden
- `src/hooks/useCommandHistory.ts:28-33`. Polling continues in background
  tabs. Consider gating with `document.visibilityState`.

### W26 — `Sidebar` `suppressHydrationWarning` on every Link masks real warnings
- `src/components/Sidebar.tsx:73-103`. The flag silences React's hydration
  diagnostics on the whole nav, which means any future genuine mismatch in a
  nav item will go undetected. The underlying cause (active-link prop changing
  between server and client render) should be addressed by always treating the
  sidebar as client-only (already `"use client"`, so the flag may be unnecessary).

### W27 — `commands.length === 0` after `useCommandHistory` first render shows
  "No commands sent yet" even while loading
- `src/app/control/page.tsx:200`. The hook starts with `commands: []`; there
  is no loading flag. The empty state and a network-error empty state are
  indistinguishable to the user.

### W28 — `useApiToken` returns `""` instead of `null`
- `src/hooks/useApiToken.ts:24`. Empty string is a "falsy non-null" value;
  every caller writes `if (!token)`. Returning `null` would surface intent in
  TypeScript and let `apiFetch` enforce `token: string` non-empty.

### W29 — `apiFetch` redirects to `/login` from inside the fetcher
- `src/lib/backendClient.ts:23-29`. Side effect from a library function. An
  in-flight fetch that resolves after the user clicks Sign Out will trigger a
  surprise navigation. Better delivered via an auth-listener at the page or
  shell level.

### W30 — `Open-Meteo` URL is constructed by hand-concatenation
- `src/lib/api.ts:178-183`. Fine for trusted constants, but if
  `SOLAR_CONFIG.weather.timezone` is ever sourced from user input this is an
  injection vector. Use `URLSearchParams`.

### W31 — `dispatch` race in `usePanelCommands` clears `lastResult` after 4 s globally
- `src/hooks/usePanelCommands.ts:53-59`. Successive dispatches restart the
  same timer; if dispatch A succeeds and dispatch B fails 3.9 s later, the
  failure banner disappears 0.1 s later. The cooldown is per-command but the
  feedback timer is global.

---

## Info

> Minor improvements, style inconsistencies, naming suggestions.

### I1 — `package.json` `lint` script lacks a target
- `package.json:9`: `"lint": "eslint"`. Without a path or glob, ESLint
  defaults to scanning everything not in `.eslintignore`. Explicit `"eslint ."`
  or `"eslint src/"` documents intent.

### I2 — `README.md` is the unmodified `create-next-app` boilerplate
- Contains no project information, no architecture diagram, no run instructions
  specific to the solar tracker.

### I3 — `lucide-react: "^1.14.0"` may be wrong
- `package.json:21`. Current Lucide React is 0.x (e.g. 0.460.0). Either the
  lockfile resolves to something else, or this is a typo.

### I4 — `radix-ui: "^1.4.3"` is the meta-package
- `package.json:23`. The shadcn convention is to depend on `@radix-ui/react-slot`
  etc. individually. Using the umbrella package pulls in everything.

### I5 — `tsconfig.json` does not enable strictness extras
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes` are all off.
  These would catch issues C4, plus several dead-code items below.

### I6 — `eslint.config.mjs` does not add any project rules
- `eslint.config.mjs:5-16` only extends Next defaults. No rule for
  `no-unused-vars`, `no-explicit-any`, or React hooks `exhaustive-deps` is
  explicitly enabled, leaving the codebase as flag-permissive as possible.

### I7 — `formatAngle` always shows one decimal
- `src/lib/solar/energy.ts:20-23`. `formatAngle(90)` returns `"90.0°"`.
  Servo angles are integers (DB constraint 0-180 step 1); the decimal is
  visual noise.

### I8 — `getCommandLabel` could be a constant map
- `src/lib/solar/commands.ts:24-33`. A `Record<CommandType, string>`
  removes the exhaustiveness ambiguity (see C4) and reduces six branches to
  a one-liner.

### I9 — `solarConfig.ts` emits `console.warn` at module load
- `src/config/solarConfig.ts:9-13`. The warning fires every time the module
  is imported in dev mode (HMR can re-execute). Guard with
  `process.env.NODE_ENV !== "production"` or relocate to the consuming page.

### I10 — `parseFloat` vs `Number.parseFloat`
- `src/config/solarConfig.ts:6-7`. Cosmetic; modern code conventionally uses
  `Number.parseFloat`.

### I11 — `parseSubsystem` does not handle empty or non-ASCII event types
- `src/app/dashboard/page.tsx:59-62`. `"".split("_")[0]` is `""` →
  `charAt(0)` is `""` → returns `""`. Empty cell in the table; harmless but
  could be `"—"`.

### I12 — `localStorage` is referenced without `typeof window` guards
- `src/hooks/useInactivitySignOut.ts:13-23`, `src/components/TopBar.tsx:48`.
  Acceptable because both run inside client-only `useEffect`/`async` handlers,
  but a future SSR conversion would break.

### I13 — `dispatch` cooldown timers leak references after unmount until they expire
- `src/hooks/usePanelCommands.ts:35-40`. The cleanup clears any pending
  cooldown timers - actually fine on re-check; remove this item if it
  reproduces clean. (Verified: cleanup on unmount clears all timers; OK.)

### I14 — `EventLog` column wording uses "Subsystem"
- `src/app/dashboard/page.tsx:255`. `parseSubsystem` returns the first
  capitalised word of `event_type`. Naming is acceptable but the heading
  "Subsystem" suggests a stable category like "Tracking" / "Power" rather
  than a Levenshtein-of-whatever-came-first.

### I15 — `cn` in `src/lib/utils.ts` is the only utility in that file
- Could co-locate with the design-token re-exports once tokens are unified.

### I16 — `MetricRow` uses `last:border-0` to hide the trailing border
- `src/components/dashboard/MetricRow.tsx:10`. Fine, but the visual gap before
  the badge in `BatteryCard` looks unbalanced.

### I17 — `DPad` "centre" cell renders a decorative dot
- `src/components/dashboard/DPad.tsx:36-38`. A user might mistake it for a
  clickable button. A subtler visual marker or an aria-hidden hint helps.

### I18 — `Sidebar` and `SolarLogo` use slightly different SVG viewBox spacing
- Wait, identical. (No issue. Already covered by W1.)

### I19 — `framer-motion` imports differ between files
- `src/components/AzimuthView.tsx:3` (`from "framer-motion"`),
  `src/components/magic/BorderBeam.tsx:3` (`from "framer-motion"`,
  inline `type MotionStyle, type Transition`). Style-only.

### I20 — `Card` `hover:border-[#3b82f6]` applies a colour change even on cards that should not look interactive
- `src/components/ui/card.tsx:15`. Non-clickable cards (dashboard data cards)
  visually invite a click. Either remove the hover effect or make cards
  clickable.

---

## Dead Code Report

> Functions, variables, constants, imports declared but never used.

| File | Line(s) | Symbol | Note |
|---|---|---|---|
| `src/lib/types.ts` | 101-112 | `WeatherData.temperatureC`, `weatherCode`, `cloudCoverPercent`, `rainProbabilityPercent`, `isDaytime`, `efficiencyWarning` | Written by `getSunToday` (`src/lib/api.ts:193-204`) but never read in any component. (See W8.) |
| `src/lib/api.ts` | 4-7 | `getEfficiencyWarning` is imported and called, but the resulting `efficiencyWarning` value is never displayed | Dead data path |
| `src/lib/types.ts` | 123-153 | `Database` interface | Never imported anywhere in the project (verified by grep). Holdover from a previous "use generated DB types" design. |
| `src/components/Sidebar.tsx` | 23-58 | Inline `SolarLogo` component | Duplicate of exported `src/components/SolarLogo.tsx`. Remove the inline copy and import the shared component. |
| `src/app/dirt-detection/page.tsx` | 37 | `lossFactor` returned but never displayed as an isolated number; only used to compose other values inside `computeEnergyImpact`. (Used in line 192.) | OK on re-read; remove from this list. |
| `src/lib/solar/energy.ts` | 1-3 | `isNullOrZero` private helper | Used by three callers but flawed (see C2). Remove once C2 is fixed. |
| `src/hooks/usePanelCommands.ts` | 32 | `timerRef` value never cleared in the cleanup (cleanup only clears cooldown timers) | Actually cleared at line 36; OK. |
| `src/app/page.tsx` | 1-29 | Server-side redirect duplicates the `dashboard/layout.tsx` auth check | Not dead per se, but redundant: the layout would redirect to `/login` anyway. Could simplify to `redirect("/dashboard")` and let the layout handle the unauth case. |
| `src/lib/api.ts` | 106-110 | `ApiResponse<T>` interface field `total?: number` | Declared but never read by any caller. |
| `src/app/dirt-detection/page.tsx` | 32-35 | `fmt(value, decimals = 1)` helper | Local; duplicates a one-line `value.toFixed`. Could be inlined or shared with the existing `formatPower` family. |
| `src/lib/solar/commands.ts` | 20-22 | `buildSetModePayload(mode)` returns `{ mode }` | Trivial wrapper; could be inlined at the single call site (`usePanelCommands.ts:82`). |
| `src/components/dashboard/WeatherDataCard.tsx` | 22-28 | `roundToHalfHour` is only called by `computePeakHours` (same file) | OK, but local-only — fine. |

---

## Redundancy Report

| Where | What | Resolution |
|---|---|---|
| `src/components/Sidebar.tsx:23-58` vs `src/components/SolarLogo.tsx:1-36` | Byte-equivalent inline SVG component | Import the shared component |
| `src/app/dashboard/page.tsx:45-50` vs `src/app/settings/page.tsx:28-33` | `OFFLINE_PLACEHOLDER_DEVICES` vs `SETTINGS_OFFLINE_DEVICES` | Move to `src/config/devices.ts` |
| `src/app/dashboard/page.tsx:38-43`, `src/app/settings/page.tsx:21-26`, `src/app/live/page.tsx:36-40` | `DEVICE_DISPLAY` partials | Consolidate to one source of truth |
| `src/app/dashboard/page.tsx:33-36` vs `src/app/analytics/page.tsx:25-28` | `CHART_TOOLTIP_STYLE` / `CHART_TOOLTIP` | Extract to `src/lib/solar/chart.ts` |
| `src/app/dashboard/page.tsx:153-168` vs `src/app/control/page.tsx:63-71` | Identical Realtime subscription pattern on `sensor_readings` | Extract a `useRealtimeReadings(onInsert)` hook |
| `src/components/dashboard/SolarProductionCard.tsx` and `BatteryCard.tsx` | Hero metric pattern (NumberTicker + unit + fallback `"—"`) | Could be a `<HeroMetric value={...} unit="W" />` component |
| `src/app/login/page.tsx:38-49` and `src/app/auth/sign-up/SignUpForm.tsx:57-65` | Brand header + tagline JSX | Extract `<AuthHeader />` |
| `src/app/login/page.tsx:54` and `SignUpForm.tsx:67` | "Green gradient accent bar" inline div | Extract to a constant or component |
| `src/app/dirt-detection/page.tsx:301-306` and `:152-160` | "Required / Clean" badge styles inline; same colours hard-coded twice | Reuse `STATUS_STYLE` style map from `/control` |
| `src/app/dashboard/page.tsx:52-57` and `src/app/control/page.tsx:26-31` | `SEVERITY_BADGE` / `STATUS_STYLE` colour maps with same colour values | Move colour map to `src/lib/solar/status.ts` |
| `src/lib/api.ts:20-104` | Five mapper functions follow the same `field ?? field_snake` pattern | A single generic mapper + a key-translation table would dedupe substantially |

---

## Security Report

| Severity | File | Issue |
|---|---|---|
| **High** | `src/app/auth/sign-up/*`, `src/middleware.ts:32-41` | C1 — Public sign-up reachable without authorisation (see Critical Issues) |
| Medium | `src/config/solarConfig.ts:66-68`, `src/app/live/page.tsx:99` | C9 — Mixed-content stream URL with hard-coded Pi LAN address `192.168.100.145:5000` (also discloses internal topology, minor info leak) |
| Medium | `src/components/TopBar.tsx:28-34` | W10 — User identity from unverified `getSession()` (display only) |
| Low | `src/lib/api.ts:175-209` | W12 — Open-Meteo fetch has no timeout/AbortController; long-lived hung connections possible |
| Low | `src/app/auth/sign-up/SignUpForm.tsx:18-34` | W20 — No rate limiting, no captcha, no email verification gate before redirect; password min length hard-coded (6) decoupled from Supabase dashboard config |
| Low | `src/lib/backendClient.ts:23-29` | W29 — 401 handler triggers `window.location.replace` from inside a network library; side-effectful and surprising |
| Low | `src/lib/api.ts:20-104` | C3 — No runtime validation of API responses; trusts whatever the Express backend sends |
| Info | `src/app/settings/page.tsx:35-37` | Renders `NEXT_PUBLIC_SUPABASE_URL` domain prefix in the UI; intentional, but worth confirming the project name is not sensitive |
| Info | `.env.local` | Present on disk; correctly gitignored. Not committed. Verified `.gitignore` contains `*.env*` family. |
| Info | `.mcp.json` | Contains MCP server URL only; no secrets. |

No service-role keys, database passwords, JWT signing secrets, or MQTT
credentials are present in the frontend. RLS posture is documented in
`RLS_AUDIT_CHECKLIST.md` and `RLS_RECOMMENDED_POLICIES.sql` but the *actual*
policies on the Supabase project cannot be verified from source code alone —
the checklist must be run manually.

---

## Per-File Breakdown

| File | Status | Notes |
|---|---|---|
| `package.json` | Needs attention | I1 (lint target), I3 (lucide-react version), I4 (radix-ui umbrella package). |
| `tsconfig.json` | Needs attention | I5 — Enable `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. |
| `eslint.config.mjs` | Needs attention | I6 — no explicit project rules; the `no-explicit-any` violations in `src/lib/api.ts` are not flagged. |
| `next.config.ts` | Clean | Security headers correctly applied. |
| `postcss.config.mjs` | Clean | One-line Tailwind plugin. |
| `components.json` | Clean | shadcn config. |
| `README.md` | Needs attention | I2 — boilerplate, not project-specific. |
| `CLAUDE.md` / `AGENTS.md` / `SKILL.md` | Clean | Source of truth for the project. |
| `FRONTEND_PROJECT_BRIEF.md` | Needs attention | Notes `src/lib/supabase.ts` as orphan and `src/proxy.ts` as passthrough; both files **no longer exist** in the tree. Doc is stale. |
| `FRONTEND_SECURITY_AUDIT.md` | Clean | Up to date but defers S-1 (sign-up). |
| `RLS_AUDIT_CHECKLIST.md` / `RLS_RECOMMENDED_POLICIES.sql` | Clean | Solid checklist. |
| `.env.example` / `.env.local.example` | Needs attention | Two example files diverge (`.env.example` has the location vars and full docs; `.env.local.example` is missing them). Keep only one. |
| `src/middleware.ts` | Clean | Standard Supabase SSR auth check; matcher list is correct except for explicitly omitting `/auth/sign-up` (deferred, see C1). |
| `src/app/layout.tsx` | Clean | W15 (`cn` is redundant). |
| `src/app/globals.css` | Needs attention | W5 (light theme conflicts with `CLAUDE.md`), W7 (Geist Mono listed but not loaded). |
| `src/app/page.tsx` | Clean | Server-side redirect; minor redundancy with `dashboard/layout.tsx`. |
| `src/app/dashboard/layout.tsx` | Clean | Standard server auth guard. |
| `src/app/dashboard/page.tsx` | **Needs attention** | W14 (events count), W18 (`!mounted` flash), W26 (hover styles), C7 (hardcoded chart domains), `useEffect [] deps` consumes `fetchAllRef`, duplicated maps (W2, W3). |
| `src/app/analytics/page.tsx` | Needs attention | W13 (limit=500 truncates 7-day data), W17 (`setTimeout(fn,0)`), C7 (hardcoded domains), missing error UI when API returns null. |
| `src/app/control/page.tsx` | Needs attention | W27 (no loading flag distinguishes empty vs loading), duplicated Realtime pattern with dashboard, repeated 90-default fallback for angles. |
| `src/app/dirt-detection/page.tsx` | **Needs attention** | C6 (`Math.min` dead arm, no input validation), C8 (hard-coded threshold 35/20), local `fmt` helper duplicates formatting utilities. |
| `src/app/live/page.tsx` | Needs attention | C9 (mixed-content), W3 (DEVICE_DISPLAY partial). |
| `src/app/login/page.tsx` | Needs attention | W24 (unconditional signOut before signIn), still links to sign-up despite security audit S-1. |
| `src/app/auth/sign-up/page.tsx` + `SignUpForm.tsx` | **Critical** | C1 — Route should be removed or middleware-protected; W20 — validation hygiene; no anti-bot. |
| `src/app/settings/page.tsx` | Needs attention | W2 / W3 (duplication), `data.length` check doesn't fall back the way `dashboard/page.tsx` does (placeholder logic differs). |
| `src/components/DashboardShell.tsx` | Clean | Single responsibility, simple. |
| `src/components/Sidebar.tsx` | Needs attention | W1 (inline SolarLogo duplicates exported one), W26 (`suppressHydrationWarning` is excessive). |
| `src/components/TopBar.tsx` | Needs attention | W10 (`getSession` for identity), W21 (initials default "P"), no Escape/aria-menu support on dropdown. |
| `src/components/ErrorBoundary.tsx` | Needs attention | W22 (full reload), W23 (no `componentDidCatch` logging). |
| `src/components/SolarLogo.tsx` | Clean | Exported version is correct; the duplicate is in Sidebar (W1). |
| `src/components/StaleDataBanner.tsx` | Clean | Small, focused, accessible (`role="alert"`). |
| `src/components/AzimuthView.tsx` | Clean | Self-contained SVG component; magic `45/135/225/315` and trig literals are typical for compass rendering. |
| `src/components/ElevationView.tsx` | Needs attention | Static "90°" label is hard-coded regardless of actual angle; comment "servo 90 = horizontal" should match the arc label dynamically. |
| `src/components/dashboard/SolarProductionCard.tsx` | Clean | |
| `src/components/dashboard/BatteryCard.tsx` | Clean | `STATUS_STYLES` colour map is local; could share with command STATUS_STYLE (Redundancy Report). |
| `src/components/dashboard/TrackingStatusCard.tsx` | Clean | |
| `src/components/dashboard/LightSensorsCard.tsx` | Clean | |
| `src/components/dashboard/LdrSensorCell.tsx` | Clean | |
| `src/components/dashboard/MetricRow.tsx` | Clean | |
| `src/components/dashboard/PanelControlCard.tsx` | Clean | |
| `src/components/dashboard/DPad.tsx` | Clean | I17 (centre-cell decorative dot looks clickable). |
| `src/components/dashboard/WeatherDataCard.tsx` | **Needs attention** | C5 (fake `Updated` timestamp), W8 (six WeatherData fields never read in this file). |
| `src/components/magic/BorderBeam.tsx` | Clean | shadcn/magic-ui copy. |
| `src/components/magic/NumberTicker.tsx` | Clean | |
| `src/components/magic/ShimmerButton.tsx` | Clean | |
| `src/components/ui/badge.tsx` | Clean | shadcn-generated. |
| `src/components/ui/button.tsx` | Clean | shadcn-generated. |
| `src/components/ui/card.tsx` | Needs attention | I20 (hover border colour on non-interactive cards). |
| `src/components/ui/skeleton.tsx` | Clean | |
| `src/components/ui/table.tsx` | Clean | |
| `src/config/solarConfig.ts` | Clean | I9 (warn at import), I10 (style). Otherwise well-organised. |
| `src/hooks/useApiToken.ts` | Clean | W28 (return `null` instead of `""`). |
| `src/hooks/useCommandHistory.ts` | Clean | W25 (no visibility gating). |
| `src/hooks/useInactivitySignOut.ts` | Needs attention | W9 — never re-checks while tab is open. |
| `src/hooks/usePanelCommands.ts` | Clean | W31 (global feedback timer, per-command cooldown). |
| `src/hooks/usePanelStatus.ts` | Clean | Pure derived hook. |
| `src/hooks/useStaleTelemetry.ts` | Needs attention | W11 (1 s tick is wasteful for 30 s threshold). |
| `src/hooks/useWeatherData.ts` | Clean | W17 (`setTimeout(fn,0)`). |
| `src/lib/api.ts` | **Needs attention** | C3 (mappers + `any`), C5 (timestamp source), W4 (eslint-disables), W12 (no timeout), W13 (limit=500), W30 (URL concat). |
| `src/lib/backendClient.ts` | Needs attention | W29 (in-function redirect), no retry policy. |
| `src/lib/types.ts` | Needs attention | W8 (six dead fields in `WeatherData`), `Database` interface unused. |
| `src/lib/utils.ts` | Clean | Single helper. |
| `src/lib/supabase/client.ts` | Clean | Correct singleton. |
| `src/lib/solar/chart.ts` | Clean | Simple downsample; could throw if maxPoints ≤ 0 (passed only from `SOLAR_CONFIG.chart.*`, so OK). |
| `src/lib/solar/commands.ts` | Needs attention | C4 (no default in `getCommandLabel`), I8 (could be a const map). |
| `src/lib/solar/energy.ts` | **Needs attention** | C2 (`isNullOrZero` corrupts real zero readings), `formatPower` style-inconsistent with the other three formatters (uses different null check). |
| `src/lib/solar/status.ts` | Needs attention | C4 (no default in `getBalanceBadgeVariant`), `derivePanelMode` falls through any unknown `tracking_mode` to "TRACKING" silently. |
| `src/lib/solar/weather.ts` | Clean | |

---

## Recommended Fixes (Priority Order)

The list is ordered most-impactful → least, with the file references for each
fix. Numbering does not imply dependency; items can be done in parallel.

### Tier 1 — Must Fix Before Any Public Demo

1. **Close the public sign-up route (C1).** Remove the link in
   `src/app/login/page.tsx:118-122`, delete the route directory
   `src/app/auth/sign-up/`, and add a Supabase dashboard setting to disable
   Email sign-up. Without this, anyone who reaches the URL can issue panel
   commands.
2. **Fix `isNullOrZero` so real zero readings render correctly (C2).** Change
   the three formatters in `src/lib/solar/energy.ts:5-18` to use a strict
   `value == null` check. This is a one-line change with high visibility:
   a thesis dashboard cannot lie about zero readings.
3. **Validate API responses in `src/lib/api.ts` (C3 + W4).** Replace the five
   `any` mappers (lines 20-104) with Zod schemas (or hand-written guards) so a
   missing `tracking_mode` / `horizontal_angle` does not crash downstream
   consumers. Same change removes all five `eslint-disable-next-line` comments.

### Tier 2 — Correctness and Precision

4. **Replace hard-coded chart domains and dirt thresholds with `SOLAR_CONFIG`
   references (C7 + C8).** Affects `src/app/dashboard/page.tsx:316,333`,
   `src/app/analytics/page.tsx:146,163`, `src/app/dirt-detection/page.tsx:24-30`.
5. **Compute the "Weather updated" timestamp at fetch time, not render time
   (C5).** Update `useWeatherData` to return `{ data, fetchedAt }` and pass
   `fetchedAt` to `WeatherDataCard`.
6. **Add `default:` arms to `getCommandLabel` and `getBalanceBadgeVariant`
   (C4)** and enable `noImplicitReturns` + `noFallthroughCasesInSwitch` in
   `tsconfig.json`.
7. **Add a `default:` / unknown-handling path to `derivePanelMode`** so an
   unknown `tracking_mode` is rendered visibly rather than silently mapped to
   "TRACKING" (`src/lib/solar/status.ts:50-59`).
8. **Validate `dirt_level_percent` is `[0, 100]` and `confidence` is `[0, 1]`
   at the API boundary** (`src/lib/api.ts:52-64`). Pair with C3.

### Tier 3 — Dead Code and Duplication

9. **Delete the inline `SolarLogo` in `Sidebar.tsx:23-58`** and import the
   shared `src/components/SolarLogo.tsx` (W1).
10. **Hoist `OFFLINE_PLACEHOLDER_DEVICES` and `DEVICE_DISPLAY` to one shared
    file** (e.g. `src/config/devices.ts`) (W2 + W3).
11. **Extract the Supabase Realtime subscription used by `/dashboard` and
    `/control` into `useRealtimeReadings(onInsert)`** (`src/app/dashboard/page.tsx:153-168`,
    `src/app/control/page.tsx:63-71`).
12. **Remove the six unused `WeatherData` fields** (`src/lib/types.ts:101-112`,
    `src/lib/api.ts:193-204`) or surface them in the UI. The current state
    is paying network and parsing cost for nothing (W8).
13. **Remove `Database` interface from `src/lib/types.ts:123-153`** if it
    will not be wired up to typed Supabase queries.
14. **Refactor login/sign-up brand header into `<AuthHeader />`** and the
    severity / command / dirt status colour maps into `src/lib/solar/status.ts`
    (Redundancy Report).

### Tier 4 — Reliability and UX

15. **Re-evaluate inactivity inside the tab (W9).** Add a periodic check inside
    `useInactivitySignOut.ts` so the 8-hour timeout can fire without a page
    reload.
16. **Throttle `useStaleTelemetry` to ≥ thresholdMs / 6 (W11).** Reduce
    re-renders.
17. **Add `AbortController` + 8-s timeout to `getSunToday` and `apiFetch`
    (W12).** Prevent hung sockets.
18. **Replace the hard-coded `limit=500` in `getReadingsHistory` with a value
    derived from the requested time range (W13).**
19. **Add `componentDidCatch` to `ErrorBoundary` (W23)** so production errors
    are at least logged once.
20. **Replace `window.location.reload()` in `ErrorBoundary` with a reset
    callback that bumps a `resetKey` (W22).**
21. **Stop calling `supabase.auth.signOut()` unconditionally on the login page
    (W24).** Only sign out if a stale session is detected.
22. **Move the 401 redirect out of `apiFetch` into a page-level effect
    (W29)** to avoid surprise navigations from a library function.

### Tier 5 — Style, Documentation, Tooling

23. **Decide on light vs dark theme and align `globals.css` with `CLAUDE.md`
    (W5).** Either update the spec or apply the dark palette and migrate the
    inline hex literals to CSS variables (W6).
24. **Fix the font stack in `globals.css:51` (W7).** Remove `"Geist Mono"`
    unless it is actually loaded, or load it via `next/font`.
25. **Enable `noUnusedLocals`, `noUnusedParameters`, and `noImplicitReturns`
    in `tsconfig.json` (I5)** and add `no-explicit-any` to the ESLint config
    (I6).
26. **Replace the boilerplate `README.md`** (I2) with project-specific
    content: architecture diagram, env-var list, dev/prod commands.
27. **Reconcile `.env.example` vs `.env.local.example` (per-file row).** Keep
    one canonical file.
28. **Update `FRONTEND_PROJECT_BRIEF.md`** to remove references to
    `src/lib/supabase.ts` and `src/proxy.ts`, which no longer exist.
29. **Verify `lucide-react: ^1.14.0` and `radix-ui: ^1.4.3`** in
    `package.json` resolve to the intended packages (I3 + I4).
30. **Provide a real keyboard-accessible menu for the TopBar dropdown
    (W21, A11Y).** Add `role="menu"`, Escape to close, arrow-key navigation.

---

### Quality score rubric

- **Correctness:** 6/10 — the dashboard runs, but C2/C5/C7 produce visibly
  wrong values in expected states.
- **Architecture:** 8/10 — `hooks/`, `lib/solar/`, `config/` are clean and
  focused; few files exceed 200 lines; concerns are well-separated.
- **Type discipline:** 5/10 — five mappers use `any` at the most important
  boundary; non-nullable types are not enforced at runtime.
- **Security:** 6/10 — secrets handling is correct, RLS docs exist; the
  unfixed sign-up route is the major outstanding item.
- **Adherence to `CLAUDE.md`:** 6/10 — many anti-AI-slop rules are honoured;
  multiple are broken (any, magic numbers, duplicate code, dead WeatherData
  fields, design tokens not applied).

**Weighted overall: 6.5 / 10.** Solid bones; the gaps are the kind a thesis
reviewer will notice on a careful read.
