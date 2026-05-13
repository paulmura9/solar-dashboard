# Frontend Security Audit — LightTrack Solar Dashboard

**Date:** 2026-05-13  
**Scope:** Next.js 16 frontend at `C:\Users\paulm\Desktop\solar-dashboard`  
**Auditor:** Claude Code (automated + manual inspection)  
**Branch:** `master` (HEAD `0ccf969`)

---

## Executive Summary

The frontend is a well-structured Next.js 16 App Router application using Supabase Auth (email/password, cookie-based sessions) and a separate Express REST backend on Railway. The overall security posture is **moderate**. No service-role keys, database passwords, or private secrets are present in the frontend code or committed to git. The authentication implementation is correct — middleware uses `getUser()` (server-validated) not a raw JWT decode.

The most impactful issues are:

1. **Open public sign-up** — any visitor can create an account on this private IoT dashboard.
2. **Missing security headers** — no `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`.
3. **No stale data warning** — the UI shows cached telemetry without flagging how old it is when the gateway is offline.
4. **Session cache not cleared on logout** — `sessionStorage` data persists until TTL expiry after a user signs out.
5. **Missing `.env.example`** — new deployments have no reference for required environment variables.

Three of these have been fixed directly in this commit. The remaining issues are documented with recommended fixes below.

---

## Issue Index

| # | Title | Severity | Status |
|---|-------|----------|--------|
| S-1 | Open public sign-up | **High** | **Deferred** |
| S-2 | Missing security headers | **Medium** | **Fixed** |
| S-3 | No stale data / last-seen warning | **Medium** | **Fixed** |
| S-4 | Session cache not cleared on logout | **Low** | **Fixed** |
| S-5 | Missing `.env.example` | **Low** | **Fixed** |
| S-6 | Hardcoded camera stream fallback URL | **Low** | Informational |
| S-7 | Hardcoded installation coordinates | **Low** | **Fixed** |
| S-8 | HTTP camera stream (mixed content) | **Low** | Informational |
| S-9 | No rate limiting on command buttons | **Low** | **Fixed** |
| S-10 | Supabase RLS not auditable from frontend | **Unknown** | **Documented** |

---

## 1. Secrets Exposure

### Findings

**No secrets are committed to the repository.**

