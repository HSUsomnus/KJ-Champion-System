# Global Rules — 所有分支共用

## Git 分支關鍵字觸發

| 關鍵字 | 觸發動作 |
|--------|---------|
| **「新增功能」** | 詢問功能名稱，從 `main` 切出 `m_b_功能名稱`，push 到遠端 |
| **「修bug」** | 從 `main` 切出 `hotfix`，push 到遠端 |
| **「測試功能」** | 將功能分支 merge 進 `dev`，push `dev` |
| **「功能上線」** | 將功能分支 merge 回 `main`，push，刪除功能分支 |

## 分支架構

```
main          ← 正式上線，只接受功能分支 merge
  └─ m_b_*   ← 功能分支，從 main 切出，push 到遠端
dev           ← QA 測試，接收功能分支 merge，絕不 merge 回 main
hotfix        ← 緊急修復，從 main 切出
```

## 新增功能完整流程（一次做完）

```
1. git checkout main
2. git checkout -b m_b_功能名稱
3. 開發功能
4. 重寫 README（反映此功能分支現況）
5. git add <具體檔案>
6. git commit
7. git push origin m_b_功能名稱   ← 必做，不可省略
8. git checkout dev
9. git merge m_b_功能名稱
10. 重寫 README（反映 dev 現況）
11. git push origin dev
12. 告知使用者去測試
```

## 推送前必做（所有分支）

1. **重寫 README**（見 readme.md）
2. **機密檢查**：確認無硬編碼密碼、Token、私鑰
3. **git add 具體檔案**（禁止 git add -A）
4. **列出清單給使用者確認**，未確認不得 push

## 嚴禁行為

- ❌ 直接在 main 上開發
- ❌ 將 dev merge 回 main
- ❌ 功能分支只建本機不 push 到遠端
- ❌ push 前沒有重寫 README
- ❌ 使用 git add -A
