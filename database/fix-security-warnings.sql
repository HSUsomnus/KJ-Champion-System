-- ============================================================
-- 修復 Security Advisor 的 2 個「警告」(Warnings)
-- 在 rls-policies.sql 執行成功後，若想清掉這兩個警告可執行本檔
-- 執行方式：Supabase Dashboard → SQL Editor 貼上並執行
-- ============================================================

-- ------------------------------------------------------------
-- 警告 1：Function Search Path Mutable
-- 為觸發器函式設定固定 search_path，避免搜尋路徑被改動造成風險
-- ------------------------------------------------------------
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;

-- ------------------------------------------------------------
-- 警告 2：RLS Policy Always True（calendar_watches）
-- 該表只有後端 / cron 會用（且用 DATABASE_URL 會繞過 RLS），
-- 不需要給 anon 任何權限；刪除過於寬鬆的政策後，僅後端可存取
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "允許讀寫 calendar_watches" ON public.calendar_watches;

-- ------------------------------------------------------------
-- Info：RLS Enabled No Policy（calendar_watches 有 RLS 但沒有政策）
-- 加一條「拒絕 anon」的政策：條件永遠不成立，等於匿名者無法存取；
-- 後端用 DATABASE_URL 會繞過 RLS，不受影響
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "calendar_watches 僅後端存取" ON public.calendar_watches;
CREATE POLICY "calendar_watches 僅後端存取"
  ON public.calendar_watches
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- 執行完成後，到 Advisors → Security Advisor 點「Rerun linter」
-- 兩個警告與一個 Info 應會消失。
-- ============================================================
