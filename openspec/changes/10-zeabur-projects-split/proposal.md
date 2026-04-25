# Proposal — 10 Zeabur 專案分離（dev 環境完全隔離）

## 問題

目前 prod / dev / test DB 全部塞在同一個 Zeabur 專案 `kj-champion` 裡：

```
Zeabur project: kj-champion（單一專案）
├── postgresql              ← prod DB（公網開啟，僅靠密碼防線）
├── postgresql-test         ← test DB（公網開啟，08 剛建立）
├── kj-champion-system      ← prod 後端（main branch）
└── kj-champion-system-dev  ← dev 後端（dev branch）
```

導致幾個問題：

1. **prod DB 公網路目前是開的**（`43.163.196.8:30756`），密碼是唯一防線。密碼曾在 web Claude Code chat 紀錄暴露（08.8 已標記要旋轉）
2. **dev / prod 共享 Zeabur 內網**：dev 後端理論上能透過 `postgresql.zeabur.internal` 連到 prod DB（任何 dev 的設定錯誤、env var 誤填都可能寫入 prod）
3. **test DB 與 prod DB 同網段**：test DB 被攻破後可能成為 lateral movement 跳板
4. **權限管理粗糙**：未來增加共同開發者時，無法只給 dev 環境的存取

違反「main 永不被汙染」原則的物理路徑只關閉了**部分**（前端有 dev/prod 分流，但後端與資料庫沒做物理分隔）。

## 目標

**將 dev 環境完整搬到獨立 Zeabur 專案，與 prod 物理隔離。完成後 prod DB 可關閉公網路、僅內網存取。**

達成狀態：

```
Zeabur project: kj-champion（正式環境）
├── postgresql              ← prod DB（公網關閉，內網 only）
└── kj-champion-system      ← prod 後端（main branch，內網連 postgresql）

Zeabur project: kj-champion-dev（測試環境，新建）
├── postgresql-test         ← test DB（公網開啟供 PC 維護用）
└── kj-champion-system-dev  ← dev 後端（dev branch，內網連 postgresql-test）
```

## 解法

1. 在 Zeabur 新建專案 `kj-champion-dev`
2. 在新專案建立 `postgresql-test` 服務（取代舊 08 建立的，舊的會廢棄）
3. PC 跑 `pg_dump --schema-only` prod → 套用至新 test DB（重做 08.2/08.3，但目標換成新專案的 test DB）
4. 在新專案建立 `kj-champion-system-dev` 後端服務，連 dev branch
5. 設定新 dev 後端環境變數 `DATABASE_URL = postgresql-test.zeabur.internal:5432`（內網）
6. 取得新 dev 後端公網 URL（Zeabur 自動配發 `xxx.zeabur.app`）
7. 修改 `frontend/public/_worker.js` 的 `resolveBackend()` 指向新 dev URL
8. LINE Console 加新 dev callback URL（舊的暫保留以免回滾需要）
9. Cloudflare Pages preview branch 設定確認（dev URL 變更）
10. 驗證 dev 全鏈路：登入 / 看月曆 / 寫入 → 確認資料只進新 test DB
11. 砍掉舊 `kj-champion` 專案內的 `postgresql-test` 與 `kj-champion-system-dev` 服務
12. **08.8 旋轉 prod DB 密碼**（合併進來，因 prod 連線字串曾暴露）
13. 確認 prod 後端走內網 `postgresql.zeabur.internal` 沒問題後，關閉 `postgresql` 服務的公網路
14. 文件更新：NOW.md 設計決策、README、`.claude/rules/database.md`、`.claude/rules/deploy.md`

## 影響範圍

- **Zeabur**：新增 `kj-champion-dev` 專案 + 兩個服務；舊專案刪兩個服務 + 改 prod DB 公網路設定
- **程式碼**：`frontend/public/_worker.js` 的 dev URL（一行）
- **LINE Console**：新增 callback URL
- **Cloudflare Pages**：preview branch 設定（若 dev URL 變了）
- **正式環境**：prod 後端的 `DATABASE_URL` 不動（已是內網）；驗證 prod 站功能正常
- **本機 `.env`**：`TEST_DATABASE_URL` 換成新 test DB 公網字串

## 不做的事

- ❌ 不在這個 change 處理 test DB 的假資料 / 減敏複製（留給後續 change，先有空 schema 即可）
- ❌ 不改任何業務邏輯
- ❌ 不修改 prod 後端服務（只動其讀取的 DB 公網設定）
- ❌ 不改 GitHub repo 結構（仍單一 repo + main/dev branch）

## 與 08 的關係

08 已完成 08.1（建舊 postgresql-test）+ 08.2（pg_dump）+ 08.3（套 schema）。
09 完成後 08 的範圍會被取代：
- 08.1 建立的舊 postgresql-test → 10.11 砍掉
- 08.2 dump 出的 schema.sql → 流程可重用，但目標換成新 test DB
- 08.3 套用結果 → 隨舊 postgresql-test 一起廢棄

09 完成後，**08 整個 archive 標記「superseded by 09」**，08 的目標（dev 與 prod DB 隔離）由 09 以更徹底的物理隔離方式達成。

08.8（prod 密碼旋轉）合併進 09 的 10.12，因為時機與 prod 公網關閉強相關。

## 風險

| 風險 | 緩解 |
|---|---|
| 新 dev 後端 URL 變動，導致 LINE OAuth 跳錯 callback | LINE Console 同時保留新舊 callback URL，驗證通過再刪舊的 |
| Cloudflare Pages worker 仍指舊 dev URL 導致 dev 站打不開 | 10.7 修改 _worker.js 後立即驗證 dev 站 |
| prod DB 公網關掉後 prod 後端連不到 | 10.13 前先確認 prod 後端 env 是否為 internal hostname；先關 toggle 後立即測 prod 站 |
| 舊 dev 服務刪除前 dev branch 還在用 | 確認新 dev 後端跑通後再刪舊的 |

---

*建立日期：2026-04-25*
