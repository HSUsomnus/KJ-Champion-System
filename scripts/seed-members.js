/**
 * 【開發用】寫入幾筆測試成員到 Google Sheet
 *
 * ✅ 特色：
 * - 只會新增「LINE ID 不存在」的資料，避免重複寫入
 * - 姓名會加上【測試】前綴，方便你之後刪除/辨識
 *
 * ⚠️ 安全提醒：
 * 這支腳本會「真的寫入」你的 Google Sheet。
 * 你必須先設定環境變數 CONFIRM_SEED=yes 才會執行。
 */

require('dotenv').config();

const sheetService = require('../server/services/sheetService');

// 產生 33 字元的測試 LINE ID（U + 32 個數字）
function makeTestLineId(digit) {
  return 'U' + String(digit).repeat(32);
}

async function main() {
  // 防呆：避免不小心寫入正式資料
  if (process.env.CONFIRM_SEED !== 'yes') {
    console.log('❌ 你尚未允許寫入測試資料。');
    console.log('請先在 PowerShell 設定：');
    console.log('  $env:CONFIRM_SEED=\"yes\"');
    console.log('然後再執行：');
    console.log('  npm run seed:members');
    process.exit(1);
  }

  console.log('🔎 讀取現有成員資料中...');
  const existing = await sheetService.getAllMembers();
  const existingIds = new Set(existing.map(m => m.lineId));

  const samples = [
    {
      lineId: makeTestLineId(2),
      name: '【測試】成員A',
      email: 'testA@example.com',
      phone: '0911000001',
      starLevel: '白星',
      courseRecord: '正式金流課, 財富藍圖課',
    },
    {
      lineId: makeTestLineId(3),
      name: '【測試】成員B',
      email: 'testB@example.com',
      phone: '0911000002',
      starLevel: '綠星',
      courseRecord: '財富實踐旅程, 群星計畫',
    },
    {
      lineId: makeTestLineId(4),
      name: '【測試】成員C',
      email: 'testC@example.com',
      phone: '0911000003',
      starLevel: '橙星',
      courseRecord: '夢想清單專班',
    },
    {
      lineId: makeTestLineId(5),
      name: '【測試】成員D',
      email: 'testD@example.com',
      phone: '0911000004',
      starLevel: '紅星',
      courseRecord: '正式金流課, 財富藍圖課, 財富實踐旅程',
    },
    {
      lineId: makeTestLineId(6),
      name: '【測試】成員E',
      email: 'testE@example.com',
      phone: '0911000005',
      starLevel: '紫星',
      courseRecord: '正式金流課, 財富藍圖課, 財富實踐旅程, 夢想清單專班, 群星計畫',
    },
    {
      lineId: makeTestLineId(7),
      name: '【測試】成員F',
      email: 'testF@example.com',
      phone: '0911000006',
      starLevel: '白星',
      courseRecord: '',
    },
    {
      lineId: makeTestLineId(8),
      name: '【測試】成員G',
      email: 'testG@example.com',
      phone: '0911000007',
      starLevel: '綠星',
      courseRecord: '正式金流課',
    },
    {
      lineId: makeTestLineId(9),
      name: '【測試】成員H',
      email: 'testH@example.com',
      phone: '0911000008',
      starLevel: '橙星',
      courseRecord: '財富藍圖課, 夢想清單專班',
    },
    {
      lineId: makeTestLineId(10),
      name: '【測試】成員I',
      email: 'testI@example.com',
      phone: '0911000009',
      starLevel: '紅星',
      courseRecord: '財富實踐旅程, 群星計畫',
    },
    {
      lineId: makeTestLineId(11),
      name: '【測試】成員J',
      email: 'testJ@example.com',
      phone: '0911000010',
      starLevel: '紫星',
      courseRecord: '正式金流課, 財富藍圖課, 群星計畫',
    },
  ];

  const toCreate = samples.filter(s => !existingIds.has(s.lineId));

  if (toCreate.length === 0) {
    console.log('✅ 不需要新增：測試成員已存在（依 LINE ID 判斷）');
    return;
  }

  console.log(`📝 準備新增 ${toCreate.length} 筆測試成員到 Sheet...`);
  for (const member of toCreate) {
    await sheetService.createMember(member);
    console.log(`✅ 已新增：${member.name}（${member.lineId}）`);
  }

  console.log('🎉 測試成員寫入完成！你現在可以到「成員」分頁看到它們。');
}

main().catch((err) => {
  console.error('❌ 寫入測試成員失敗：', err);
  process.exit(1);
});

