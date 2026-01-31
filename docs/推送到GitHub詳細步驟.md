# 推送到 GitHub 詳細步驟

> 第二次機密掃描完成後的使用說明：確認無機密 → 推送到 GitHub → 觸發 Cloud Run 自動部署。

---

## 一、機密掃描結果（本次已檢查）

### ✅ 已修正／已排除的項目

| 項目 | 狀態 |
|------|------|
| `server/services/lineService.js` | 已移除硬編碼的 **GROUP_CALENDAR_ID**、**LINE 加好友連結**，改由環境變數提供 |
| `docs/權限設定修正指引.md` | 已將真實 **Google Sheets ID** 改為「你的SHEET_ID」範例 |
| `權限設定修正指引.md`（根目錄） | 同上 |
| `.env` | 已在 `.gitignore`，**不會**被 commit |
| `Key/` 資料夾 | 已在 `.gitignore`，**不會**被 commit |
| `*.json`（除 package） | 已在 `.gitignore`，金鑰 JSON **不會**被 commit |
| `env.example` | 僅為範例（your-liff-id、your-domain.com），無真實金鑰 |
| `cloudbuild.yaml` | 僅使用 `$PROJECT_ID` 變數，無硬編碼金鑰 |
| `node_modules/` | 已在 `.gitignore`，不會被 commit |

### ✅ 程式碼與文件檢查

- **server/**、**public/**：無硬編碼私鑰、Calendar ID、Sheets ID、LINE Token、LIFF ID。
- **DEPLOYMENT.md、SETUP*.md、第二步_設定API和LIFF.md** 等：僅為「範例」或「...」省略，無完整真實金鑰。
- **docs/發布前機密檢查清單.md**：僅以範例說明「不要寫什麼」，無真實機密。

### ⚠️ 推上前請你再確認一次

在終端機執行 `git status`，清單中**不應**出現：

- `.env`
- `Key/`
- 任何 `service-account-key.json` 或金鑰用 `.json`

若出現，代表曾 `git add` 過，請執行：`git reset HEAD .env`、`git reset HEAD Key/`。

---

## 二、推送到 GitHub 的詳細步驟

### 情境 A：專案「還沒有」連到 GitHub（第一次推送）

#### 1. 開啟終端機

- 在 Cursor / VS Code 按 **Ctrl + `** 開終端機，或從「終端機」選單開新終端機。
- 切到專案目錄：
  ```bash
  cd C:\Users\hu199\OneDrive\桌面\Line_Liff
  ```
  （若路徑有空格請用引號：`cd "C:\Users\hu199\OneDrive\桌面\Line_Liff"`）

#### 2. 確認沒有機密會被加入

```bash
git status
```

- 看輸出的「Untracked files」和「Changes not staged」。
- **不該出現**：`.env`、`Key/`、金鑰用 `.json`。
- 若一切正常，繼續下一步。

#### 3. 若專案還沒有 Git（第一次）

```bash
git init
```

（若已有 `.git` 資料夾可略過。）

#### 4. 加入要推送的檔案並提交

```bash
git add .
git status
```

- 再確認一次清單沒有 `.env`、`Key/`。
- 然後提交：
  ```bash
  git commit -m "發布版：移除硬編碼機密，可安全推送到 GitHub"
  ```

#### 5. 在 GitHub 建立新 repo

1. 打開 [https://github.com/new](https://github.com/new)
2. **Repository name**：例如 `Line_Liff` 或 `line-liff-calendar`
3. 選擇 **Private**（建議）或 Public
4. **不要**勾選 "Add a README"、"Add .gitignore"（專案已有）
5. 按 **Create repository**

#### 6. 把本機專案連到 GitHub 並推送

GitHub 建立完會顯示指令，或手動執行（把 `你的帳號`、`你的repo名稱` 換成你的）：

```bash
git remote add origin https://github.com/你的帳號/你的repo名稱.git
git branch -M main
git push -u origin main
```

- 若被要求登入：用瀏覽器登入 GitHub，或使用 **Personal Access Token**（Settings → Developer settings → Personal access tokens）。
- 第一次 push 完成後，程式碼就在 GitHub 上了。

---

### 情境 B：專案「已經」連到 GitHub（之後每次推送）

#### 1. 切到專案目錄並確認狀態

```bash
cd C:\Users\hu199\OneDrive\桌面\Line_Liff
git status
```

- 再次確認清單沒有 `.env`、`Key/`。

#### 2. 加入變更並提交、推送

```bash
git add .
git commit -m "簡短說明你改了什麼，例如：發布前機密檢查與修正"
git push
```

- 若分支是 `main` 且已設過 `-u origin main`，之後只要 `git push` 即可。

---

## 三、推送後讓 Cloud Run 自動部署（Auto run）

### 1. 在 Google Cloud Console 設定 Cloud Build 觸發器

1. 打開 [Google Cloud Console](https://console.cloud.google.com/) → 選你的專案。
2. 左側選單 **Cloud Build** → **觸發程序**。
3. **建立觸發程序**：
   - 名稱：例如 `push-to-main-deploy`
   - 事件：**推送到分支**
   - 來源：連到你的 **GitHub repo**（若還沒連，先完成 GitHub 連線）。
   - 分支：`^main$`（或你使用的分支名稱）。
   - 設定：**Cloud Build 設定檔**，路徑用 `cloudbuild.yaml`（專案根目錄）。
4. 儲存。

### 2. 環境變數要在 Cloud Run 設定

`cloudbuild.yaml` 只負責「建置 + 部署」，**不會**帶入你的 `.env`。  
所有金鑰、ID 要在 **Cloud Run** 服務的「環境變數」或 **Secret Manager** 裡設定：

- 路徑：Cloud Run → 選服務 `line-liff-calendar` → **編輯與部署新修訂版本** → **變數與密碼**。
- 變數清單見根目錄 **DEPLOYMENT.md**（例如 `GOOGLE_SERVICE_ACCOUNT_EMAIL`、`GOOGLE_PRIVATE_KEY`、`GROUP_CALENDAR_ID`、`LIFF_ID`、`LINE_CHANNEL_*`、`APP_URL` 等）。

### 3. 之後的流程

- 本機改程式 → `git add .` → `git commit -m "說明"` → `git push`
- GitHub 收到 push → 觸發 Cloud Build → 建置映像 → 部署到 Cloud Run  
（若觸發器有設好，就會自動跑。）

---

## 四、一句話總結

1. **機密**：只放在本機 `.env`、`Key/`（不推），或 Cloud Run / Secret Manager。  
2. **推送**：`git status` 確認無 `.env`、`Key/` → `git add .` → `git commit` → `git push`。  
3. **部署**：在 Cloud Run 設好環境變數，並在 Cloud Build 設定「推送到 main 就執行 cloudbuild.yaml」。

照這份做，就可以安全推送到 GitHub，並讓 Cloud Run 自動部署。
