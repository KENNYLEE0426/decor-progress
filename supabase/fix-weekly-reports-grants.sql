-- 修復 weekly_reports：permission denied for table
-- 喺 Supabase Dashboard → SQL Editor 跑一次即可

-- 確保表存在（如已建會跳過）
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  report_date date,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weekly_reports_project_id_created_at_idx
  ON public.weekly_reports (project_id, created_at DESC);

-- 關鍵：授權俾 API roles（唔係 RLS；缺呢步會出 permission denied）
GRANT ALL ON TABLE public.weekly_reports TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- RLS：anon/authenticated 冇 policy = 唔可以直讀寫；service_role 可繞過
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'weekly_reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.weekly_reports', r.policyname);
  END LOOP;
END $$;

COMMENT ON TABLE public.weekly_reports IS '每週進度報告 JPG，前後台經 Next.js API 存取';
