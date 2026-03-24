# Tasks: 05-production-cutover

> ⬜ **待開始** — 前提：04-react-vite-pwa-frontend 全部通過
>
> ⚠️ Zeabur 正式後端、環境變數、LINE Console、Cloudflare Pages Production branch 已在 025-html-production-deploy 完成，本 change 僅處理 React 版本切換與 Vercel 退場。

---

## React 版本切換至正式環境

- [ ] 9.1 確認所有功能頁面在 React 版本驗證完畢
- [ ] 9.2 更新 Zeabur 正式後端環境變數（若 React 版本有 API 變動）
- [ ] 9.3 正式網域 DNS 切換至 Cloudflare Pages（自定義網域）
- [ ] 9.4 觀察正式環境 24 小時
- [ ] 9.5 停用 Vercel 前端服務（Vercel 完全退場）
- [ ] 9.6 正式停用 Supabase 專案
- [ ] 9.7 ✅ 遷移完成 🎯
