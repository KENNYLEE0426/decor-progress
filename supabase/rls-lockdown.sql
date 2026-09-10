-- Lock down public table access via RLS.
-- Run this in Supabase Dashboard → SQL Editor AFTER deploying app code
-- that uses SUPABASE_SERVICE_ROLE_KEY on the server.
--
-- Effect: anon / authenticated roles cannot read or write these tables.
-- Server APIs use the service_role key, which bypasses RLS.

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive policies if they exist (names may vary; safe to ignore errors)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('projects', 'progress_logs', 'payment_phases', 'receipts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- No policies for anon/authenticated = deny by default when RLS is on.
-- (service_role bypasses RLS)

-- Storage: keep public READ for existing public URLs used in the UI,
-- but block anon upload / update / delete.
-- Adjust bucket name if different.
DO $$
BEGIN
  -- Ensure RLS on storage.objects (usually already on)
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

DROP POLICY IF EXISTS "progress-photos public read" ON storage.objects;
DROP POLICY IF EXISTS "progress-photos anon upload" ON storage.objects;
DROP POLICY IF EXISTS "progress-photos anon update" ON storage.objects;
DROP POLICY IF EXISTS "progress-photos anon delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read progress-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload progress-photos" ON storage.objects;

CREATE POLICY "progress-photos public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'progress-photos');

-- No INSERT/UPDATE/DELETE policies for anon/authenticated on this bucket.
-- Uploads go through Next.js APIs using service_role.
