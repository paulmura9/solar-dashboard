# Session Lifetime Audit

Read-only investigation into why a logged-in user stays authenticated indefinitely,
and what the options are for adding session expiry. No source files were changed;
this report is the only file added.

Stack confirmed: Next.js 14 App Router, `@supabase/ssr` **0.10.3**, `@supabase/supabase-js` 2.x,
cookie-based auth, plus a custom Express WebSocket backend (not in this repo).

Short version: the "logged in forever" behavior is the **default** behavior of
`@supabase/ssr`. The session is stored in persistent cookies (400-day max-age), the
access token is auto-refreshed, and the refresh token has no expiry by default. There
*is* one client-side guard (`useInactivitySignOut`), but it is mount-only with no live
timer, so it does not expire an open, idle tab. Details and corrections below.

---

## 1. Supabase client configuration

### Where the clients are created

| Client | File | Constructor |
|---|---|---|
| Browser (singleton) | `src/lib/supabase/client.ts` | `createBrowserClient` |
| Server (RSC / route handlers) | `src/lib/supabase/server.ts` | `createServerClient` (reads `next/headers` cookies) |
| Middleware | `src/middleware.ts:15` | `createServerClient` (reads/writes `NextRequest`/`NextResponse` cookies) |

None of the three pass an `auth` options object. From `src/lib/supabase/client.ts`:

```ts
client = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);   // no third argument -> all auth options are defaults
```

### The auth options actually in effect (defaults)

Because no options are supplied, the defaults baked into `@supabase/ssr` 0.10.3 apply.
Verified directly in the installed package
(`node_modules/@supabase/ssr/dist/main/createBrowserClient.js:41-43`):

```js
autoRefreshToken: options?.auth?.autoRefreshToken ?? isBrowser(),   // -> true in browser
detectSessionInUrl: options?.auth?.detectSessionInUrl ?? isBrowser(), // -> true in browser
persistSession:    options?.auth?.persistSession ?? true,           // -> true
```

| Option | Effective value | Source |
|---|---|---|
| `persistSession` | **true** | `createBrowserClient.js:43` |
| `autoRefreshToken` | **true** (browser) | `createBrowserClient.js:41` |
| `detectSessionInUrl` | **true** (browser) | `createBrowserClient.js:42` |
| storage mechanism | **cookies**, not localStorage | `createStorageFromOptions(...)` in `createBrowserClient.js:21` |

Storage is the important one and is easy to get wrong: with `@supabase/ssr` the session
tokens are kept in **cookies** (`sb-*`), not `localStorage`. The cookie defaults
(`node_modules/@supabase/ssr/dist/main/utils/constants.js:4-11`):

```js
exports.DEFAULT_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,                 // JS-readable -> the browser can read the access token
  maxAge: 400 * 24 * 60 * 60,      // ~400 days
};
```

The codebase relies on these cookies being JS-readable and present:
- `src/config/auth.ts:1` defines `AUTH_COOKIE_PREFIX = "sb-"`.
- `src/middleware.ts:46-48` reads `sb-*` cookies off the request.
- `useApiToken` / the WS provider read `access_token` from the client session.

### Why this produces "logged in forever"

1. **Persistent cookies survive browser restart.** The `sb-*` auth cookies are written
   with `maxAge` of ~400 days, not as session cookies. Closing the browser does not
   delete them, so reopening restores the session.
2. **Access token is short-lived but auto-refreshed.** The access token (JWT) lifetime
   is a Supabase project setting, default **3600 s (1 h)**. With `autoRefreshToken: true`,
   `supabase-js` proactively exchanges the refresh token for a new access token shortly
   before expiry while a tab is open, and on the next `getSession`/`getUser` after reopen.
3. **The refresh token does not expire by default.** Supabase rotates refresh tokens on
   use, but with no absolute or inactivity timeout configured the chain of refresh tokens
   continues indefinitely. So step 2 can repeat forever.
4. **Server-side renewal too.** The middleware calls `getUser()` on every matched request
   (see section 2), which itself triggers a refresh and re-writes the cookies — so even
   pure server navigation keeps the session alive.

The only thing that breaks this chain in the current code is an explicit
`signOut` (`src/lib/auth/signOut.ts`, `scope: "global"`), which revokes the refresh
token server-side and clears the cookies.

---

## 2. Session validation on navigation

### Server-side: middleware re-validates on every request

`src/middleware.ts` runs on a broad matcher (everything except static assets,
`src/middleware.ts:91-95`) and validates the session server-side:

```ts
const { data: { user } } = await supabase.auth.getUser();   // middleware.ts:36-38
...
if (!user) {
  // clear orphan sb-* cookies, then for non-public paths:
  return applyNoStore(NextResponse.redirect(url));          // -> /login
}
```

Notes:
- `getUser()` (not `getSession()`) is used, which contacts the Supabase Auth server to
  validate the token rather than trusting the local copy. Good.