- `.gitignore` contains `.env*`, which correctly excludes all env files from git.
- `.env.local` is present on disk but is not tracked by git.
- No service role key, database password, JWT signing secret, MQTT password, or admin token is present in any source file.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only Supabase credentials referenced in frontend code. Both are intentionally public (anon key grants only RLS-filtered access; the URL is not a secret).
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CAMERA_STREAM_URL` are public environment variables. Neither contains credentials.

**One low-risk hardcoded value:**

`src/config/solarConfig.ts:49`:
```ts
streamUrl: process.env.NEXT_PUBLIC_CAMERA_STREAM_URL ?? "http://192.168.100.145:5000/stream",
```
This is a local LAN address used as a dev fallback. It is not a secret, but it does disclose the Pi's local IP. The `NEXT_PUBLIC_CAMERA_STREAM_URL` env var should always be set in production to avoid using the hardcoded fallback.

**Hardcoded installation coordinates** in `src/config/solarConfig.ts` — now read from `NEXT_PUBLIC_LOCATION_LAT` / `NEXT_PUBLIC_LOCATION_LON` with fallback to the original values. See S-7.

### Status: No action required for secrets. See S-5 for `.env.example`.

---

## 2. Authentication Flow

### What exists

- **Auth provider:** Supabase Auth (email/password, `signInWithPassword`)
- **Session storage:** HTTP-only cookies managed by `@supabase/ssr` — correct pattern
- **Server-side validation:**
  - `src/middleware.ts` calls `supabase.auth.getUser()` — this validates the session token against the Supabase Auth server, not merely decodes a JWT client-side. This is the secure pattern.
  - `src/app/dashboard/layout.tsx` performs a second redundant check with `getUser()` — belt-and-suspenders, good.
  - `src/app/page.tsx` redirects authenticated users to `/dashboard` and unauthenticated to `/login`.
- **Protected routes** (middleware matcher):
  - `/dashboard/:path*`, `/control`, `/analytics`, `/dirt-detection`, `/live`, `/settings`
- **Client-side token:** `useApiToken` (`src/hooks/useApiToken.ts`) retrieves the access token from the Supabase session to pass as `Authorization: Bearer` to the Express backend. Token is stored in React component state (memory), not `localStorage` or `sessionStorage`. This is acceptable — memory is not persistent across tabs or page loads, and is not accessible to other origins.
- **Inactivity signout:** 8-hour timeout, implemented in `useInactivitySignOut.ts`. Stores only a timestamp in `localStorage` (not the token itself). When the timeout triggers, `signOut()` is called and the user is redirected.

### Issue S-1: Open public sign-up — HIGH — DEFERRED

> **Deferred:** Sign-up hardening will be handled in a separate iteration. The three options below remain valid and unchanged. No code changes have been applied for this issue yet.

`src/app/auth/sign-up/page.tsx` is a publicly accessible route. The login page links to it with "Create one". Any visitor who can reach the login URL can create an account and gain access to the dashboard.

For a private thesis IoT system controlling physical hardware, unauthorised accounts represent a direct safety risk — an attacker could send panel control commands.

**Recommended fix:**

Option A (simple): Remove the sign-up link from the login page and disable the `/auth/sign-up` route entirely. Provision accounts manually via the Supabase dashboard.

Option B (controlled): Keep sign-up but add an invite-only flow — require a one-time invite token in the sign-up URL that is pre-generated and shared only with authorised users.

Option C (Supabase setting): In the Supabase dashboard, Authentication, Settings, disable "Enable Email Signup". This blocks new sign-ups without code changes, but the sign-up UI would still load (it would just error).

**Recommended minimum action:** Remove the "Create one" link from `src/app/login/page.tsx` and either block the route in middleware or disable signup in the Supabase dashboard.

---

## 3. JWT Handling

### Findings

- Supabase access tokens expire (default 1 hour).
- The `@supabase/ssr` library automatically refreshes tokens using the refresh token stored in a secure cookie. `onAuthStateChange` in `useApiToken` receives the updated token transparently.
- Tokens are **not** decoded client-side for authorization decisions. `getUser()` in the middleware makes a network call to Supabase to validate the session, which is correct.
- The 401 handler in `backendClient.ts` redirects to `/login` when the backend rejects a token — this is the correct fallback for expired tokens the SDK did not refresh.

### Status: JWT handling is correct. No action required.

---

## 4. API Security (Frontend Perspective)

### Findings

**`src/lib/backendClient.ts`** — central API fetch function:
- Token sent only in `Authorization: Bearer` header — not in query params. Correct.
- Errors return `null` and log only to `console.warn`. Internal error details are not exposed to the UI. Good.
- 401 redirects to `/login`. Correct.
- 429 returns null without retry — see S-9.
- 404 returns null silently — appropriate.
- Network errors are caught and return null — the UI handles null gracefully.

**`src/lib/api.ts`** — `getSunToday()`:
- Calls `api.open-meteo.com` directly from the browser. Open-Meteo is a public API requiring no authentication. The URL includes coordinates (see S-7 for privacy note). No secrets are involved.

**`src/lib/api.ts`** — `getSignedImageUrl()`:
- Calls `supabase.storage.createSignedUrl()` with a 1-hour TTL. Signed URLs are time-limited and bucket-scoped. This is correct — images are not publicly exposed.

**`src/app/settings/page.tsx`**:
- Renders `NEXT_PUBLIC_SUPABASE_URL` domain and `NEXT_PUBLIC_API_URL` in the UI. Both are intended to be public variables, so this is acceptable for an internal dashboard. No private information is disclosed.

### Status: API calls are implemented correctly.

---

## 5. Command / Control UI Safety

### Findings

**What is correctly implemented:**

- `usePanelCommands` (`src/hooks/usePanelCommands.ts`) guards against sending when `!token` — unauthenticated users cannot dispatch commands.
- The `sending` boolean disables all command buttons while a request is in flight — no double-sends.
- Angle computation in `buildMovePanelPayload` clamps values to `[minAngle, maxAngle]` (0–180) using `Math.min` / `Math.max`. Invalid angles cannot be sent.
- The ESP32 offline warning banner is shown on the control page when the device is detected as offline.
- Command status (PENDING / SENT / ACKNOWLEDGED / FAILED) is displayed in a history table with badge colours.
- `useCommandHistory` fast-polls at 5 s when commands are pending, slowing to 30 s when idle — good adaptive behaviour.

### Issue S-9: No rate limiting on command buttons — LOW — FIXED

**Fix applied in:**
- `src/hooks/usePanelCommands.ts` - added per-command cooldown tracking. After `MOVE_PANEL` or `RESET_POSITION` resolves (success or failure), a 2-second cooldown is activated for that specific command type only. `SET_MODE`, `START_TRACKING`, and `STOP_TRACKING` are unaffected. The hook now exposes `isCommandCooldown(type)` for consumers to query per-command state.
- `src/components/dashboard/PanelControlCard.tsx` - D-pad and Reset Position button use their respective cooldown states; a "Cooling down..." hint is shown below each when active.

### No confirmation dialogs

STOP_TRACKING and RESET_POSITION are immediate with no confirmation. For a thesis demonstration this is probably acceptable, but worth noting for production use.

---

## 6. Frontend Fallback Behaviour

### What is correctly implemented

- All `apiFetch` calls return `null` / `[]` on network failure — the UI handles null gracefully throughout.
- Loading skeletons are shown on all pages before data arrives.
- Empty states are shown when API returns no data ("No commands sent yet", "No events recorded", "No image available", etc.).
- Device status cards fall back to `OFFLINE_PLACEHOLDER_DEVICES` when the API is unavailable, showing all devices as Offline.
- Charts receive empty arrays and render nothing (Recharts handles this without crashing).
- `sessionStorage` caches the last 30 s of dashboard data so navigation feels instant.

### Issue S-3: No stale data warning — MEDIUM — FIXED

**Fix applied in:**
- `src/hooks/useStaleTelemetry.ts` (new) - hook that tracks seconds since last reading and evaluates staleness at 1 s intervals, with a configurable threshold (default 30 s / 6 missed telemetry cycles).
- `src/components/StaleDataBanner.tsx` (new) - accessible amber banner (`role="alert"`) that renders only when stale, with human-readable age (seconds / minutes / hours).
- `src/app/dashboard/page.tsx` - banner rendered above the device status bar.
- `src/app/control/page.tsx` - banner rendered at the top; all command buttons additionally disabled when stale, with a contextual hint in `PanelControlCard` and a `title` attribute on the Start/Stop Tracking buttons.

---

## 7. Backup / Recovery Awareness in the UI

### What is currently shown

- Device online/offline status with last_seen timestamps on the Settings page and the dashboard device status bar.
- Dirt detection page shows timestamp of the last analysis.
- Command history shows created_at and acknowledged_at timestamps.

### What is missing

| Indicator | Where | Priority |
|---|---|---|
| Stale telemetry warning (time since last sensor reading) | Dashboard, Control | Medium (see S-3) |
| Time since last Raspberry Pi heartbeat | Settings | Low |
| Time since last CV analysis run | Dirt Detection | Low |
| Count of FAILED or PENDING-timed-out commands | Control history | Low |

---

## 8. Environment Variable Hygiene

| Check | Result |
|---|---|
| `.env.local` committed to git | No — `.gitignore` has `.env*` |
| Service role key in frontend | Not found |
| Private secrets in `NEXT_PUBLIC_` vars | Not found |
| `.env.example` exists | Created in this audit |
| All required vars documented | Yes (see `.env.example`) |

### Issue S-5: Missing `.env.example` — LOW — FIXED

`.env.example` has been created documenting all four required environment variables with safe placeholder values.

---

## 9. Security Headers

### Before this audit

`next.config.ts` only set `Cache-Control` / `Pragma` / `Expires` headers on non-auth routes. No security headers were present.

### Issue S-2: Missing security headers — MEDIUM — FIXED

The following headers have been added to `next.config.ts` for all routes (`source: "/(.*)"`)::

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking — page cannot be embedded in a third-party iframe |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage to third-party requests |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts browser feature access; camera/mic/geo not needed by the dashboard JS |

**Content-Security-Policy was not added** because Supabase Realtime uses WebSocket connections to `*.supabase.co`, Recharts uses inline styles, and the MJPEG stream loads from a local LAN IP — building a CSP that permits all three without breaking development is non-trivial and is left as a manual task.

---

## 10. Issue S-4: Session Cache Not Cleared on Logout — LOW — FIXED

`sessionStorage` holds up to 30 s of dashboard telemetry cached under `dashboard_latest_data`. Before this fix, signing out did not clear this cache. If another user opened the same browser immediately after logout, they could see the previous user's telemetry data until the cache expired.

**Fix applied in:**
- `src/components/TopBar.tsx` — `handleSignOut()` now calls `sessionStorage.clear()` before `signOut()`.
- `src/hooks/useInactivitySignOut.ts` — inactivity signout now calls `sessionStorage.clear()` before `signOut()`.

---

## 11. Issue S-8: HTTP Camera Stream (Mixed Content) — LOW — Informational

`src/config/solarConfig.ts` exposes the MJPEG stream URL, which is an `http://` address (local LAN). When the dashboard is served over HTTPS on Vercel, modern browsers will block mixed-content HTTP requests, so the live stream will fail to load even when the Pi is online.

