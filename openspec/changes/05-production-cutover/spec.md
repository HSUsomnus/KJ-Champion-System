# Spec: 05-production-cutover

> ✅ DONE（Vercel / Supabase 已完全退場）

## 背景與範圍

React 前端（04/06）完成後，將 Cloudflare Pages 切換至 React 版本，完成自定義網域 DNS 設定，並停用所有舊服務（Vercel、Supabase）。

⚠️ Zeabur 正式後端已在 025 建立完成。本 change 聚焦於 React 版本上線與 Vercel / Supabase 完全退場。

### 步驟

1. 確認所有功能頁面在 React 版本驗證完畢
2. 更新 Zeabur 正式後端環境變數（若有 API 變動）
3. 正式網域 DNS 切換至 Cloudflare Pages（自定義網域）
4. 觀察穩定性 24 小時後停用 Vercel 前端
5. Vercel 完全退場，正式停用 Supabase

---

## 技術設計

### 切換原則

**順序**：後端先切 → 前端後切

**原因**：後端切換對使用者無感（前端不動），失敗回退成本低；前端切換才是用戶感知的切換點。

### Rollback 策略

| 階段 | 失敗情境 | 回退方式 |
| --- | --- | --- |
| 後端切換後 | 正式後端異常 | Vercel 後端仍在，前端 API URL 切回 Vercel |
| 前端切換後 | 正式前端異常 | DNS 切回 Vercel 前端（Vercel 保留至此階段確認完畢）|

### 風險緩解

| 風險 | 緩解方式 |
| --- | --- |
| 正式後端不穩定 | Vercel 後端保留至觀察 24 小時後才停用 |
| LINE OAuth 回調 URL 遺漏 | 切換前逐一確認 LINE Console 所有 Callback URL |
| DNS 傳播延遲 | 切換前確認 TTL 已降低，保留 Vercel 作為備援 |
| Supabase 意外仍有寫入 | 停用前確認 v1.5.4 後無任何 Supabase 連線字串殘留 |