- The `setAll` cookie callback (`middleware.ts:23-31`) is the standard `@supabase/ssr`
  pattern that **re-writes refreshed cookies** — so the middleware actively renews the
  session as a side effect of checking it.
- Protected responses get `Cache-Control: no-store` (`applyNoStore`, `middleware.ts:81-89`).

Crucially, the middleware enforces **presence of a (refreshable) session only**. There is
no max-age check, no "issued-at too old" check, no idle check. As long as the refresh
token is valid, `getUser()` returns a user and access continues.

### Client-side: useAuthGuard

`src/components/DashboardShell.tsx` is mounted in the root layout
(`src/app/layout.tsx:21`) and, for non-auth pages, renders `AuthShell` which calls
`useAuthGuard()` and `useInactivitySignOut()` (`DashboardShell.tsx:14-15`).

`src/hooks/useAuthGuard.ts` re-checks on mount and on bfcache restore:

```ts
const { data, error } = await supabase.auth.getUser();
if (error || !data.user) window.location.replace(LOGIN_ROUTE);   // useAuthGuard.ts:13-16
...
window.addEventListener("pageshow", handlePageShow);  // re-check on bfcache restore
```

Again this only checks *whether a session exists*, not how old it is.

### Existing expiry / idle / re-auth logic — CORRECTION

Your expectation was "none." That is **not** quite right — there is one mechanism, but it
is ineffective for the case you observed.

`src/hooks/useInactivitySignOut.ts` defines a 1-hour inactivity timeout and **is wired up**
(`DashboardShell.tsx:6,15`):

```ts
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;           // 1 hour
const LAST_ACTIVITY_KEY = "lighttrack_last_activity";

useEffect(() => {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (stored && Date.now() - parseInt(stored, 10) > INACTIVITY_TIMEOUT_MS) {
    void signOutCompletely();
    return;                                             // <-- only runs ONCE, at mount
  }
  const updateActivity = () => localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  const events = ["mousemove", "keydown", "mousedown", "touchstart"];
  events.forEach((e) => window.addEventListener(e, updateActivity));
  updateActivity();
  return () => events.forEach((e) => window.removeEventListener(e, updateActivity));
}, []);                                                 // empty deps
```

Why it does not expire your session in practice:

- **No live timer.** The elapsed-time comparison runs only once, inside a `useEffect([])`
  that fires at mount. There is no `setInterval`/`setTimeout` that fires after an hour to
  sign out an *open, idle* tab. The activity listeners only ever *write* the timestamp;
  nothing *reads* it again after mount.
- **Mount happens rarely in an SPA.** `AuthShell` lives in the root layout. Client-side
  navigation between dashboard routes does not remount it, so the check effectively only
  runs on a full document load (first load / hard refresh / reopen).
- **Net effect:** a tab left open for days never re-evaluates the timeout — exactly the
  symptom you described. The check *can* fire on a fresh reopen if more than 1 h passed
  since the last recorded activity, but it cannot catch the open-tab case at all, and it
  depends on `AuthShell` actually mounting on a protected route.

So: there is no absolute session lifetime, no working idle timeout, and no
re-authentication prompt anywhere. The inactivity hook is present but, as written, does
not provide a dependable expiry.

---

## 3. Backend interaction (WebSocket on the Supabase JWT)

The dashboard opens a WebSocket to the Express backend at `/ws/client`, authenticated with
the Supabase access token passed as a WS subprotocol.

Token source (`src/components/providers/DashboardWSProvider.tsx:50-53`):

```ts
getToken: async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();   // returns the auto-refreshed token
  return data.session?.access_token ?? null;
},
```

Connect, passing the token (`src/lib/ws/client.ts:54-66`):

```ts
const token = await this.config.getToken();
...
this.ws = new WebSocket(this.config.url, ["access_token", token]);
```

Re-auth on the open socket (`src/lib/ws/client.ts:180-191`, interval from
`src/lib/ws/constants.ts:7`, `REAUTH_INTERVAL_MS = 50 * 60 * 1000` = 50 min):

```ts
private scheduleReauth(): void {
  if (this.reauthTimer !== null) return;
  this.reauthTimer = window.setTimeout(async () => {
    this.reauthTimer = null;
    const token = await this.config.getToken();          // fresh token
    if (token !== null && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "reauth", token });              // pushed over the SAME socket
      this.scheduleReauth();                             // re-arm
    }
  }, REAUTH_INTERVAL_MS);
}
```

Behavior, precisely:

- The connection **stays open** and re-authenticates **in place** every 50 minutes by
  sending a `{ type: "reauth", token }` message with the current (refreshed) token. It
  does **not** drop and reconnect to pick up a new token.
- The re-auth is **timer-driven, not event-driven.** The WS client does **not** subscribe
  to `supabase.auth.onAuthStateChange`. (That listener is used elsewhere — `useApiToken.ts:17`
  — but not by the WS client.) So when Supabase refreshes the access token mid-hour, the
  socket keeps using the *old* token until the next 50-min reauth tick or until a reconnect.