This is a network architecture constraint, not a code bug. The stream can only be served over HTTP because it originates from the Raspberry Pi on the local LAN without a TLS certificate.

**Options:**
1. Accept that the Live Camera page only works when the user is on the same LAN as the Pi.
2. Tunnel the stream through the Railway backend (adds latency, but makes it HTTPS).
3. Use a reverse proxy (nginx with a self-signed cert + internal CA) on the Pi.

No code change is recommended here — a note on the Live Camera page ("Stream available on local network only") already exists in the UI.

---

## Changes Applied

| File | Change |
|---|---|
| `.env.example` | Created — documents all required env vars with safe placeholders; updated to add location coordinate vars |
| `next.config.ts` | Added `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` headers |
| `src/components/TopBar.tsx` | `handleSignOut()` now clears `sessionStorage` before calling `signOut()` |
| `src/hooks/useInactivitySignOut.ts` | Inactivity logout now clears `sessionStorage` before calling `signOut()` |
| `src/hooks/useStaleTelemetry.ts` | New hook - evaluates telemetry staleness at 1 s intervals |
| `src/components/StaleDataBanner.tsx` | New component - accessible amber banner shown when telemetry is stale |
| `src/app/dashboard/page.tsx` | Integrated `useStaleTelemetry` and `StaleDataBanner` |
| `src/app/control/page.tsx` | Integrated stale banner; all command buttons disabled when stale |
| `src/hooks/usePanelCommands.ts` | Added per-command cooldown (2 s) for `MOVE_PANEL` and `RESET_POSITION`; exposes `isCommandCooldown` |
| `src/components/dashboard/PanelControlCard.tsx` | Wired cooldown state and stale flag into button disabled logic; added contextual hints |
| `src/config/solarConfig.ts` | Coordinates now read from env vars with validated fallback |
| `RLS_AUDIT_CHECKLIST.md` | New - RLS access matrix, SQL inspection queries, browser test scripts, red flags |
| `RLS_RECOMMENDED_POLICIES.sql` | New - idempotent SQL to apply correct RLS policies on all five tables |

