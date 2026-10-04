-- 工程文件區：PDF 上載，前後台經 Next.js API 存取
-- 喺 Supabase Dashboard → SQL Editor 跑一次

CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_documents_project_id_created_at_idx
  ON public.project_documents (project_id, created_at DESC);

GRANT ALL ON TABLE public.project_documents TO anon, authenticated, service_role;

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_documents', r.policyname);
  END LOOP;
END $$;

COMMENT ON TABLE public.project_documents IS '工程文件 PDF，前後台經 Next.js API 存取';
