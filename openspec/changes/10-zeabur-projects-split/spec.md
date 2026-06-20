# Spec: 10-zeabur-projects-split

> ✅ DONE（v2.1.0 已上線）

## 背景與範圍

prod / dev DB 全部塞在同一個 Zeabur 專案 `kj-champion` 裡，dev 後端理論上能透過內網連到 prod DB，任何 dev 設定錯誤都可能寫入 prod。prod DB 公網路也是開啟狀態，密碼是唯一防線。

### 目標

**將 dev 環境完整搬到獨立 Zeabur 專案，與 prod 物理隔離。完成後 prod DB 關閉公網路、僅內網存取。**

```
Zeabur project: kj-champion（正式環境）
├── postgresql              ← 公網關閉，內網 only
└── kj-champion-system      ← prod 後端（main branch）

Zeabur project: kj-champion-dev（測試環境）
├── postgresql-dev          ← 公網開（PC 維護用）
└── kj-champion-system-dev  ← dev 後端（dev branch）
```

### 影響範圍

- **Zeabur**：新增 `kj-champion-dev` 專案 + 兩個服務；舊專案刪兩個服務 + 改 prod DB 公網設定
- **程式碼**：`frontend/public/_worker.js` 的 dev URL（一行）
- **LINE Console**：新增 callback URL
- **08**：整個 archive 標記「superseded by 10」

---

## 技術設計

### 為何用分 Zeabur 專案而非同專案分 namespace

Zeabur 沒有 namespace 概念，**內網是 per-project 的單一平面網路**。同專案內任何服務都可透過 `<service>.zeabur.internal` 互通。唯一達成物理隔離的方式 = 不同專案。

### prod DB 公網關閉時機（兩步驗證）

1. **驗證**：確認 prod 後端 `DATABASE_URL` 起頭為 `postgresql://root:...@postgresql.zeabur.internal:5432/...`（走內網）
2. **切換**：toggle 關公網 → 立刻開 prod 站登入測試 → 失敗 → 立刻 toggle 開回來

### prod 密碼旋轉（合併進 10.12）

時機與關公網強相關：公網關閉前密碼是唯一防線且已暴露 → 必須在關公網同 session 完成旋轉。

### 回滾路徑

| 階段 | 回滾方式 |
|---|---|
| _worker.js 改錯 | `git revert` _worker.js commit |
| dev 驗證失敗 | 暫不刪舊服務，舊 dev URL 仍可回退 |
| prod 公網關掉後 prod 站炸 | 立刻 toggle 開回公網（< 30 秒回復）|
