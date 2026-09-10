-- Rate-limit storage for login / admin brute-force protection.
-- Run in Supabase SQL Editor (service role bypasses RLS).

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key text PRIMARY KEY,
  fails integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => deny by default.
