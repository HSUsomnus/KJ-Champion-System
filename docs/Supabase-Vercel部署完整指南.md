# Supabase + Vercel 部署完整指南

> 本文件說明如何將 LINE LIFF 行事曆應用從 Google Sheets 遷移至 Supabase PostgreSQL，並部署於 Vercel Serverless 平台。

---

## 一、遷移前準備

### 1.1 確認現有資料

執行以下指令，匯出現有成員資料作為備份：

```bash
# 暫時保留 Google Sheets 連線，先匯出資料
node scripts/seed-members.js  # 可選：查看現有成員
```

### 1.2 安裝新依賴

```bash
npm install pg uuid
```

---

## 二、Supabase 設定

### 2.1 建立專案

1. 前往 [Supabase](https://supabase.com)
2. 點選「New Project」
3. 選擇組織、輸入專案名稱（例如：`line-liff-calendar`）
4. 設定密碼、選擇區域（建議：**Singapore** 或 **Tokyo**，台灣用戶延遲較低）
5. 等待專案建立完成（約 1～2 分鐘）

### 2.2 取得連線資訊

在 Supabase Dashboard：

1. 點選專案後，在**頁面頂部**找到 **Connect** 按鈕（右上角，專案名稱旁）
2. 點擊 **Connect** 開啟「Connect to your project」視窗
3. 確認 **Connection string** 分頁
4. 在 **Method** 下拉選單選擇 **Transaction pooler**（適合 Vercel Serverless，port 6543）
5. 複製顯示的連線字串，貼到 `.env` 的 `DATABASE_URL`

> ⚠️ **務必使用 Transaction pooler！** 若使用 Direct connection（port 5432），本機連線常會出現 `ETIMEDOUT`，因為 Direct 需 IPv6，多數家用網路不支援。Transaction pooler（port 6543）支援 IPv4。

> 💡 **找不到 Connect 按鈕？** 可直接開啟：
> `https://supabase.com/dashboard/project/你的專案ID?showConnect=true&method=transaction`

### 2.3 執行 SQL Schema

在 Supabase Dashboard：

1. 左側選單 → **Build** → **SQL Editor**（或直接點左側 **SQL Editor**）
2. 點選 **+ New query** 建立新查詢
3. 複製 `database/schema.sql` 的內容貼上
4. 點選 **Run** 執行
5. 確認建立成功（左側選單 → **Table Editor** 可看到 `members`、`events`、`calendar_watches` 三張表）

> 💡 **找不到 SQL Editor？** 可直接開啟：
> `https://supabase.com/dashboard/project/你的專案ID/editor/sql`

---

## 三、Vercel 設定

### 3.1 匯入專案

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點選「Add New...」→「Project」
3. 選擇 **Import Git Repository**，連結 GitHub 倉庫（如 `HSUsomnus/line-LIFF-calendar`），選 `main` 分支
4. **Framework Preset**：選擇 **Other**
   - 本專案使用 `vercel.json` 自訂 `api/` 結構，選 Other 較保險；若出現「Express」選項也可選，Vercel 會依照 `vercel.json` 建置
5. **Root Directory**：保持 `./`（預設）
6. **Build and Output Settings**：保持**關閉**（不要覆寫）
   - 讓 Vercel 依照 `vercel.json` 的 `builds` 與 `routes` 建置，無需自訂 Build Command
7. 點選 **Deploy** 前，先到下方 **Environment Variables** 新增必要變數（見 3.2）

### 3.2 設定環境變數

在「New Project」頁面下方的 **Environment Variables** 區塊：

- **手動新增**：Key / Value 逐一輸入
- **或使用「Import .env」**：點選後選擇本機 `.env` 檔案，可一次匯入（注意：部署前請移除敏感值或確認 `.env` 未提交至 Git）

新增以下環境變數：

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `DATABASE_URL` | Supabase 連線字串（Transaction Mode） | `postgresql://postgres....` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Service Account Email | `xxx@xxx.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Google Service Account 私鑰 | `-----BEGIN PRIVATE KEY-----\n...` |
| `GOOGLE_PROJECT_ID` | Google Cloud 專案 ID | `line-liff-calendar` |
| `GROUP_CALENDAR_ID` | 團體日曆 ID | `xxx@group.calendar.google.com` |
| `LIFF_ID` | LINE LIFF ID | `2008916605-xxx` |
| `LINE_CHANNEL_ID` | LINE Channel ID | `2008916605` |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret | `xxx` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token | `xxx` |
| `APP_URL` | Vercel 部署後的網址 | `https://your-project.vercel.app` |
| `CRON_SECRET` | Cron 認證密鑰（選填） | `your-random-secret` |
| `NODE_ENV` | 環境 | `production` |

**注意**：
- `GOOGLE_PRIVATE_KEY` 中的換行需保留 `\n`
- `APP_URL` 首次部署後才會知道，可先留空，部署後再補上

### 3.3 部署

點選「Deploy」，Vercel 會自動：
1. 建置專案
2. 部署為 Serverless Function
3. 提供網址（例如：`https://line-liff-xxx.vercel.app`）

---

## 四、資料遷移

> ⚠️ **執行腳本請用 PowerShell**（不要用 WSL bash）。在 bash 下執行可能無輸出或逾時。先 `cd` 到專案目錄再執行。

### 4.1 遷移成員資料

確保 `.env` 中 `DATABASE_URL`（須為 Transaction pooler）、`MEMBER_SHEET_ID`、`MEMBER_SHEET_NAME` 都有設定，執行：

```powershell
# 先切到專案目錄
cd "C:\Users\你的使用者名稱\OneDrive\桌面\My Project\Line_Liff"
node scripts/migrate-sheet-to-supabase.js
```

預期輸出：
```
🔄 開始遷移 Google Sheets 成員資料至 Supabase...
📥 從 Google Sheets 讀取成員資料...
✅ 成功讀取 X 筆成員
📤 寫入 Supabase PostgreSQL...
進度: X/X
✅ 遷移完成！
   - 新增: X 筆
   - 更新: 0 筆
   - 總計: X 筆
```

### 4.2 初次同步行程

```powershell
node scripts/sync-calendar-to-supabase.js
```

若無輸出，改用 `node scripts/sync-calendar-to-supabase.js 2>&1` 查看錯誤。

預期輸出：
```
🔄 開始初次同步 Google Calendar 行程至 Supabase...
📅 同步範圍: 2026-01-01 ~ 2026-06-30
✅ 從 Calendar 取得 X 筆行程
✅ Upsert X 筆行程至 Supabase
✅ 初次同步完成！
```

### 4.3 註冊 Calendar Watch

更新 `.env` 的 `APP_URL` 為 Vercel 提供的網址後，執行：

```powershell
node scripts/register-calendar-watch.js
```

預期輸出：
```
📡 開始註冊 Google Calendar Watch 通道...
✅ Watch 通道註冊成功！
   - Channel ID: liff-calendar-xxx
   - Resource ID: xxx
   - 到期時間: 2026-02-15 ...
```

---

## 五、驗證與測試

### 5.1 本機測試（連 Supabase）

在 `.env` 設定 `DATABASE_URL`，執行：

```bash
npm run dev
```

開啟 `http://localhost:8080`，測試：
- 成員列表：`/members.html`
- 個人資料：`/profile.html`
- 行事曆：`/index.html`

### 5.2 Vercel 部署後測試

前往 LINE LIFF URL（`https://liff.line.me/{LIFF_ID}`），測試：
- 成員列表載入
- 個人資料註冊/更新
- 行事曆當日/月份行程顯示
- 新增/編輯/刪除行程

### 5.3 測試 Webhook（Calendar 更新同步）

1. 在 Google Calendar 網頁版手動新增一筆行程
2. 等待約 15 分鐘（Cron 觸發）或觸發 Webhook
3. 回到 LIFF 重新整理，確認新行程已顯示

---

## 六、Vercel Cron Job 狀態查看

在 Vercel Dashboard：

1. 選擇專案 → **Settings** → **Cron Jobs**
2. 查看已註冊的 Cron：
   - `/api/cron/sync`：每 15 分鐘
   - `/api/cron/renew-watch`：每天 0 點
3. 點選「Logs」查看執行紀錄

---

## 七、常見問題

### Q1：`password authentication failed for user "postgres"`

**A**：`DATABASE_URL` 的密碼錯誤。請到 Supabase Connect → 若忘記密碼可點「Reset your database password」，重設後更新 `.env`。密碼含 `@`、`#`、`%` 等特殊字元需 URL 編碼（例如 `@` → `%40`）。

### Q2：`connect ETIMEDOUT ... :5432`

**A**：表示使用了 Direct connection（port 5432），本機網路多數不支援 IPv6。請改用 **Transaction pooler**（port 6543）：Supabase Connect → Method 選 Transaction pooler → 複製新連線字串到 `DATABASE_URL`。

### Q3：執行腳本無輸出、卡住

**A**：請用 **PowerShell** 執行（勿用 WSL bash），並確認在專案目錄下。若仍無輸出，加 `2>&1` 查看錯誤：`node scripts/xxx.js 2>&1`。

### Q4：Vercel Serverless 冷啟動會影響效能嗎？

**A**：可能有 0.5～2 秒冷啟動延遲。Pro 方案可開啟 **Fluid Compute** 減少冷啟動。若流量穩定，Vercel 會自動保持部分 Function 為 warm 狀態。

### Q5：Supabase 免費額度夠用嗎？

**A**：免費額度：0.5 GB 儲存、100 CU-小時計算。小型團隊（10～20 人）通常在免費額度內。

### Q6：如何查看 Supabase 資料？

**A**：Supabase Dashboard → **Table Editor** → 選擇 `members` 或 `events`。

### Q7：Calendar Watch 到期會怎樣？

**A**：到期後不會收到 Google 的變更通知，但 Cron 仍會每 15 分鐘同步。Vercel Cron 每天會自動續期即將到期的 Watch。

### Q8：想回滾到 Google Sheets 怎麼辦？

**A**：
1. 在 Git 中切換到遷移前的 commit
2. 環境變數改回 `MEMBER_SHEET_ID`、`MEMBER_SHEET_NAME`
3. 重新部署

---

## 八、效能對比

| 項目 | Google Sheets / Calendar API 直讀 | Supabase + Vercel |
|------|-----------------------------------|-------------------|
| **API 配額** | 100 requests / 100秒 | 無 Sheets 配額限制 |
| **讀取延遲** | 200～500 ms | 50～150 ms |
| **多人同時使用** | 容易超配額 | 無配額問題 |
| **資料一致性** | 即時 | 15 分鐘延遲（可縮短至數秒，若啟用 Webhook） |

---

## 九、參考資源

- [Supabase 文件](https://supabase.com/docs)
- [Vercel 文件](https://vercel.com/docs)
- [Google Calendar API - Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [node-postgres (pg)](https://node-postgres.com/)
