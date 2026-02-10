/**
 * 一次性遷移腳本：將 Google Sheet 成員資料匯入 Supabase PostgreSQL
 * 使用方式：node scripts/migrate-sheet-to-supabase.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// 暫時使用原有 sheetService 讀取 Google Sheets 資料
const sheetService = require('../server/services/sheetService');

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 開始遷移 Google Sheets 成員資料至 Supabase...\n');
    
    // 1. 從 Google Sheets 讀取成員資料
    console.log('📥 從 Google Sheets 讀取成員資料...');
    const members = await sheetService.getAllMembers();
    console.log(`✅ 成功讀取 ${members.length} 筆成員\n`);
    
    if (members.length === 0) {
      console.log('⚠️  沒有成員資料需要遷移');
      await pool.end();
      return;
    }
    
    // 2. 寫入 Supabase PostgreSQL
    console.log('📤 寫入 Supabase PostgreSQL...');
    let insertCount = 0;
    let updateCount = 0;
    
    for (const member of members) {
      try {
        const result = await pool.query(`
          INSERT INTO members (
            line_id, name, email, phone, star_level, course_record,
            picture_url, tesla_franchisee, team_responsibilities,
            volunteer_records, birthday, display_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (line_id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            star_level = EXCLUDED.star_level,
            course_record = EXCLUDED.course_record,
            picture_url = EXCLUDED.picture_url,
            tesla_franchisee = EXCLUDED.tesla_franchisee,
            team_responsibilities = EXCLUDED.team_responsibilities,
            volunteer_records = EXCLUDED.volunteer_records,
            birthday = EXCLUDED.birthday,
            display_name = EXCLUDED.display_name,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `, [
          member.lineId || '',
          member.name || '',
          member.email || '',
          member.phone || '',
          member.starLevel || '白星',
          member.courseRecord || '',
          member.pictureUrl || '',
          member.teslaFranchisee || '',
          member.teamResponsibilities || '',
          member.volunteerRecords || '',
          member.birthday || '',
          member.displayName || '',
        ]);
        
        // xmax = 0 表示是 INSERT，否則是 UPDATE
        if (result.rows[0].inserted) {
          insertCount++;
        } else {
          updateCount++;
        }
        
        process.stdout.write(`\r進度: ${insertCount + updateCount}/${members.length}`);
      } catch (error) {
        console.error(`\n❌ 處理成員 ${member.name} (${member.lineId}) 時發生錯誤:`, error.message);
      }
    }
    
    console.log(`\n\n✅ 遷移完成！`);
    console.log(`   - 新增: ${insertCount} 筆`);
    console.log(`   - 更新: ${updateCount} 筆`);
    console.log(`   - 總計: ${insertCount + updateCount} 筆\n`);
    
  } catch (error) {
    console.error('\n❌ 遷移失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 執行遷移
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('🎉 遷移腳本執行完畢');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 遷移腳本執行失敗:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
