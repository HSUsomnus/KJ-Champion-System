import { useState } from 'react'
import { createAdminForm, patchAdminForm, publishAdminForm } from '../../../services/surveyApi'

const TYPE_OPTIONS = [
  { value: 'text', label: '文字' },
  { value: 'searchable_select', label: '搜尋選單' },
  { value: 'yesno', label: '是否' },
]

let nextRowId = 0
const newRowId = () => nextRowId++

const emptyField = () => ({ rowId: newRowId(), key: '', label: '', type: 'text', required: true })

const withRowIds = (fields) => (fields || []).map((f) => ({ ...f, rowId: newRowId() }))
const stripRowId = ({ rowId, ...rest }) => rest

function errorMessage(err) {
  if (err.data?.field) return `${err.data.field}：${err.data.reason || err.message}`
  return err.data?.reason || err.message || '操作失敗，請稍後再試'
}

// 十二節 12.1：問題摘要卡只顯示題型與答案形式摘要，不重複展開卡的細節
const fieldSummary = (field) => {
  if (field.type === 'yesno') return '是 / 否'
  if (field.type === 'searchable_select') {
    if (field.options?.source === 'survey_members') return '康九成員名單'
    const values = field.options?.values || []
    return values.length > 0 ? values.join('、') : '尚未設定選項'
  }
  return '簡答文字'
}

const typeLabel = (type) => TYPE_OPTIONS.find((t) => t.value === type)?.label || type

