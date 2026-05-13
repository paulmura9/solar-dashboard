# Supabase RLS Audit Checklist

**Project:** Solar Tracker IoT Dashboard  
**Date:** 2026-05-13  
**Scope:** Row Level Security policies for all five tables used by the dashboard frontend

---

## Architecture Context

| Actor | Supabase Role | Access Method |
|---|---|---|
| Dashboard user (logged in) | `authenticated` | Anon key + valid session cookie |
| Unauthenticated visitor | `anon` | Anon key, no session |
| Raspberry Pi gateway | `service_role` | Service role key - **bypasses all RLS** |

The Pi gateway uses `service_role` which bypasses RLS entirely. Therefore, RLS policies only need to govern what `authenticated` and `anon` roles can do. The goal is: authenticated users can READ everything, can INSERT to `device_commands` only, and can never UPDATE or DELETE anything.

---

## Expected Access Matrix

### `sensor_readings`

| Operation | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| SELECT | DENY | ALLOW | ALLOW (bypasses RLS) |
| INSERT | DENY | DENY | ALLOW (bypasses RLS) |
| UPDATE | DENY | DENY | ALLOW (bypasses RLS) |
| DELETE | DENY | DENY | ALLOW (bypasses RLS) |

**Rationale:** Only the Pi inserts readings. Dashboard users read them.

### `vision_results`

| Operation | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| SELECT | DENY | ALLOW | ALLOW (bypasses RLS) |
| INSERT | DENY | DENY | ALLOW (bypasses RLS) |
| UPDATE | DENY | DENY | ALLOW (bypasses RLS) |
| DELETE | DENY | DENY | ALLOW (bypasses RLS) |

**Rationale:** Only the Pi inserts vision results. Dashboard users read them.

### `system_events`

| Operation | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| SELECT | DENY | ALLOW | ALLOW (bypasses RLS) |
| INSERT | DENY | DENY | ALLOW (bypasses RLS) |
| UPDATE | DENY | DENY | ALLOW (bypasses RLS) |
| DELETE | DENY | DENY | ALLOW (bypasses RLS) |

**Rationale:** Events are audit logs written only by the Pi.

### `device_status`

| Operation | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| SELECT | DENY | ALLOW | ALLOW (bypasses RLS) |
| INSERT | DENY | DENY | ALLOW (bypasses RLS) |
| UPDATE | DENY | DENY | ALLOW (bypasses RLS) |
| DELETE | DENY | DENY | ALLOW (bypasses RLS) |

**Rationale:** Device online/offline state is set by the Pi via upsert.

### `device_commands`

| Operation | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| SELECT | DENY | ALLOW | ALLOW (bypasses RLS) |
| INSERT | DENY | ALLOW (status = PENDING only) | ALLOW (bypasses RLS) |
| UPDATE | DENY | DENY | ALLOW (bypasses RLS) |
| DELETE | DENY | DENY | ALLOW (bypasses RLS) |

**Rationale:** The dashboard inserts commands with status PENDING. The Pi transitions them to SENT/ACKNOWLEDGED/FAILED via service_role. Users can see the full command history.

---

## Step 1 - Verify RLS Is Enabled on All Tables

Run this in the Supabase SQL Editor:

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'sensor_readings',
    'vision_results',
    'system_events',
    'device_status',
    'device_commands'
  )
ORDER BY tablename;
```

**Expected output:** All five rows should have `rowsecurity = true`.

**Red flag:** Any row with `rowsecurity = false` means that table has NO access control. Any authenticated user (or even anon) can read and write it freely, bypassing all policies.

---

## Step 2 - Inspect Current Policies

Run this in the Supabase SQL Editor:

```sql
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'sensor_readings',
    'vision_results',
    'system_events',
    'device_status',
    'device_commands'
  )
ORDER BY tablename, policyname;
```

Verify the following for each table (use the expected matrix above to cross-check):

- `cmd` values: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, or `ALL`
- `roles` should be `{authenticated}` for all policies (not `{anon}`, not `{}`)
- `qual` (USING clause): should be `true` for SELECT, or a filter condition
- `with_check` (WITH CHECK clause): for `device_commands` INSERT, should enforce `(status = 'PENDING')`

---

## Step 3 - Browser Console Tests

Open the deployed dashboard in your browser, sign in, and open the DevTools console. Paste each test block one at a time. These tests use the Supabase client already available on the page.

> **How to get the client in the console:** In the browser DevTools console on the dashboard page, the Supabase client is accessible if you import it. Alternatively, use this one-liner to create a test client with the same credentials:
>
> ```js
> const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
> const sb = createClient(
>   document.querySelector('meta[name="sb-url"]')?.content ?? prompt('Supabase URL?'),
>   document.querySelector('meta[name="sb-anon"]')?.content ?? prompt('Anon key?')
> );
> ```
>
> Easier approach: use the Supabase dashboard Table Editor with an authenticated session, or run the tests via the API from Postman with the anon key + a valid JWT.

### Test A - Authenticated user CANNOT insert into sensor_readings

```js
// Expected: error with code 42501 (insufficient_privilege) or empty data due to RLS
const { data, error } = await sb.from('sensor_readings').insert({
  timestamp: new Date().toISOString(),
  horizontal_angle: 90,
  vertical_angle: 45,
  tracking_mode: 'IDLE',
  is_moving: false,
});
console.log('INSERT sensor_readings:', error?.code, error?.message);
// SAFE:   error.code === '42501' or error.code === 'PGRST301'
// UNSAFE: data is non-null (insert succeeded)
```

### Test B - Authenticated user CANNOT update device_commands status

```js
// Expected: error - no UPDATE policy exists for authenticated
const { data, error } = await sb
  .from('device_commands')
  .update({ status: 'ACKNOWLEDGED' })
  .not('id', 'is', null)
  .limit(1);
