# googleapis / gaxios 在 Zeabur Node.js 18 環境壞掉的根本原因

## 結論（TL;DR）

在 Zeabur 部署環境中，**不要用 `googleapis` 套件的 HTTP client（gaxios）打任何 Google API**。
改用 Node.js 原生 `https.request`。已在 `server/config/googleAuth.js` 封裝好 `calendarApiRequest()`。

---

## 原因一：gaxios@6+ 改用 undici（native fetch）

`googleapis` 的 HTTP 底層是 `gaxios`：

| 版本 | HTTP client | 說明 |
|---|---|---|
| `gaxios@5`（舊） | `node-fetch`（npm 套件） | 行為保守，相容性好 |
| `gaxios@6`（新） | `globalThis.fetch`（undici） | Node.js 18+ 自動啟用 |

`undici` 對 TCP 半關閉（half-close）比 `node-fetch` 敏感得多：Zeabur 容器到 Google API 之間有一層 NAT，NAT 在 HTTP 回應送完前有時會先關 TCP socket，`undici` 偵測到就拋 **`Premature close`**；`https.request` 對這種情況比較寬鬆，正常完成。

## 原因二：google-auth-library JWT 端點硬編碼舊 URL

`google-auth-library@9.x` 的 `JWT.refreshTokenNoCache()` 裡：

```js
// 硬編碼舊廢棄端點
const tokenUrl = 'https://www.googleapis.com/oauth2/v4/token';
```

JWT assertion 的 `aud` 欄位也是這個舊 URL。新端點 `oauth2.googleapis.com/token` 驗證 `aud` 不符，直接關連線 → `Premature close`。

覆寫 instance method（`getAccessToken`、`authorize`、`getRequestHeaders`）沒用，因為 `googleapis-common` 在內部呼叫 `auth.request()` → `OAuth2Client.refreshTokenNoCache()`，走的是另一條路。

---

## 修法（已實作，change 13）

### Token 換取

完全不走 `google-auth-library`，自己用 `crypto` + `https.request`：

```js
// server/config/googleAuth.js
const exchangeJWTForToken = (credentials) =>
  new Promise((resolve, reject) => {
    const tokenUrl = credentials._tokenUrl || TOKEN_URL;   // 讀 JSON 的 token_uri
    // 自己組 JWT assertion（aud 設正確端點）
    // 用 https.request POST 換 token
  });
```

### Calendar API 呼叫

完全不走 `googleapis` / `gaxios`，用封裝好的 helper：

```js
// server/config/googleAuth.js
const calendarApiRequest = ({ method, path, body, token }) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'www.googleapis.com', port: 443, path, method, headers: {...}, timeout: 15000 },
      ...
    );
  });

// 用法（server/services/calendarService.js）
const token = await getToken();
const { data } = await calendarApiRequest({ method: 'GET', path: `/calendar/v3/...`, token });
```

---

## 驗證依據

`server/routes/debug.js`（health check）從一開始就用 `https.request`，**一直沒壞**。
`calendarService.js` 改成同樣方式後，Zeabur 日誌確認同步成功：`synced=89, deleted=1`。

---

## 哪些地方還在用 googleapis

| 檔案 | 使用目的 | 狀態 |
|---|---|---|
| `server/services/calendarWatchService.js` | `getCalendarClient()` → push notification 訂閱 | 未修改（此功能暫未啟用） |
| `server/routes/line.js` | `getCalendarClient()` → LINE BOT 行事曆操作 | 未修改（待評估） |
| `server/routes/financial.js` | `getDriveClient()` → Google Drive | 未修改 |

若上述檔案在 Zeabur 出現 `Premature close`，同樣改用 `calendarApiRequest` 或對應的 raw `https.request` helper。

---

## 時間記錄

- 問題發現：2026-06 change 13 DEV 測試
- 修復驗證：2026-06-21（`synced=89, deleted=1`）