export default function FormBuilder({ form, onSaved }) {
  const initialFields = withRowIds(form?.fields)
  const [formId, setFormId] = useState(form?.id ?? null)
  const [status, setStatus] = useState(form?.status ?? 'draft')
  const [token, setToken] = useState(form?.token ?? null)
  const [title, setTitle] = useState(form?.title ?? '')
  const [fields, setFields] = useState(initialFields)
  const [focusedRowId, setFocusedRowId] = useState(initialFields[0]?.rowId ?? null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const published = status === 'published'

  const updateField = (rowId, patch) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId ? { ...f, ...patch } : f)))
  }

  // 型別切到搜尋選單 → 預設靜態來源空選項；切離搜尋選單 → 清掉 options（十二節 12.1）
  const updateFieldType = (rowId, type) => {
    updateField(rowId, {
      type,
      options: type === 'searchable_select' ? { source: 'static', values: [] } : undefined,
    })
  }

  // 選項來源明確產生兩種形狀之一：static 帶 values 陣列、survey_members 不夾帶 values（十二節 12.1）
  const updateFieldSource = (rowId, source) => {
    updateField(rowId, {
      options: source === 'survey_members' ? { source: 'survey_members' } : { source: 'static', values: [] },
    })
  }

  const addField = () => {
    const field = emptyField()
    setFields((prev) => [...prev, field])
    setFocusedRowId(field.rowId)
  }

  const removeField = (rowId) => {
    const next = fields.filter((f) => f.rowId !== rowId)
    setFields(next)
    if (focusedRowId === rowId) {
      setFocusedRowId(next[0]?.rowId ?? null)
    }
  }

  const addOption = (rowId) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId
      ? { ...f, options: { ...f.options, values: [...(f.options?.values || []), ''] } }
      : f)))
  }
  const updateOption = (rowId, optIndex, value) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId
      ? { ...f, options: { ...f.options, values: f.options.values.map((v, i) => (i === optIndex ? value : v)) } }
      : f)))
  }
  const removeOption = (rowId, optIndex) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId
      ? { ...f, options: { ...f.options, values: f.options.values.filter((_, i) => i !== optIndex) } }
      : f)))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = fields.map(stripRowId)
      if (formId) {
        const res = await patchAdminForm(formId, { title, fields: payload })
        onSaved?.(res.data)
      } else {
        const res = await createAdminForm(title, payload)
        setFormId(res.data.id)
        setToken(res.data.token)
        setStatus(res.data.status)
        onSaved?.(res.data)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!formId) return
    setPublishing(true)
    setError('')
    try {
      const res = await publishAdminForm(formId)
      setStatus(res.data.status)
      setToken(res.data.token)
      onSaved?.(res.data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPublishing(false)
    }
  }

  const shareUrl = token ? `${window.location.origin}/f/${token}` : ''

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ ...cardStyle, borderLeft: '4px solid #4A7C59' }}>
        <label style={labelStyle} htmlFor="form-builder-title">表單標題</label>
        <input
          id="form-builder-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={published}
          placeholder="請輸入這份表單的名稱"
          style={{ ...inputStyle, width: '100%', fontSize: 18, fontWeight: 600, border: 'none', borderBottom: '1px solid #E2DED8', borderRadius: 0, padding: '4px 0 8px' }}
        />
      </div>

      {fields.map((field) => {
        const focused = published || field.rowId === focusedRowId
        return (
          <div
            key={field.rowId}
            style={{ ...cardStyle, ...(focused ? { borderLeft: '4px solid #4A7C59' } : {}) }}
          >
            {focused ? (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="key"
                    value={field.key}
                    onChange={(e) => updateField(field.rowId, { key: e.target.value })}
                    disabled={published}
                    style={{ ...inputStyle, width: 120 }}
                  />
                  <input
                    type="text"
                    placeholder="問題標題"
                    value={field.label}
                    onChange={(e) => updateField(field.rowId, { label: e.target.value })}
                    disabled={published}
                    style={{ ...inputStyle, flex: '1 1 140px' }}
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateFieldType(field.rowId, e.target.value)}
                    disabled={published}
                    style={{ ...inputStyle, width: 110 }}
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {field.type === 'searchable_select' && (
                  <div style={{ marginBottom: 12, padding: 12, background: '#F7F5F2', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', marginBottom: 8 }}>選項來源</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#2C2C2C' }}>
                        <input
                          type="radio"
                          name={`source-${field.rowId}`}
                          checked={field.options?.source === 'survey_members'}
                          onChange={() => updateFieldSource(field.rowId, 'survey_members')}
                          disabled={published}
                        />
                        康九成員名單
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#2C2C2C' }}>
                        <input
                          type="radio"
                          name={`source-${field.rowId}`}
                          checked={field.options?.source !== 'survey_members'}
                          onChange={() => updateFieldSource(field.rowId, 'static')}
                          disabled={published}
                        />
                        自訂選項
                      </label>
                    </div>

                    {field.options?.source === 'survey_members' ? (
                      <p style={{ fontSize: 12, color: '#8A8680', margin: 0 }}>預覽：搜尋或選擇姓名</p>
                    ) : (
                      <div>
                        {(field.options?.values || []).map((value, optIndex) => (
                          <div key={optIndex} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateOption(field.rowId, optIndex, e.target.value)}
                              disabled={published}
                              style={{ ...inputStyle, width: 160 }}
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(field.rowId, optIndex)}
                              disabled={published}
                              style={removeBtnStyle}
                            >
                              刪除選項
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addOption(field.rowId)} disabled={published} style={addBtnStyle}>
                          + 新增選項
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #E2DED8' }}>
                  <button
                    type="button"
                    onClick={() => removeField(field.rowId)}
                    disabled={published}
                    style={removeBtnStyle}
                  >
                    刪除
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2C2C2C' }}>
                    必填
                    <input
                      type="checkbox"
                      checked={field.required !== false}
                      onChange={(e) => updateField(field.rowId, { required: e.target.checked })}
                      disabled={published}
                    />
                  </label>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setFocusedRowId(field.rowId)}
                style={summaryButtonStyle}
              >
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2C' }}>{field.label || '（未命名問題）'}</div>
                  <div style={{ fontSize: 12, color: '#8A8680', marginTop: 2 }}>{fieldSummary(field)}</div>
                </div>
                <span style={typeTagStyle}>{typeLabel(field.type)}</span>
              </button>
            )}
          </div>
        )
      })}

      {!published && (
        <button type="button" onClick={addField} style={addQuestionBtnStyle}>
          ＋ 新增題目
        </button>
      )}

      {error && <p style={{ fontSize: 12, color: '#C0392B', marginTop: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {!published && (
          <button type="button" onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
            {saving ? '儲存中...' : '儲存草稿'}
          </button>
        )}
        {!published && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={!formId || publishing || fields.length === 0}
            style={primaryBtnStyle}
          >
            {publishing ? '發佈中...' : '發佈表單'}
          </button>
        )}
        {published && (
          <span style={{ fontSize: 12, color: '#4A7C59', fontWeight: 500 }}>已發佈</span>
        )}
      </div>

      {shareUrl && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#8A8680', wordBreak: 'break-all' }}>{shareUrl}</span>
          <button type="button" onClick={handleCopy} style={addBtnStyle}>
            {copied ? '已複製' : '複製連結'}
          </button>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#8A8680',
  marginBottom: 6,
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 12,
  border: '1.5px solid #E2DED8',
  fontSize: 13,
  color: '#2C2C2C',
  background: '#FFFFFF',
}

// 十二節 12.1：每題一張卡，含左側 accent 聚焦邊線的容器樣式
const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
}

const summaryButtonStyle = {
  all: 'unset',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  cursor: 'pointer',
  boxSizing: 'border-box',
}

const typeTagStyle = {
  fontSize: 11,
  padding: '3px 10px',
  borderRadius: 10,
  background: '#EFEDE9',
  color: '#8A8680',
  flexShrink: 0,
}

const addQuestionBtnStyle = {
  width: '100%',
  padding: '12px 0',
  borderRadius: 16,
  border: '1.5px dashed #E2DED8',
  background: 'transparent',
  color: '#4A7C59',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  marginBottom: 12,
}

const addBtnStyle = {
  padding: '6px 14px',
  borderRadius: 14,
  border: '1.5px dashed #E2DED8',
  background: '#FFFFFF',
  color: '#4A7C59',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
}

const removeBtnStyle = {
  padding: '6px 12px',
  borderRadius: 14,
  border: 'none',
  background: 'transparent',
  color: '#C0392B',
  fontSize: 12,
  cursor: 'pointer',
}

const primaryBtnStyle = {
  padding: '10px 20px',
  borderRadius: 16,
  border: 'none',
  background: '#2C2C2C',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
