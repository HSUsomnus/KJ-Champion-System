# 使用 Node.js 18 LTS 作為基礎映像檔
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴套件（只安裝生產環境需要的）
RUN npm ci --only=production

# 複製所有專案檔案
COPY . .

# 暴露埠號（Cloud Run 會自動設定 PORT 環境變數）
EXPOSE 8080

# 設定環境變數
ENV NODE_ENV=production

# 啟動應用程式
CMD ["node", "server/server.js"]
