# Deploy Rules — git 操作或觸碰設定檔時注入

## 所有分支共用（必做）

### 推送前必做
1. **完整重寫 `README.md`**（每次推送必做，不是選擇性）：
   - 重新撰寫技術架構、功能清單、專案結構、部署說明
   - 頂部版本號更新為本次版本
   - 確保反映目前程式碼實際狀態，刪除過時資訊
2. **機密檢查**：
   - 確認 `.gitignore` 包含：`.env`、`.env.backup`、`Key/`、金鑰 `*.json`
   - 執行 `git status`，確認機密檔案不在清單中
   - 搜尋：長 Token、`-----BEGIN PRIVATE KEY-----`、寫死帳號密碼
3. **列出推送項目清單給使用者確認**，未確認不得執行 `git push`

### git 指令規範

```bash
git add <具體檔案>   # 禁止 git add -A，避免意外加入機密
git commit -m "feat/fix/chore: ..."
```

---

## 推送到 dev（測試站）

```bash
git checkout dev
git merge m_b_功能名稱
git push origin dev
```

- README 重寫：✅ 必做（反映 dev 現況）
- 機密檢查：✅ 必做
- CHANGELOG 更新：選擇性
- **⛔ 絕不從 dev push 到 main**

---

## 推送到 main（正式上線）

```bash
git push origin main
git tag X.Y.Z
git push --tags
```

**全部必做：**

1. 更新 `CHANGELOG.md`（最上方加入新版本，舊版保留）
2. 建立 `.claude/context/vX.Y.Z.md`（本版詳細上下文）
3. README 完整重寫
4. 機密檢查
5. 使用者**明確確認**後才執行（最高確認要求）
6. `git tag X.Y.Z && git push --tags`
