# Main Branch Rules — 在 main 分支時注入

## ⚠️ 你目前在 main 分支（正式上線服務）

**任何修改都直接影響真實用戶。謹慎操作。**

## 嚴格規則

- 不在 main 上直接開發，只接受從 staging merge 的驗證過內容
- WIP 代碼、未測試功能 → 禁止 push 到 main
- DB 是正式資料，任何 schema 變動需額外確認
- 不接受實驗性代碼

## 推送流程（完整版，全部必做）

1. 更新 `CHANGELOG.md`
2. 建立 `.claude/context/vX.Y.Z.md`
3. 完整重寫 `README.md`
4. 機密檢查
5. 列出項目清單，**使用者明確確認**
6. `git push origin main`
7. `git tag vX.Y.Z && git push --tags`

## 前端目錄

- main 分支的正式前端：`public/`
- 部署至：Cloudflare Pages（正式專案）
