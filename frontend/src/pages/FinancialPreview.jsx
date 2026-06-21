import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/xspreadsheet.css'
import * as XLSX from 'xlsx'
import { useAuth } from '../contexts/AuthContext'

// Office 預設 theme 顏色（index 0-9）
const THEME_COLORS = [
  'FFFFFF','000000','E7E6E6','44546A',
  '4472C4','ED7D31','A5A5A5','FFC000',
  '5B9BD5','70AD47',
]

// Excel 標準 indexed 色盤（index 0-63），index 64 = auto（透明/預設）
// 來源：OOXML 規格 §18.8.27
const INDEXED_COLORS = [
  '000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF',
  '000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF',
  '800000','008000','000080','808000','800080','008080','C0C0C0','808080',
  '9999FF','993366','FFFFCC','CCFFFF','660066','FF8080','0066CC','CCCCFF',
  '000080','FF00FF','FFFF00','00FFFF','800080','800000','008080','0000FF',
  '00CCFF','CCFFFF','CCFFCC','FFFF99','99CCFF','FF99CC','CC99FF','FFCC99',
  '3366FF','33CCCC','99CC00','FFCC00','FF9900','FF6600','666699','969696',
  '003366','339966','003300','333300','993300','993366','333399','333333',
]

function applyTint(hex, tint) {
  let r = parseInt(hex.slice(0,2),16)
  let g = parseInt(hex.slice(2,4),16)
  let b = parseInt(hex.slice(4,6),16)
  if (tint > 0) {
    r = Math.round(r + (255-r)*tint)
    g = Math.round(g + (255-g)*tint)
    b = Math.round(b + (255-b)*tint)
  } else {
    r = Math.round(r*(1+tint))
    g = Math.round(g*(1+tint))
    b = Math.round(b*(1+tint))
  }
  return [r,g,b].map(v => Math.min(255,Math.max(0,v)).toString(16).padStart(2,'0')).join('')
}

function resolveColor(colorObj) {
  if (!colorObj) return null
  // auto（index 64）= 預設色，視為無色
  if (colorObj.auto || colorObj.indexed === 64) return null
  if (colorObj.rgb) {
    // SheetJS 有時回傳 AARRGGBB 8 碼，去掉前兩碼 alpha
    const hex = colorObj.rgb.length === 8 ? colorObj.rgb.slice(2) : colorObj.rgb
    return `#${hex}`
  }
  if (colorObj.indexed !== undefined) {
    const base = INDEXED_COLORS[colorObj.indexed]
    return base ? `#${base}` : null
  }
  if (colorObj.theme !== undefined) {
    const base = THEME_COLORS[colorObj.theme]
    if (!base) return null
    return `#${colorObj.tint ? applyTint(base, colorObj.tint) : base}`
  }
  return null
}

function workbookToXSpreadsheet(workbook) {
  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    const ref = sheet['!ref']
    if (!ref) return { name, rows: {} }

    const range = XLSX.utils.decode_range(ref)
    const rows = {}

    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells = {}
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = sheet[addr]
        if (!cell) continue
        const cellData = { text: XLSX.utils.format_cell(cell) }
        const s = cell.s
        if (s) {
          if (s.fill?.patternType === 'solid' && s.fill?.fgColor) {
            const bg = resolveColor(s.fill.fgColor)
            if (bg && bg.toUpperCase() !== '#FFFFFF') cellData.bgcolor = bg
          }
          if (s.font?.bold) cellData.bold = true
          if (s.font?.italic) cellData.italic = true
          if (s.font?.color) {
            const fc = resolveColor(s.font.color)
            if (fc && fc.toUpperCase() !== '#000000') cellData.color = fc
          }
          const ha = s.alignment?.horizontal
          if (ha === 'center') cellData.align = 'center'
          else if (ha === 'right') cellData.align = 'right'
        }
        cells[c] = cellData
      }
      if (Object.keys(cells).length > 0) rows[r] = { cells }
    }

    // 欄寬
    const cols = {}
    ;(sheet['!cols'] || []).forEach((col, i) => {
      if (col?.wpx) cols[i] = { width: col.wpx }
      else if (col?.wch) cols[i] = { width: Math.round(col.wch * 7) }
    })

    // 合併儲存格
    const merges = (sheet['!merges'] || []).map(m =>
      `${XLSX.utils.encode_cell(m.s)}:${XLSX.utils.encode_cell(m.e)}`
    )

    return { name, rows, cols, merges }
  })
}

export default function FinancialPreview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('docId')
  const userId = searchParams.get('userId')
  const filename = decodeURIComponent(searchParams.get('filename') || '試算表')

  const containerRef = useRef(null)
  const spreadsheetRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!docId || !userId || !containerRef.current) return
    setLoading(true)

    fetch(`/api/financial/download/${docId}?userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('下載失敗')
        return res.arrayBuffer()
      })
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true })
        const data = workbookToXSpreadsheet(workbook)

        if (spreadsheetRef.current) {
          spreadsheetRef.current.loadData(data)
        } else {
          spreadsheetRef.current = new Spreadsheet(containerRef.current, {
            mode: 'read',
            showToolbar: false,
            showBottomBar: data.length > 1,
            view: {
              height: () => window.innerHeight - 130,
              width: () => window.innerWidth,
            },
          }).loadData(data)
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [docId, userId])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-2">
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

      <div
        ref={containerRef}
        style={{ display: loading || error ? 'none' : 'block' }}
      />
    </div>
  )
}
