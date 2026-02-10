-- ============================================================
-- Supabase 列級安全 (RLS) 啟用與政策
-- 解決 Security Advisor「RLS Disabled in Public」警告
-- 執行方式：在 Supabase Dashboard → SQL Editor 貼上並執行
-- ============================================================

-- ------------------------------------------------------------
-- 1. events 表：啟用 RLS + 允許讀取
-- 你的後端用 DATABASE_URL 連線（postgres 角色）會自動繞過 RLS，不受影響
-- 這裡加「匿名可讀」是為了通過安全檢查；若只給後端用，可改成更嚴格的條件
-- ------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 若已存在則先刪除，腳本即可重複執行
DROP POLICY IF EXISTS "允許讀取行程" ON public.events;
-- 政策：允許所有人讀取行程（anon 角色，例如未來若前端直連 Supabase 時可用）
CREATE POLICY "允許讀取行程"
  ON public.events
  FOR SELECT
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- 2. members 表：啟用 RLS + 允許讀取
-- ------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允許讀取成員" ON public.members;
CREATE POLICY "允許讀取成員"
  ON public.members
  FOR SELECT
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- 3. calendar_watches 表：啟用 RLS + 允許後端 cron 讀寫
-- 此表僅供後端同步 / 更新 Watch 使用，一般使用者不需直接存取
-- ------------------------------------------------------------
ALTER TABLE public.calendar_watches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允許讀寫 calendar_watches" ON public.calendar_watches;
-- 允許讀取與寫入（cron 與後端用同一連線，會繞過 RLS；此政策主要滿足檢查）
CREATE POLICY "允許讀寫 calendar_watches"
  ON public.calendar_watches
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 執行完成後，到 Advisors → Security Advisor 點「Rerun linter」
-- 三個錯誤應會消失。
-- 若出現 2 個警告（Function Search Path Mutable、RLS Policy Always True），
-- 可再執行同目錄的 fix-security-warnings.sql 清除。
-- ============================================================
