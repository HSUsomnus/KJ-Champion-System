/**
 * import-csv-to-dev.js
 * 將 CSV 匯入 dev DB（UPSERT，不 TRUNCATE）
 *
 * 完整流程（backup DB 不需開公網）：
 *   1. 瀏覽器開啟：
 *      https://kj-champion-system.zeabur.app/api/admin/export-backup-csv?table=members
 *      Header: Authorization: Bearer <ADMIN_SECRET>
 *      → 下載 members-backup-YYYY-MM-DD.csv
 *   2. 將 CSV 放到 scripts/csv-export/members.csv（檔名去掉日期）
 *   3. 執行本腳本：
 *      DEV_DATABASE_URL="postgresql://..." node scripts/import-csv-to-dev.js members
 *
 * DEV_DATABASE_URL：Zeabur → kj-champion → postgresql-dev → 連線字串（公網常開）
 *
 * 其他用法：
 *   node scripts/import-csv-to-dev.js                  # 匯入 csv-export/ 所有 CSV
 *   node scripts/import-csv-to-dev.js members events   # 指定多個 table
 */

'use strict'
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const DEV_URL = process.env.DEV_DATABASE_URL
if (!DEV_URL) {
  console.error('❌ 請設定 DEV_DATABASE_URL 環境變數')
  console.error('   DEV_DATABASE_URL="postgresql://..." node scripts/import-csv-to-dev.js [table1] [table2]')
  process.exit(1)
}

const requestedTables = process.argv.slice(2)
const CSV_DIR = path.join(__dirname, 'csv-export')

// RFC 4180 CSV 解析（支援 quoted fields、"" escape、換行）
function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const result = []
  let field = ''
  let inQuotes = false
  let row = []

  for (let i = 0; i < lines.length; i++) {
    const ch = lines[i]

    if (inQuotes) {
      if (ch === '"') {
        if (lines[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\n') {
        row.push(field)
        field = ''
        result.push(row)
        row = []
      } else {
        field += ch
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field)
    result.push(row)
  }

  if (result.length === 0) return { headers: [], rows: [] }
  const headers = result[0]
  const rows = result.slice(1).map(vals =>
    Object.fromEntries(headers.map((h, i) => [h, vals[i] === '' ? null : vals[i]]))
  )
  return { headers, rows }
}

async function getPrimaryKey(pool, table) {
  const { rows } = await pool.query(`
    SELECT kcu.column_name
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
    LIMIT 1
  `, [table])
  return rows[0]?.column_name || null
}

async function main() {
  if (!fs.existsSync(CSV_DIR)) {
    console.error(`❌ 找不到 ${CSV_DIR}，請先執行 export-backup.js`)
    process.exit(1)
  }

  let tables
  if (requestedTables.length > 0) {
    tables = requestedTables
  } else {
    tables = fs.readdirSync(CSV_DIR)
      .filter(f => f.endsWith('.csv'))
      .map(f => f.replace('.csv', ''))
  }

  if (tables.length === 0) {
    console.error('❌ 沒有可匯入的 CSV，請先執行 export-backup.js')
    process.exit(1)
  }

  console.log(`📥 準備匯入 ${tables.length} 個 table：${tables.join(', ')}\n`)

  const pool = new Pool({ connectionString: DEV_URL, max: 3, connectionTimeoutMillis: 8000 })

  try {
    for (const table of tables) {
      const filePath = path.join(CSV_DIR, `${table}.csv`)
      if (!fs.existsSync(filePath)) {
        console.log(`⏭  ${table}：找不到 ${table}.csv，跳過`)
        continue
      }

      const content = fs.readFileSync(filePath, 'utf8').trim()
      const { headers, rows } = parseCSV(content)
      if (rows.length === 0) {
        console.log(`⏭  ${table}：CSV 無資料，跳過`)
        continue
      }

      const pkCol = await getPrimaryKey(pool, table)
      const colList = headers.map(c => `"${c}"`).join(', ')
      const client = await pool.connect()

      try {
        await client.query('BEGIN')
        let count = 0

        for (const row of rows) {
          const vals = headers.map(h => row[h])
          const placeholders = headers.map((_, i) => `$${i + 1}`).join(', ')

          if (pkCol && headers.includes(pkCol)) {
            const updateSet = headers
              .filter(c => c !== pkCol)
              .map(c => `"${c}" = EXCLUDED."${c}"`)
              .join(', ')
            await client.query(
              `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})
               ON CONFLICT ("${pkCol}") DO UPDATE SET ${updateSet}`,
              vals
            )
          } else {
            await client.query(
              `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
              vals
            )
          }
          count++
        }

        await client.query('COMMIT')
        console.log(`✅ ${table}：UPSERT ${count} 筆`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`❌ ${table}：${err.message}`)
      } finally {
        client.release()
      }
    }

    console.log('\n✔ 匯入完成')
  } finally {
    await pool.end().catch(() => {})
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
