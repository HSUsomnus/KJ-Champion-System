# Design — 10 Zeabur 專案分離

## 目標架構

```
Zeabur project: kj-champion（正式環境，現有）
├── postgresql                    ← 公網路【關】、僅內網
└── kj-champion-system            ← prod 後端（main branch）
                                    DATABASE_URL → postgresql.zeabur.internal:5432

Zeabur project: kj-champion-dev（測試環境，新建）
├── postgresql-test               ← 公網路【開】（PC 維護用）
└── kj-champion-system-dev        ← dev 後端（dev branch）
                                    DATABASE_URL → postgresql-test.zeabur.internal:5432
```

## 設計決策

### D1：用「分 Zeabur 專案」而非「同專案分 namespace」

Zeabur 沒有 namespace 概念，**內網是 per-project 的單一平面網路**。同專案內任何服務都可透過 `<service>.zeabur.internal` 互通。

→ 唯一達成 dev 與 prod 完全隔離的方式 = 不同專案。

### D2：dev 後端 URL 接受 Zeabur 自動配發

確認過 Zeabur 不允許跨專案搶用 sub-domain。新 dev 後端會拿到全新隨機 URL（例如 `kj-champion-system-dev.zeabur.app` 已被舊服務佔用，新服務需用如 `kj-champion-system-dev-xxx.zeabur.app`）。

接受新 URL 是最簡單的路徑 — 影響範圍只有：
- `frontend/public/_worker.js` 的 `resolveBackend()` 一行
- LINE Console 加一條 callback URL（保留舊條以利回滾）
- Cloudflare Pages 環境變數（若有）

### D3：prod DB 公網路關閉時機 — 10.13 切兩步驗證後再關

舊路徑（直接關）的風險：若 prod 後端 `DATABASE_URL` 正好是公網字串（不是內網），關掉公網後 prod 站立即斷線。

新路徑（兩步驗證）：
1. **驗證階段**：去 Zeabur prod 後端 → Variables 看 `DATABASE_URL` 起頭。若是 `postgresql://root:...@postgresql.zeabur.internal:5432/...` → ✅ 走內網
2. **切換階段**：toggle 關公網 → 立刻開 prod 站 `https://kj-champion-system.pages.dev` 登入測試 → 失敗 → 立刻 toggle 開回來

### D4：prod 密碼旋轉合併進 10.12

原 08.8 為獨立 task，但時機與 10.13（關公網）強相關：

- 公網關閉前：密碼是唯一防線且已暴露 → 立即旋轉
- 公網關閉後：即使舊密碼洩漏也無公網存取點

兩動作須同 session 完成，避免「旋轉完忘了關公網」或「關完公網才想到還沒旋轉」的不完整狀態。

### D5：08 處理 — 暫時凍結，09 完成後 archive

不直接刪除 08 資料夾，保留歷史紀錄。09 完成時：

- 在 08 的 `tasks.md` 頂部加 `> Status: Superseded by 09 (2026-04-25)`
- 將 08 移到 `openspec/changes/_archived/08-dev-test-database/`
- STATUS.md 把 08 標 `✅ ARCHIVED — superseded by 09`

## 跨專案的資料流邊界

完成後資料流為：

```
prod 用戶 → Cloudflare Pages（kj-champion-system.pages.dev）
        → _worker.js proxy → kj-champion-system.zeabur.app（kj-champion 專案）
        → postgresql.zeabur.internal（kj-champion 專案內網）
        ─ ─ ─ 物理隔離 ─ ─ ─
dev 開發 → Cloudflare Pages（kjcs-dev.pages.dev）
        → _worker.js proxy → kj-champion-system-dev-xxx.zeabur.app（kj-champion-dev 專案）
        → postgresql-test.zeabur.internal（kj-champion-dev 專案內網）
```

兩條路徑在 Zeabur 內部沒有任何網路連通點。

## 驗證 checklist（10.10）

| 項目 | 預期結果 |
|---|---|
| 開 `kjcs-dev.pages.dev` | dev 站正常顯示 |
| dev 站 LINE 登入 | 跳轉到新 callback URL，登入成功 |
| dev 站新增一筆事件 | 寫入新 test DB |
| 連入舊 postgresql-test 看資料 | 確認 10.11 砍掉前那筆事件**不在**舊 DB |
| 連入新 postgresql-test 看資料 | 那筆事件在新 DB 內 |
| 開 `kj-champion-system.pages.dev`（prod） | 完全正常，與 dev 行為獨立 |
| 在 dev 站做寫入 → 切去 prod 站 | prod 站完全看不到 dev 寫的資料 |

## 回滾路徑

| 階段 | 失敗如何回滾 |
|---|---|
| 10.4 新後端建立失敗 | 砍掉新 dev 後端服務，重建 |
| 10.7 _worker.js 改錯 dev 連不到 | git revert _worker.js commit |
| 10.10 驗證失敗 | 暫不刪舊服務（10.11），舊 dev URL 仍可回退 |
| 10.13 prod 公網關掉後 prod 站炸 | 立刻 toggle 開回公網（< 30 秒回復）|
| 10.12 密碼旋轉後 prod 站炸 | 用舊密碼登入 Zeabur dashboard 改回（前提舊密碼還記得）→ 此 task 前必須**寫好回滾草稿**|

---

*建立日期：2026-04-25*