---

## Remaining Manual Tasks

| Priority | Task | File(s) |
|---|---|---|
| **High** | Remove public sign-up link from login page OR disable sign-up in Supabase dashboard (DEFERRED - separate iteration) | `src/app/login/page.tsx`, Supabase dashboard |
| **Low** | Consider adding a CSP header once Supabase Realtime domains and camera stream behaviour are confirmed | `next.config.ts` |
| **External** | Apply and verify Supabase RLS policies using `RLS_RECOMMENDED_POLICIES.sql` and `RLS_AUDIT_CHECKLIST.md` | Supabase dashboard |
| **External** | Add `NEXT_PUBLIC_LOCATION_LAT` and `NEXT_PUBLIC_LOCATION_LON` to Vercel environment variables | Vercel dashboard |

---

## Issue S-7: Hardcoded Installation Coordinates — LOW — FIXED

**Fix applied in:**
- `src/config/solarConfig.ts` - `locationLat` and `locationLon` now read from `NEXT_PUBLIC_LOCATION_LAT` and `NEXT_PUBLIC_LOCATION_LON` env vars. If either is missing or not a valid number, the original values (45.7489, 21.2087) are used as fallback and a `console.warn` is emitted at module load time.
- `.env.example` - new variables documented with a comment explaining their purpose.

