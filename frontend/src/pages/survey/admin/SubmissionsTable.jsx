import { useMemo, useState } from 'react'

// [設計決策] 星等篩選鎖定 key 'star_rank'、推薦人篩選鎖定 key 'recommender'
// （Phase 1 固定表單的欄位命名）。若未來建立器做出的表單沒有這些 key，
// 對應那組篩選 UI 會自動不出現，表格本身不受影響。
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
  const starField = fields.find((f) => f.key === STAR_KEY)
  const recommenderField = fields.find((f) => f.key === RECOMMENDER_KEY)
  const courseFields = useMemo(() => fields.filter((f) => f.type === 'yesno'), [fields])

  const recommenderOptions = useMemo(() => {
    if (!recommenderField) return []
    const names = submissions.map((s) => s.answers?.[RECOMMENDER_KEY]).filter(Boolean)
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  }, [submissions, recommenderField])

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

  // 推薦人下拉與按鈕組共用同一個 activeFilter（單條件互斥）：選了推薦人，
  // 星等/課程按鈕會自動退回未選取狀態，反之亦然
  const handleRecommenderChange = (e) => {
    const value = e.target.value
    setActiveFilter(value ? { fieldKey: RECOMMENDER_KEY, value } : null)
  }
  const recommenderValue = activeFilter?.fieldKey === RECOMMENDER_KEY ? activeFilter.value : ''

  const filteredSubmissions = useMemo(() => {
    if (!activeFilter) return submissions
    return submissions.filter((s) => s.answers?.[activeFilter.fieldKey] === activeFilter.value)
  }, [submissions, activeFilter])

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {recommenderOptions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', marginRight: 2 }}>推薦人</span>
            <select
              value={recommenderValue}
              onChange={handleRecommenderChange}
              style={{
                padding: '5px 12px',
                borderRadius: 16,
                fontSize: 12,
                border: '1px solid #E2DED8',
                background: '#FFFFFF',
                color: '#2C2C2C',
                cursor: 'pointer',
              }}
            >
              <option value="">全部</option>
              {recommenderOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
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
