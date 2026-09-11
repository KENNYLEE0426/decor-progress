-- 週期工作進度報告（JPG）
-- 喺 Supabase SQL Editor 跑一次

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

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- 清走舊政策（如有），保持 anon 不可直讀寫；server service_role 可繞過
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