**Manual step required:** Set `NEXT_PUBLIC_LOCATION_LAT` and `NEXT_PUBLIC_LOCATION_LON` in Vercel (or `.env.local` for local dev) if the installation is not in Timisoara.

---

## Issue S-10: Supabase RLS Not Auditable From Frontend — DOCUMENTED

RLS policies cannot be verified from frontend code. Two documents have been generated for manual audit:

- `RLS_AUDIT_CHECKLIST.md` - expected access matrix per table, SQL queries to inspect current policies, browser console test scripts, and a red flags reference.
- `RLS_RECOMMENDED_POLICIES.sql` - idempotent SQL to apply the correct policies. Run in the Supabase SQL Editor (Database, SQL Editor).

**Manual step required:** Run `RLS_RECOMMENDED_POLICIES.sql` in the Supabase SQL Editor, then complete the checklist in `RLS_AUDIT_CHECKLIST.md`.

---

## Verification Steps

### S-3: Stale Telemetry Banner

1. Open the dashboard with the Pi running normally - the amber banner should NOT appear.
2. Stop the gateway service on the Pi (`sudo systemctl stop solar-gateway` or equivalent).
3. Wait approximately 30 seconds (6 missed telemetry cycles at the default 30 s threshold).
4. The amber banner should appear on both the dashboard and the control page: "Telemetry is stale, last reading received X seconds ago. Gateway may be offline."
5. On the control page, all command buttons (mode toggles, D-pad, Reset Position, Start/Stop Tracking) should be disabled. The PanelControlCard should show "Telemetry stale - commands disabled for safety". Hovering over the Start/Stop Tracking buttons should show a tooltip explaining the reason.
6. Restart the gateway service. After the next telemetry reading arrives, the banner should disappear and buttons should re-enable.

### S-9: Command Cooldown

1. Ensure the ESP32 is online and tracking mode is Manual.
2. Click any D-pad direction button. It sends a MOVE_PANEL command.
3. Immediately click a D-pad button again - the click should be ignored (button visually disabled) until 2 seconds after the first command resolved.
4. A "Cooling down..." label should briefly appear below the D-pad.
5. Click Stop Tracking immediately after a MOVE_PANEL command - it should respond immediately without waiting for the MOVE_PANEL cooldown. This confirms per-command cooldown, not global.
6. Verify Reset Position also has a 2-second cooldown but that Set Mode buttons do not.

### S-7: Installation Coordinates

1. Set `NEXT_PUBLIC_LOCATION_LAT=48.8566` and `NEXT_PUBLIC_LOCATION_LON=2.3522` in `.env.local` (Paris coordinates).
2. Start the dev server and open the dashboard. The Open-Meteo weather widget should reflect Paris weather data.
3. Remove the env vars and restart - the console should emit a warning and the widget should fall back to Timisoara data.

---

## What This Audit Did NOT Flag

- **Supabase anon key in `NEXT_PUBLIC_` vars** — this is the correct pattern. The anon key is intentionally public. Security depends on RLS policies on the Supabase side, not key secrecy.
- **Token in React state** — storing the Bearer token in component state is the standard SPA pattern. It is not persisted to disk and is not accessible to other origins.
- **`getSession()` in `useApiToken`** — used only to retrieve the token for Bearer auth, not for authorization decisions. `getUser()` is used server-side for authorization. Correct split.
- **Error messages from Supabase Auth shown in UI** — Supabase auth errors (e.g. "Invalid login credentials") are shown directly. These do not disclose internal stack traces or schema details.
