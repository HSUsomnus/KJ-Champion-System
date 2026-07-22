import { useMemo, useState } from 'react'

// [設計決策] 姓名/星等篩選鎖定 key 'name'/'star_rank'（Phase 1 固定表單的欄位命名），
// 推薦人（key 'recommender'）不建篩選鈕，維持「推薦人欄不變」（spec 五節）。
// 若未來建立器做出的表單沒有這兩個 key，篩選列會自動不出現對應那組按鈕，表格本身不受影響。
const NAME_KEY = 'name'
const STAR_KEY = 'star_rank'

const renderCell = (field, value) => {
  if (field.type === 'yesno') {
    if (value === 'yes') return '✅'
    if (value === 'no') return '❎'
    return '—'
  }
  return value || '—'
}

function FilterGroup({ label, options, activeFilter, onToggle }) {
  if (options.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', marginRight: 2 }}>{label}</span>
      {options.map((opt) => {
        const active = activeFilter?.fieldKey === opt.fieldKey && activeFilter?.value === opt.value
        return (
          <button
            key={`${opt.fieldKey}:${opt.value}`}
            type="button"
            onClick={() => onToggle(opt.fieldKey, opt.value)}
            style={{
              padding: '5px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              border: active ? 'none' : '1px solid #E2DED8',
              background: active ? '#4A7C59' : '#FFFFFF',
              color: active ? '#FFFFFF' : '#2C2C2C',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function SubmissionsTable({ form, submissions }) {
  const [activeFilter, setActiveFilter] = useState(null)

  const fields = form.fields || []
  const nameField = fields.find((f) => f.key === NAME_KEY)
  const starField = fields.find((f) => f.key === STAR_KEY)
  const courseFields = useMemo(() => fields.filter((f) => f.type === 'yesno'), [fields])

  const nameOptions = useMemo(() => {
    if (!nameField) return []
    const names = submissions.map((s) => s.answers?.[NAME_KEY]).filter(Boolean)
    return [...new Set(names)]
      .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
      .map((n) => ({ label: n, value: n, fieldKey: NAME_KEY }))
  }, [submissions, nameField])

  const starOptions = useMemo(() => {
    if (!starField) return []
    const values = starField.options?.values || []
    return values.map((v) => ({ label: v, value: v, fieldKey: STAR_KEY }))
  }, [starField])

  const courseOptions = useMemo(
    () => courseFields.map((f) => ({ label: f.label, value: 'yes', fieldKey: f.key })),
    [courseFields]
  )

  // 單條件互斥 + 同鈕取消：點下去若跟目前生效的條件一樣就清空，否則整個換成新條件
  const toggleFilter = (fieldKey, value) => {
    setActiveFilter((prev) => (prev?.fieldKey === fieldKey && prev?.value === value ? null : { fieldKey, value }))
  }

  const filteredSubmissions = useMemo(() => {
    if (!activeFilter) return submissions
    return submissions.filter((s) => s.answers?.[activeFilter.fieldKey] === activeFilter.value)
  }, [submissions, activeFilter])

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <FilterGroup label="姓名" options={nameOptions} activeFilter={activeFilter} onToggle={toggleFilter} />
        <FilterGroup label="星等" options={starOptions} activeFilter={activeFilter} onToggle={toggleFilter} />
        <FilterGroup label="課程" options={courseOptions} activeFilter={activeFilter} onToggle={toggleFilter} />
      </div>

      {filteredSubmissions.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A8680' }}>沒有符合條件的資料</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.key} style={thStyle}>{f.label}</th>
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
