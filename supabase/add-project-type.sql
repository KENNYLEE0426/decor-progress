-- 工程類型：裝修單 / 維修單
-- renovation = 裝修單（前台顯示工序同整體進度）
-- repair = 維修單（前台隱藏工序同整體進度）

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'renovation';

COMMENT ON COLUMN public.projects.project_type IS 'renovation=裝修單, repair=維修單；前台唔顯示呢個欄位字眼';
