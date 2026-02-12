/**
 * 批次更新腳本：為所有舊行程補上顏色 + 生日行程加 🎂
 * 
 * 使用方式：node scripts/batch-update-colors.js
 * 
 * 這個腳本會做兩件事：
 *   1. 根據行程類型補上 Google Calendar 顏色
 *      學員上課 → colorId 5（Banana 香蕉黃）
 *      活動     → colorId 11（Tomato 番茄紅）
 *      諮詢簽約 → colorId 10（Basil 羅勒綠）
 *   2. 生日行程標題加上 🎂 Emoji（例如「小明生日」→「🎂 小明生日」）
 */

// 載入環境變數（.env 檔）
require('dotenv').config();

// 引用行事曆服務
const { batchUpdateEventColors } = require('../server/services/calendarService');

async function main() {
  console.log('🎨 開始批次更新 Google Calendar 行程（顏色 + 生日標題）...\n');

  try {
    // 執行批次更新
    const result = await batchUpdateEventColors();

    console.log('\n📊 最終統計：');
    console.log(`   行程總數：${result.total}`);
    console.log(`   顏色更新：${result.colorUpdated} 筆`);
    console.log(`   標題加 🎂：${result.titleUpdated} 筆`);
    console.log(`   已跳過：  ${result.skipped} 筆（顏色已正確且標題不需更新）`);
    console.log(`   失敗：    ${result.errors} 筆`);
    console.log('\n✅ 完成！打開 Google Calendar 看看效果吧 🎉');
  } catch (error) {
    console.error('\n❌ 執行失敗:', error.message);
    process.exit(1);
  }
}

// 執行
main();