console.log('UPDATE device_commands:', error?.code, error?.message);
// SAFE:   error is non-null, or data.length === 0 with count 0
// UNSAFE: data contains a row (update succeeded)
```

### Test C - Authenticated user CAN insert a PENDING command

```js
// Expected: success - this is the intended use case
const { data, error } = await sb.from('device_commands').insert({
  command_type: 'STOP_TRACKING',
  payload: {},
  status: 'PENDING',
});
console.log('INSERT device_commands PENDING:', error?.code ?? 'OK', data);
// SAFE:   error is null, insert succeeded
// UNSAFE: error is non-null (RLS is too restrictive - blocks legitimate commands)
```

### Test D - Authenticated user CANNOT insert a command with status other than PENDING

```js
// Expected: error - WITH CHECK should reject non-PENDING status
const { data, error } = await sb.from('device_commands').insert({
  command_type: 'STOP_TRACKING',
  payload: {},
  status: 'ACKNOWLEDGED',
});
console.log('INSERT device_commands ACKNOWLEDGED:', error?.code, error?.message);
// SAFE:   error.code === '42501' or 'new row violates row-level security'
// UNSAFE: data is non-null (insert with ACKNOWLEDGED status succeeded)
```

### Test E - Authenticated user CANNOT delete sensor_readings

```js
// Expected: error or 0 rows affected
const { data, error, count } = await sb
  .from('sensor_readings')
  .delete()
  .not('id', 'is', null)
  .limit(1);
console.log('DELETE sensor_readings:', error?.code ?? 'No error', 'count:', count);
// SAFE:   error is non-null, or count === 0
// UNSAFE: count > 0 (row was deleted)
```

### Test F - Anonymous user (not logged in) CANNOT select from any table

Open a fresh incognito window, navigate to the base URL (without logging in), and in DevTools:

```js
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
const sbAnon = createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY');
const { data, error } = await sbAnon.from('sensor_readings').select('*').limit(1);
console.log('anon SELECT sensor_readings:', error?.code, 'rows:', data?.length ?? 0);
// SAFE:   data is empty array [] or error is non-null
// UNSAFE: data contains rows (anon can read telemetry)
```

---

## Red Flags

### What unsafe responses look like vs safe

| Test | Unsafe (bad) | Safe (expected) |
|---|---|---|
| INSERT into sensor_readings | `data` is non-null | `error.code = '42501'` |
| UPDATE device_commands | `data` contains updated row | `error` non-null or count 0 |
| INSERT PENDING command | `error` is non-null | `error` is null, insert OK |
| INSERT non-PENDING command | `data` is non-null | `error` with RLS message |
| DELETE sensor_readings | `count > 0` | `error` non-null or count 0 |
| Anonymous SELECT | `data` contains rows | `data = []` or `error` non-null |

### Critical misconfigurations to look for

1. **RLS disabled on any table** - `rowsecurity = false` in `pg_tables`. Means the table is fully open to anyone with the anon key.

2. **Policy with `TO public` or `TO anon`** - Would allow unauthenticated visitors to read or write the table. Should always be `TO authenticated`.

3. **INSERT policy on device_commands without `WITH CHECK (status = 'PENDING')`** - Allows authenticated users to forge ACKNOWLEDGED or FAILED command entries, potentially confusing the Pi gateway into skipping real commands.

4. **UPDATE policy on any table for authenticated role** - Would allow a logged-in user to alter sensor readings, vision results, or command statuses directly, bypassing the Pi gateway validation entirely.

5. **Overly broad `FOR ALL` policy** - A single `FOR ALL TO authenticated USING (true)` policy gives full read/write/delete access. Unless intentional (device_commands needs INSERT), this is too permissive.

6. **No SELECT policy on sensor_readings but RLS enabled** - With RLS enabled and no SELECT policy, authenticated users would see an empty table, breaking the dashboard with no obvious error.

---

## Summary Checklist

- [ ] RLS enabled on `sensor_readings`
- [ ] RLS enabled on `vision_results`
- [ ] RLS enabled on `system_events`
- [ ] RLS enabled on `device_status`
- [ ] RLS enabled on `device_commands`
- [ ] `sensor_readings`: SELECT for authenticated only, no other policies
- [ ] `vision_results`: SELECT for authenticated only, no other policies
- [ ] `system_events`: SELECT for authenticated only, no other policies
- [ ] `device_status`: SELECT for authenticated only, no other policies
- [ ] `device_commands`: SELECT for authenticated, INSERT for authenticated with `WITH CHECK (status = 'PENDING')`, no UPDATE/DELETE
- [ ] No policy grants access to the `anon` role on any table
- [ ] Test A passes (cannot INSERT into sensor_readings)
- [ ] Test B passes (cannot UPDATE device_commands)
- [ ] Test C passes (CAN INSERT PENDING command)
- [ ] Test D passes (cannot INSERT non-PENDING command)
- [ ] Test E passes (cannot DELETE sensor_readings)
- [ ] Test F passes (anonymous SELECT returns empty)
