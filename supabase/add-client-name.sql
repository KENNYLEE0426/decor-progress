-- 喺 projects 加客戶名稱（可喺 Table Editor 直接改）
-- Supabase → SQL Editor 跑一次，或喺 Table Editor 手動加欄位 client_name (text)

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_name text;

COMMENT ON COLUMN public.projects.client_name IS '客戶顯示名稱（前台工程單位旁顯示）';
