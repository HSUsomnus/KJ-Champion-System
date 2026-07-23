import { useEffect, useMemo, useRef, useState } from 'react'

// [設計決策] 篩選改版 v2（M.3 使用者要求）：篩選 UI 從表格上方獨立的按鈕/下拉列，
// 改成直接做在欄位表頭上——點表頭彈出這一欄目前資料裡出現過的值，點一個值即篩選，
// 跟原本一樣是「單條件互斥」（全表格只會有一個生效中的篩選，換點別欄會取代掉，不疊加）。
// 姓名欄（key 'name'）沒有可篩選的選項來源，維持不可篩選。
const STAR_KEY = 'star_rank'
const RECOMMENDER_KEY = 'recommender'

const renderCell = (field, value) => {
  if (field.type === 'yesno') {
    if (value === 'yes') return '✅'
    if (value === 'no') return '❎'
    return '—'
  }
  return value || '—'
}

const YESNO_OPTIONS = [
  { label: '已完成', value: 'yes' },
  { label: '未完成', value: 'no' },
]

const optionStyle = (selected) => ({
  all: 'unset',
  display: 'block',
  width: '100%',
  padding: '7px 10px',
  fontSize: 12,
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: selected ? 600 : 400,
  background: selected ? '#4A7C59' : 'transparent',
  color: selected ? '#FFFFFF' : '#2C2C2C',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
})

function ColumnHeader({ field, options, activeFilter, isOpen, onToggleOpen, onSelect }) {
  if (options.length === 0) {
    return <th style={thStyle}>{field.label}</th>
  }

  const applied = activeFilter?.fieldKey === field.key

  return (
    <th style={{ ...thStyle, padding: 0, position: 'relative' }}>
      <button
        type="button"
        onClick={() => onToggleOpen(field.key)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: applied ? 700 : 600,
          color: applied ? '#4A7C59' : '#8A8680',
          background: isOpen ? '#E8F0EB' : 'transparent',
          borderRadius: isOpen ? '8px 8px 0 0' : 0,
          whiteSpace: 'nowrap',
        }}
      >
        {field.label}
        <span style={{ fontSize: 9 }}>▾</span>
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 2,
            background: '#FFFFFF',
            border: '1px solid #E2DED8',
            borderRadius: 12,
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
            padding: 6,
            minWidth: 120,
            zIndex: 5,
          }}
        >
          <button type="button" onClick={() => onSelect(field.key, null)} style={optionStyle(!applied)}>
            全部
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(field.key, opt.value)}
              style={optionStyle(applied && activeFilter.value === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </th>
  )
}

export default function SubmissionsTable({ form, submissions }) {
  const [activeFilter, setActiveFilter] = useState(null)
  const [openColumn, setOpenColumn] = useState(null)
  const containerRef = useRef(null)

  // 點表頭之外的任何地方 → 收起目前展開的篩選選單（點另一個表頭/選項都算容器內，
  // 由各自的 onClick 處理，不會被這裡誤關）
  useEffect(() => {
    if (!openColumn) return
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenColumn(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [openColumn])

  const fields = form.fields || []
  const starField = fields.find((f) => f.key === STAR_KEY)
  const recommenderField = fields.find((f) => f.key === RECOMMENDER_KEY)

  const recommenderOptions = useMemo(() => {
    if (!recommenderField) return []
    const names = submissions.map((s) => s.answers?.[RECOMMENDER_KEY]).filter(Boolean)
    return [...new Set(names)]
      .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
      .map((n) => ({ label: n, value: n }))
  }, [submissions, recommenderField])

  const starOptions = useMemo(() => {
    if (!starField) return []
    const values = starField.options?.values || []
    return values.map((v) => ({ label: v, value: v }))
  }, [starField])

  // 每個欄位對應的篩選選項來源：星等/推薦人各自的清單，課程（yesno）固定「已完成/未完成」，
  // 其餘欄位（例如姓名）沒有來源 → 回傳空陣列，表頭就不會渲染成可點的篩選鈕
  const optionsForField = (field) => {
    if (field.key === STAR_KEY) return starOptions
    if (field.key === RECOMMENDER_KEY) return recommenderOptions
    if (field.type === 'yesno') return YESNO_OPTIONS
    return []
  }

  const toggleOpen = (fieldKey) => {
    setOpenColumn((prev) => (prev === fieldKey ? null : fieldKey))
  }

  // 選「全部」= value null，清空這欄的篩選；選其他值 = 設成單一生效條件（取代前一個，不疊加）
  const handleSelect = (fieldKey, value) => {
    setActiveFilter(value === null ? null : { fieldKey, value })
    setOpenColumn(null)
  }

  const filteredSubmissions = useMemo(() => {
    if (!activeFilter) return submissions
    return submissions.filter((s) => s.answers?.[activeFilter.fieldKey] === activeFilter.value)
  }, [submissions, activeFilter])

  return (
    <div ref={containerRef}>
      {filteredSubmissions.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A8680' }}>沒有符合條件的資料</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {fields.map((f) => (
                  <ColumnHeader
                    key={f.key}
                    field={f}
                    options={optionsForField(f)}
                    activeFilter={activeFilter}
                    isOpen={openColumn === f.key}
                    onToggleOpen={toggleOpen}
                    onSelect={handleSelect}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((s) => (
                <tr key={s.id}>
                  {fields.map((f) => (
                    <td key={f.key} style={tdStyle}>{renderCell(f, s.answers?.[f.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#8A8680',
  padding: '8px 12px',
  borderBottom: '1px solid #E2DED8',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  fontSize: 13,
  color: '#2C2C2C',
  padding: '8px 12px',
  borderBottom: '1px solid #EFEDE9',
  whiteSpace: 'nowrap',
}
