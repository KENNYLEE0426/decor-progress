-- 工程文件加分類欄位（報價單、平面圖等）
-- 喺 Supabase Dashboard → SQL Editor 跑一次

ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS category text;

UPDATE public.project_documents
SET category = '報價單'
WHERE category IS NULL OR category = '';

ALTER TABLE public.project_documents
  ALTER COLUMN category SET DEFAULT '報價單';

ALTER TABLE public.project_documents
  ALTER COLUMN category SET NOT NULL;

CREATE INDEX IF NOT EXISTS project_documents_project_id_category_created_at_idx
  ON public.project_documents (project_id, category, created_at DESC);

COMMENT ON COLUMN public.project_documents.category IS '工程文件分類（報價單、發票收據、各類平面／正視圖等）';
