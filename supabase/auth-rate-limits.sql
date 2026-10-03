-- Rate-limit storage for login / admin brute-force protection.
-- Run in Supabase SQL Editor (service role bypasses RLS).

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key text PRIMARY KEY,
  fails integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Ensure API roles can use the table (service_role used by server)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_rate_limits TO service_role;
GRANT ALL ON TABLE public.auth_rate_limits TO postgres;

-- Keep anon/authenticated locked out (RLS on + no policies)
REVOKE ALL ON TABLE public.auth_rate_limits FROM anon;
REVOKE ALL ON TABLE public.auth_rate_limits FROM authenticated;
