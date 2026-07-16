/**
 * 明細檢視 + 篩選（Change 20，Section 5，次要視圖）
 * 手機每筆一張卡片（非寬表格橫向捲動）；桌面 grid 多欄。是非型狀態 ✅/❎。
 * 篩選（單條件互斥）：
 *   - 點課程/樹欄位 chip（yesno 欄）→ 篩該欄 Yes
 *   - 點姓名 → 篩「推薦人=該人」+ 本人
 *   - 點星等 → 篩該星等
 *   - 同鈕再點 = 取消
 *   - 推薦人欄不可點
 */

import { useMemo, useState } from 'react'
import { applySubmissionFilter, toggleFilter, describeFilter, isSameFilter } from '../utils/submissionFilter'

const CLICKABLE_STYLE = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: '#4A7C59',
  fontWeight: 600,
  fontSize: 14,
}

function yesNo(value) {
  return value === 'yes' ? '✅' : '❎'
}

function FieldValue({ field, answers, onFilter, filter }) {
  const value = answers[field.key] ?? ''

  if (field.type === 'yesno') {
    return <span style={{ fontSize: 14 }} aria-label={value === 'yes' ? '是' : '否'}>{yesNo(value)}</span>
  }

  if (field.key === 'name') {
    const active = isSameFilter(filter, { type: 'name', value })
    return (
      <button type="button" onClick={() => onFilter({ type: 'name', value })}
        style={{ ...CLICKABLE_STYLE, textDecoration: active ? 'underline' : 'none' }}>
        {value || '—'}
      </button>
    )
  }

  if (field.key === 'star_rank') {
    const active = isSameFilter(filter, { type: 'star', value })
    return (
      <button type="button" onClick={() => onFilter({ type: 'star', value })}
        style={{ ...CLICKABLE_STYLE, textDecoration: active ? 'underline' : 'none' }}>
        {value || '—'}
      </button>
    )
  }

  // 推薦人欄與其他文字欄：不可點
  return <span style={{ fontSize: 14, color: '#2C2C2C' }}>{value || '—'}</span>
}

function SubmissionCard({ form, submission, onFilter, filter }) {
  return (
    <div
      data-testid="submission-card"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2DED8',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {form.fields.map((field) => (
        <div
          key={field.key}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 0',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: '#8A8680' }}>{field.label}</span>
          <FieldValue field={field} answers={submission.answers} onFilter={onFilter} filter={filter} />
        </div>
      ))}
    </div>
  )
}

export default function SubmissionsView({ form, submissions }) {
  const [filter, setFilter] = useState(null)

  const yesnoFields = useMemo(
    () => form.fields.filter((f) => f.type === 'yesno'),
    [form.fields]
  )

  const onFilter = (next) => setFilter((cur) => toggleFilter(cur, next))

  const filtered = useMemo(
    () => applySubmissionFilter(submissions, filter),
    [submissions, filter]
  )

  return (
    <div>
      {/* 篩選列：課程/樹欄位 chip（點 = 篩該欄 Yes） */}
      {yesnoFields.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ marginBottom: 8 }}>
          {yesnoFields.map((f) => {
            const active = isSameFilter(filter, { type: 'column', value: f.key })
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilter({ type: 'column', value: f.key })}
                style={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: active ? '1.5px solid #4A7C59' : '1.5px solid #E2DED8',
                  background: active ? '#E8F0EB' : '#FFFFFF',
                  color: '#2C2C2C',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      )}

      {/* 目前篩選 + 清除 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#8A8680' }}>
          共 {filtered.length} 筆{filter ? `（已篩選）` : ''}
        </span>
        {filter && (
          <>
            <span style={{ fontSize: 12, color: '#4A7C59', fontWeight: 500 }}>
              {describeFilter(filter, form.fields)}
            </span>
            <button
              type="button"
              onClick={() => setFilter(null)}
              style={{
                fontSize: 12,
                color: '#8A8680',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              清除篩選
            </button>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: 14, color: '#8A8680', textAlign: 'center', padding: '24px 0' }}>
          {submissions.length === 0 ? '尚無填寫資料' : '沒有符合篩選的資料'}
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((s) => (
            <SubmissionCard key={s.id} form={form} submission={s} onFilter={onFilter} filter={filter} />
          ))}
        </div>
      )}
    </div>
  )
}
