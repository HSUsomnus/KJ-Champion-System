import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'

function argbToHex(argb) {
  if (!argb || typeof argb !== 'string') return null
  if (argb.length === 6) return `#${argb}`
  if (argb.length === 8) return `#${argb.slice(2)}` // AARRGGBB → #RRGGBB
  return null
}

function getCellStyle(cell) {
  if (!cell?.s) return {}
  const s = cell.s
  const style = {}

  // 背景色（只處理 solid fill）
  const fill = s.fill
  const fgColor = fill?.fgColor
  if (fill?.patternType === 'solid' && fgColor?.rgb) {
    const bg = argbToHex(fgColor.rgb)
    if (bg) style.background = bg
  }

  // 字體
  if (s.font?.bold) style.fontWeight = 600
  if (s.font?.italic) style.fontStyle = 'italic'
  if (s.font?.color?.rgb) {
    const color = argbToHex(s.font.color.rgb)
    if (color) style.color = color
  }
  if (s.font?.sz) style.fontSize = Math.min(Math.max(s.font.sz * 0.9, 10), 16)

  // 對齊
  const ha = s.alignment?.horizontal
  if (ha === 'center') style.textAlign = 'center'
  else if (ha === 'right') style.textAlign = 'right'
  else if (ha === 'left') style.textAlign = 'left'

  return style
}

function parseSheet(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const rows = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = sheet[addr]
      row.push({
        value: cell ? XLSX.utils.format_cell(cell) : '',
        style: getCellStyle(cell),
      })
    }
    rows.push(row)
  }

  // 合併儲存格
  const merges = {}
  ;(sheet['!merges'] || []).forEach(m => {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) {
          merges[`${r},${c}`] = { rowSpan: m.e.r - m.s.r + 1, colSpan: m.e.c - m.s.c + 1 }
        } else {
          merges[`${r},${c}`] = null // hidden
        }
      }
    }
  })

  // 欄寬
  const colWidths = (sheet['!cols'] || []).map(col => col?.wpx || col?.wch * 7 || 80)

  return { rows, merges, colWidths, colCount: range.e.c - range.s.c + 1 }
}

export default function FinancialPreview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('docId')
  const userId = searchParams.get('userId')
  const filename = decodeURIComponent(searchParams.get('filename') || '試算表')

  const [sheets, setSheets] = useState([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!docId || !userId) return
    setLoading(true)
    fetch(`/api/financial/download/${docId}?userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('下載失敗')
        return res.arrayBuffer()
      })
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true })
        const parsed = workbook.SheetNames.map(name => ({
          name,
          ...parseSheet(workbook.Sheets[name]),
        }))
        setSheets(parsed)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [docId, userId])

  const sheet = sheets[activeSheet]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-6 px-2">
        {/* 標題列 */}
        <div className="flex items-center gap-3 mt-4 mb-3 px-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
            style={{ background: '#EFEDE9' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="text-sm font-semibold truncate" style={{ color: '#2C2C2C' }}>{filename}</h1>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: '#8A8680' }}>載入中...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
          </div>
        )}

        {!loading && !error && sheets.length > 0 && (
          <>
            {/* Sheet tabs */}
            {sheets.length > 1 && (
              <div className="flex gap-1 mb-3 px-2 overflow-x-auto">
                {sheets.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => setActiveSheet(i)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all"
                    style={{
                      background: activeSheet === i ? '#4A7C59' : '#fff',
                      color: activeSheet === i ? '#fff' : '#2C2C2C',
                      border: `1px solid ${activeSheet === i ? '#4A7C59' : '#E2DED8'}`,
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* 表格 */}
            <div className="overflow-x-auto rounded-xl shadow-sm" style={{ border: '1px solid #E2DED8' }}>
              <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', background: '#fff' }}>
                {/* 欄標題 A B C... */}
                <thead>
                  <tr>
                    <th style={{ minWidth: 36, width: 36, background: '#F0EDE9', borderBottom: '1px solid #D0CCC6', borderRight: '1px solid #D0CCC6' }} />
                    {Array.from({ length: sheet.colCount }, (_, i) => (
                      <th
                        key={i}
                        style={{
                          width: sheet.colWidths[i] || 80,
                          minWidth: 60,
                          padding: '4px 6px',
                          fontSize: 11,
                          fontWeight: 500,
                          color: '#8A8680',
                          textAlign: 'center',
                          background: '#F0EDE9',
                          borderBottom: '1px solid #D0CCC6',
                          borderRight: '1px solid #E2DED8',
                          userSelect: 'none',
                        }}
                      >
                        {XLSX.utils.encode_col(i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row, ri) => (
                    <tr key={ri}>
                      {/* 列號 */}
                      <td style={{
                        width: 36,
                        minWidth: 36,
                        padding: '4px 6px',
                        fontSize: 11,
                        color: '#8A8680',
                        textAlign: 'center',
                        background: '#F0EDE9',
                        borderBottom: '1px solid #EFEDE9',
                        borderRight: '1px solid #D0CCC6',
                        userSelect: 'none',
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                      }}>
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => {
                        const mergeKey = `${ri},${ci}`
                        const merge = sheet.merges[mergeKey]
                        if (merge === null) return null // hidden by merge
                        return (
                          <td
                            key={ci}
                            rowSpan={merge?.rowSpan}
                            colSpan={merge?.colSpan}
                            style={{
                              padding: '4px 8px',
                              fontSize: 12,
                              color: '#2C2C2C',
                              borderBottom: '1px solid #EFEDE9',
                              borderRight: '1px solid #F0EDE9',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 200,
                              ...cell.style,
                            }}
                          >
                            {cell.value}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs mt-3 text-center px-2" style={{ color: '#8A8680' }}>
              {sheet.rows.length} 列 × {sheet.colCount} 欄
            </p>
          </>
        )}
      </main>
    </div>
  )
}
