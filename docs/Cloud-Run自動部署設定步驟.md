# Cloud Run 自動部署設定步驟

當你 **push 到 GitHub 的 main 分支** 時，自動建置 Docker 映像並部署到 Cloud Run。

---

## 一、前置條件（先確認）

- [ ] 已有 **Google Cloud 專案**（例如你本機用的 `line-liff-calendar`）
- [ ] 專案已啟用 **Cloud Run API**、**Cloud Build API**、**Container Registry**（或 Artifact Registry）
- [ ] 程式碼已在 GitHub：**HSUsomnus/line-LIFF-calendar**（main 分支）
- [ ] 本機 `.env` 的金鑰與 ID 你都有（待會要填到 Cloud Run 環境變數）

若還沒啟用 API，在 [Google Cloud Console](https://console.cloud.google.com/) 選好專案後：

1. 左側選單 **「API 和服務」** → **「已啟用的 API 和服務」**
2. **「啟用 API 和服務」** → 搜尋並啟用：
   - **Cloud Run API**
   - **Cloud Build API**
   - **Artifact Registry API**（或 **Container Registry API**）

---

## 二、把 GitHub 連到 Google Cloud

1. 打開 [Google Cloud Console](https://console.cloud.google.com/) → 選你的專案。
2. 左側選單 **「Cloud Build」** → **「儲存庫」**（或 **Repositories**）。
3. 點 **「連結儲存庫」**（或 **Connect repository**）。
4. 來源選 **「GitHub (Cloud Build GitHub App)****。
   - 若第一次用：點 **「設定 Cloud Build GitHub 應用程式」**，依畫面登入 GitHub 並授權。
   - 授權完成後回到「連結儲存庫」。
5. 選擇你的 **GitHub 帳號**（HSUsomnus）→ 選 **「line-LIFF-calendar」**。
6. **「連結」** 完成後，儲存庫會出現在清單，記住 **區域名稱**（例如 `asia-east1`）和 **儲存庫名稱**（例如 `github_HSUsomnus_line-LIFF-calendar`）。

---

## 三、建立「推送到 main 就部署」的觸發程序

1. 左側 **「Cloud Build」** → **「觸發程序」**（Triggers）。
2. 點 **「建立觸發程序」**。
3. 依下表填寫：

| 欄位 | 建議值 |
|------|--------|
| **名稱** | `push-main-deploy`（或自訂） |
| **地區** | 選 **asia-east1**（與 cloudbuild 裡的 region 一致） |
| **事件** | **推送到分支**（Push to a branch） |
| **來源** | 選剛連結的 **line-LIFF-calendar** |
| **分支** | `^main$`（只對 main 分支觸發） |
| **設定** | **Cloud Build 設定檔**（yaml 或 json） |
| **位置** | **儲存庫** |
| **Cloud Build 設定檔路徑** | `cloudbuild.yaml`（專案根目錄） |

4. **「儲存」**。

之後每次 **push 到 main**，都會自動跑 `cloudbuild.yaml`：建置映像 → 推到 GCR → 部署到 Cloud Run。

---

## 四、第一次部署與環境變數

### 方式 A：先手動觸發一次，再在 Console 設環境變數（建議）

1. **手動觸發一次**  
   - **Cloud Build** → **觸發程序** → 點你剛建的觸發程序右側 **「執行」**（Run）。  
   - 或隨便改一個檔案後 `git push` 到 main。  
2. 等建置與部署完成（約 5～10 分鐘）。  
3. **設定環境變數**：  
   - 左側 **「Cloud Run」** → 點服務 **「line-liff-calendar」**。  
   - 上方 **「編輯與部署新修訂版本」**。  
   - 分頁 **「變數與密碼」**（Variables & Secrets）→ **「新增變數」**。  
   - 把本機 `.env` 裡用到的變數一筆一筆加進去（見下方清單）。  
   - **「部署」** 儲存。

之後每次 **push 到 main** 只會更新映像，環境變數會沿用，不用重設。

### 方式 B：用 gcloud 一次設定環境變數

若服務已經存在（至少跑過一次部署），可在本機執行（**把範例值全部改成你的**）：

```bash
gcloud run services update line-liff-calendar \
  --region=asia-east1 \
  --set-env-vars="GOOGLE_SERVICE_ACCOUNT_EMAIL=你的SA信箱,GOOGLE_PROJECT_ID=你的專案ID,GROUP_CALENDAR_ID=你的日曆ID@group.calendar.google.com,MEMBER_SHEET_ID=你的試算表ID,MEMBER_SHEET_NAME=成員資料,LIFF_ID=你的LIFF_ID,LINE_CHANNEL_ID=你的Channel_ID,LINE_CHANNEL_SECRET=你的Channel_Secret,LINE_CHANNEL_ACCESS_TOKEN=你的Access_Token,NODE_ENV=production,APP_URL=https://你的Cloud-Run網址.run.app"
```

**注意**：`GOOGLE_PRIVATE_KEY` 含多行與特殊字元，建議在 **Cloud Run Console → 變數與密碼** 裡手動貼上，或改用 **Secret Manager**。

### 環境變數清單（從本機 .env 對照）

| 變數名稱 | 說明 |
|----------|------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account 信箱 |
| `GOOGLE_PRIVATE_KEY` | 私鑰整段（含 -----BEGIN / END-----） |
| `GOOGLE_PROJECT_ID` | GCP 專案 ID |
| `GROUP_CALENDAR_ID` | 團體日曆 ID（@group.calendar.google.com） |
| `MEMBER_SHEET_ID` | Google 試算表 ID |
| `MEMBER_SHEET_NAME` | 試算表工作表名稱（例如 成員資料） |
| `LIFF_ID` | LINE LIFF ID |
| `LINE_CHANNEL_ID` | LINE Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot Channel Access Token |
| `NODE_ENV` | `production` |
| `APP_URL` | Cloud Run 服務網址（例如 `https://line-liff-calendar-xxxx-an.a.run.app`） |

選填：`LINE_ADD_FRIEND_URL`、`PORT`（預設 8080）、`REDIS_URL`。

---

## 五、部署完成後必做

1. **取得 Cloud Run 網址**  
   - Cloud Run → 點 **line-liff-calendar** → 上方 **「服務網址」** 複製。  
2. **把 `APP_URL` 設成這個網址**（在 Cloud Run 環境變數裡）。  
3. **到 LINE Developers**：LIFF 的 **Endpoint URL** 改為上述 Cloud Run 網址。

---

## 六、之後的流程

- 本機改程式 → `git add .` → `git commit -m "說明"` → `git push`（推到 main）。  
- GitHub 收到 push → Cloud Build 觸發 → 建置 → 部署到 Cloud Run。  
- 不需再手動建置或部署，只要維持環境變數與 LIFF Endpoint 正確即可。

---

## 七、常見問題

**Q：觸發程序沒跑？**  
- 確認分支是 **main**、儲存庫已正確連結、`cloudbuild.yaml` 在 repo 根目錄。  
- 到 **Cloud Build → 記錄** 看是否有觸發與錯誤訊息。

**Q：部署成功但網站 500 或無法連？**  
- 多半是環境變數漏設或錯誤（尤其是 `GOOGLE_PRIVATE_KEY`、`GROUP_CALENDAR_ID`、`LIFF_ID`）。  
- 到 **Cloud Run → line-liff-calendar → 記錄** 看錯誤日誌。

**Q：私鑰有多行怎麼填？**  
- 在 Console **變數與密碼** 裡貼上整段私鑰（含換行）；若用 gcloud，需保留 `\n` 換行符號。

**Q：成員列表／個人資料出現「取得成員資料失敗: DECODER routines::unsupported」？**  
- 代表 **GOOGLE_PRIVATE_KEY** 在 Cloud Run 裡格式錯誤（換行被破壞）。請到 **Cloud Run → 變數與密碼** 檢查：私鑰必須是完整 PEM（`-----BEGIN PRIVATE KEY-----` 到 `-----END PRIVATE KEY-----`），換行用 `\n` 或實際換行；修正後重新部署再測。

---

**總結**：連結 GitHub 儲存庫 → 建立「推送到 main」觸發程序 → 第一次部署後在 Cloud Run 設好環境變數與 `APP_URL` → 之後 push 到 main 即自動部署。