- On reconnect, `connect()` calls `getToken()` again (`client.ts:54`), so a fresh token is
  always used after any disconnect/backoff cycle (`scheduleReconnect`, `client.ts:164-178`).
- The 50-min reauth interval is shorter than the default 60-min token lifetime, so in the
  steady state a valid token is pushed before the previous one expires.

Important scope limit: whether the **backend actually enforces** token expiry (i.e. closes
the socket when a token lapses, or validates the `reauth` message) lives in the Express
`solar-api` service, which is **not in this repo** and cannot be verified here. From the
dashboard side, the connection is long-lived and refreshed periodically; it does not, on
its own, end a session.

---

## 4. Options to add expiry (analysis only — not implemented)

### (a) Supabase dashboard settings — JWT expiry, refresh token, session timeouts

Configured in the Supabase dashboard under **Authentication → Sessions** (and the JWT
expiry under Auth settings). No code changes.

- **Access token (JWT) expiry** — configurable on **all tiers incl. free**. Default 3600 s,
  can be lowered (min 300 s). On its own this does **not** log users out: a shorter access
  token just means more frequent silent refreshes. It reduces the window a leaked token is
  valid, nothing more. Complexity: trivial. Tradeoff: little benefit alone for your goal.
- **Refresh token rotation / reuse interval** — configurable, rotation on by default.
  Governs token theft detection, not session length. Does not add expiry.
- **Time-box user sessions (absolute timeout)** and **Inactivity timeout** — these are the
  settings that actually end sessions server-side. As of current Supabase plans these
  session-timeout controls are a **paid-plan (Pro and above) feature and are not available
  on the free tier.** Verify in your own dashboard, since plan gating can change. Complexity:
  trivial if on a supporting plan; impossible on free tier. Tradeoff: cost — would require a
  plan upgrade for a single-user thesis project.

Net: on the **free tier** the only server-enforced lever is shortening JWT expiry, which by
itself does not produce logout. The session-ending timeouts require a paid plan.

### (b) Client-side idle timeout (extend the existing hook)

Where: `src/hooks/useInactivitySignOut.ts` (already exists and is wired in
`DashboardShell.tsx:15`). The mechanism is 90% there; it is missing a live timer. The change
would be to run an actual `setInterval`/re-armed `setTimeout` that checks elapsed idle time
and calls `signOutCompletely()` (`src/lib/auth/signOut.ts`) when exceeded, resetting on the
existing activity events, with the last-activity timestamp already persisted in `localStorage`
for cross-tab/refresh consistency. `signOutCompletely` already does a thorough global
sign-out (revokes the refresh token, clears cookies/storage, hits `POST /auth/signout`,
hard-redirects), so the teardown is solid.

Complexity: **low** — fix to existing code, no new dependencies. Tradeoffs: enforcement is
client-side only (a user who disables JS or keeps the token would not be auto-signed-out
until the next server check), and it only takes effect while the app is loaded. For an
honest single-user dashboard that is acceptable; the threat is an unattended open session,
not an adversary.

### (c) Don't persist the session (`persistSession: false` or `sessionStorage`)

Where: the `auth`/storage options in `createBrowserClient` (`src/lib/supabase/client.ts:7`).
Goal: session ends when the tab/browser closes.

This option is **awkward with `@supabase/ssr` and likely to break server-side auth.** The
whole SSR model here depends on the session living in **cookies** that the middleware
(`src/middleware.ts`) and server client (`src/lib/supabase/server.ts`) can read. Switching
the browser client to `persistSession: false` or a `sessionStorage` adapter moves the
session out of the shared cookie storage; the middleware's `getUser()` would then see no
session and redirect to `/login` on server-rendered requests, breaking navigation. It also
only addresses *browser-close*, not idle time. Complexity: low to write, but high risk of
breaking the existing SSR/middleware auth flow. Not recommended in this architecture.

### Recommendation

For a single-user thesis project on the free tier, choose **(b): complete the existing
client-side idle timeout.** Justification:

- It needs no plan upgrade — the server-enforced timeouts in (a) are paid-tier only, and
  shortening JWT expiry alone does not log anyone out.
- It does not fight the SSR cookie architecture the way (c) does (which would break the
  middleware).
- The code, wiring, and a robust `signOutCompletely` already exist; the only real gap is the
  missing live timer, so it is the smallest, lowest-risk change.
- It matches the actual concern — an unattended, indefinitely-open dashboard — rather than a
  sophisticated attacker, which is the right threat model for this project.

Optionally pair it with lowering the **JWT expiry** in the Supabase dashboard (free-tier
allowed) to shrink the leaked-token window, as defense in depth. Option (a)'s session
timeouts remain the "correct" server-side answer if the project ever moves to a paid plan.
```

