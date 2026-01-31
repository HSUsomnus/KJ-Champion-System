# 第一次把專案推上 GitHub（安全版）

> 照這份做，**金鑰不會進 GitHub**，只推程式碼。

---

## 一、推上前確認（必做）

### 1. 金鑰與敏感檔有沒有被擋掉？

專案裡的 `.gitignore` 已經設定好，以下**不會**被推上去：

- `.env`、`.env.local`（環境變數）
- `Key/` 整個資料夾（金鑰、憑證、ID 等）
- 所有 `*.json`（除了 `package.json`、`package-lock.json`）
- `node_modules/`

**你要做的**：不要把金鑰寫在「沒被 .gitignore 擋掉的檔案」裡（例如不要寫在 `server/config/xxx.js` 裡）。

### 2. 本機有沒有 .env？

- 若有：確認 `.env` 在 `.gitignore` 裡（已有），就**不會**被 commit。
- 若沒有：可以複製 `env.example` 成 `.env`，把金鑰填在 `.env`，**不要**把 `.env` 推上去。

---

## 二、第一次推上 GitHub 的步驟

### 步驟 1：安裝 Git（若還沒裝）

- 到 [https://git-scm.com/downloads](https://git-scm.com/downloads) 下載並安裝。
- 或裝 **GitHub Desktop**（圖形介面）：[https://desktop.github.com/](https://desktop.github.com/)

### 步驟 2：在 GitHub 建立一個「空的」新 repo

1. 登入 [https://github.com](https://github.com)
2. 右上角 **+** → **New repository**
3. **Repository name**：例如 `Line_Liff` 或 `line-liff-calendar`
4. **Private** 或 **Public**：選 **Private** 較安心（只有你看得到）
5. **不要**勾選 "Add a README"（專案已經有 README）
6. 按 **Create repository**

### 步驟 3：在本機專案資料夾初始化 Git（若還沒有）

在專案資料夾（`Line_Liff`）開終端機，執行：

```bash
git init
```

（若已經有 `.git` 資料夾，這步可略過。）

### 步驟 4：確認沒有要推的敏感檔

執行：

```bash
git status
```

看一下 **Untracked files** 或 **Changes** 裡：

- **不該出現**：`.env`、`Key/`、任何金鑰檔、`node_modules/`
- 若出現 `.env` 或 `Key/`：代表它們**沒有**被 .gitignore 擋掉，先不要 `git add`，檢查 `.gitignore` 是否有 `Key/` 和 `.env`。

### 步驟 5：加入檔案並第一次 commit

```bash
git add .
git commit -m "第一次提交：LINE LIFF 行事曆專案（不含金鑰）"
```

（`git add .` 會依 `.gitignore` 排除該排除的檔案。）

### 步驟 6：連到 GitHub 並推送

GitHub 新建的 repo 頁面會有一串指令，例如：

```bash
git remote add origin https://github.com/你的帳號/你的repo名稱.git
git branch -M main
git push -u origin main
```

把 **你的帳號**、**你的 repo 名稱** 換成實際的，在專案資料夾執行這三行。

- 若 GitHub 要你登入：用瀏覽器登入或 Personal Access Token（不要用密碼）。
- 第一次 push 可能較久（檔案多）。

---

## 三、推上去之後

- **金鑰**：只留在本機 `.env` 或 `Key/`，或之後放在 Cloud Run 環境變數 / Secret Manager；**不要**從 GitHub 讀金鑰。
- **之後改程式**：改完就：
  ```bash
  git add .
  git commit -m "簡短說明你改了什麼"
  git push
  ```
- **GitHub 帳號**：建議開啟 **兩步驟驗證（2FA）**，在 Settings → Password and authentication。

---

## 四、若已經不小心把金鑰 push 上去了

1. **立刻**到 Google Cloud Console / LINE Developers 等後台，**撤銷或重新產生**那組金鑰。
2. 把金鑰從程式碼或 repo 裡刪掉，再 commit + push（歷史裡仍可能被看到，所以一定要換新金鑰）。
3. 若 repo 是公開的，當作那組金鑰已經外洩，**一定要換新的**。

---

## 五、一句話總結

**推上 GitHub 的只有「程式碼」；金鑰只放在本機 `.env`、`Key/`（不推）、或 Cloud Run / Secret Manager。**  
照這份做，就可以安心用 GitHub。
