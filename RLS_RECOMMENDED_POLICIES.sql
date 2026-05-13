-- ============================================================
-- Solar Tracker Dashboard - Recommended RLS Policies
-- ============================================================
-- Idempotent: each block drops existing policy before creating.
-- Run this in the Supabase SQL Editor (Database > SQL Editor).
--
-- Access model:
--   authenticated  - logged-in dashboard users (read all, insert commands)
--   service_role   - Raspberry Pi gateway (bypasses RLS, no policy needed)
--   anon           - must be denied on all tables
-- ============================================================


-- ============================================================
-- Enable RLS on all five tables (safe to run if already enabled)
-- ============================================================

ALTER TABLE public.sensor_readings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_commands  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- sensor_readings
-- Read-only for authenticated users.
-- Pi gateway writes via service_role (bypasses RLS).
-- ============================================================

DROP POLICY IF EXISTS "sensor_readings_authenticated_select" ON public.sensor_readings;
CREATE POLICY "sensor_readings_authenticated_select"
  ON public.sensor_readings
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- vision_results
-- Read-only for authenticated users.
-- Pi gateway writes via service_role (bypasses RLS).
-- ============================================================

DROP POLICY IF EXISTS "vision_results_authenticated_select" ON public.vision_results;
CREATE POLICY "vision_results_authenticated_select"
  ON public.vision_results
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- system_events
-- Read-only for authenticated users.
-- Pi gateway writes via service_role (bypasses RLS).
-- ============================================================

DROP POLICY IF EXISTS "system_events_authenticated_select" ON public.system_events;
CREATE POLICY "system_events_authenticated_select"
  ON public.system_events
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- device_status
-- Read-only for authenticated users.
-- Pi gateway upserts via service_role (bypasses RLS).
-- ============================================================

DROP POLICY IF EXISTS "device_status_authenticated_select" ON public.device_status;
CREATE POLICY "device_status_authenticated_select"
  ON public.device_status
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- device_commands
-- Authenticated users can read all commands and insert new ones.
-- INSERT is restricted to status = 'PENDING' only.
-- Status transitions (SENT, ACKNOWLEDGED, FAILED) are done by
-- the Pi gateway via service_role and are not accessible to the
-- frontend role.
-- ============================================================

DROP POLICY IF EXISTS "device_commands_authenticated_select" ON public.device_commands;
CREATE POLICY "device_commands_authenticated_select"
  ON public.device_commands
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "device_commands_authenticated_insert" ON public.device_commands;
CREATE POLICY "device_commands_authenticated_insert"
  ON public.device_commands
  FOR INSERT
  TO authenticated
  WITH CHECK (status = 'PENDING');


-- ============================================================
-- Verification query - run after applying the above
-- Expected: 6 rows total (1 per table except device_commands
-- which has 2 policies)
-- ============================================================

SELECT
  tablename,
  policyname,
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
