/**
 * 把 docs/康九_logo.png 複製到 public/images/logo.png
 * 讓靜態伺服器直接提供圖片，避免 404（路徑或中文檔名問題）
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'docs', '康九_logo.png');
const dir = path.join(root, 'public', 'images');
const dest = path.join(dir, 'logo.png');

if (!fs.existsSync(src)) {
  console.error('找不到來源檔案:', src);
  process.exit(1);
}
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.copyFileSync(src, dest);
console.log('已複製 logo 到 public/images/logo.png');
