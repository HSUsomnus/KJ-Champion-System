/**
 * export-backup.js
 * 從 backup DB 匯出所有 public table 為 CSV（儲存至 scripts/csv-export/）
 *
 * 使用前：
 *   1. Zeabur → kj-champion → postgresql-backup → 網路 → 連線埠轉送 → 暫時開啟公網
 *   2. 取得公網連線字串（格式：postgresql://root:<password>@<host>:<port>/zeabur）
 *
 * 執行：
 *   BACKUP_DATABASE_URL="postgresql://..." node scripts/export-backup.js
 *
 * 可選：只匯出指定 table
 *   BACKUP_DATABASE_URL="..." node scripts/export-backup.js members events
 */

'use strict'
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const BACKUP_URL = process.env.BACKUP_DATABASE_URL
if (!BACKUP_URL) {
  console.error('❌ 請設定 BACKUP_DATABASE_URL 環境變數')
  console.error('   BACKUP_DATABASE_URL="postgresql://..." node scripts/export-backup.js')
  process.exit(1)
}

const targetTables = process.argv.slice(2)
const OUT_DIR = path.join(__dirname, 'csv-export')

function toCSVField(value) {
  if (value === null || value === undefined) return ''
  const s = value instanceof Date ? value.toISOString() : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

async function main() {
  const pool = new Pool({ connectionString: BACKUP_URL, max: 2, connectionTimeoutMillis: 8000 })

  try {
    // 探索 table 清單
    let tables
    if (targetTables.length > 0) {
      tables = targetTables
    } else {
      const { rows } = await pool.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
      )
      tables = rows.map(r => r.tablename)
    }

    console.log(`📦 準備匯出 ${tables.length} 個 table：${tables.join(', ')}\n`)

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM "${table}"`)

      if (rows.length === 0) {
        console.log(`⏭  ${table}：無資料，跳過`)
        continue
      }

      const cols = Object.keys(rows[0])
      const lines = [
        cols.join(','),
        ...rows.map(row => cols.map(c => toCSVField(row[c])).join(',')),
      ]

      const filePath = path.join(OUT_DIR, `${table}.csv`)
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8')
      console.log(`✅ ${table}：${rows.length} 筆 → ${filePath}`)
    }

    console.log(`\n📁 CSV 已儲存至 scripts/csv-export/`)
    console.log('🔒 完成後請立刻關閉 backup DB 公網（Zeabur → postgresql-backup → 連線埠轉送）')
  } finally {
    await pool.end().catch(() => {})
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
