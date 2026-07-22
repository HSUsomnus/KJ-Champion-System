import { useState } from 'react'
import { createAdminForm, patchAdminForm, publishAdminForm } from '../../../services/surveyApi'
import FormFieldsPreview from '../FormFieldsPreview'

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

export default function FormBuilder({ form, onSaved }) {
  const [formId, setFormId] = useState(form?.id ?? null)
  const [status, setStatus] = useState(form?.status ?? 'draft')
  const [token, setToken] = useState(form?.token ?? null)
  const [title, setTitle] = useState(form?.title ?? '')
  const [fields, setFields] = useState(withRowIds(form?.fields))
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const published = status === 'published'

  const updateField = (rowId, patch) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId ? { ...f, ...patch } : f)))
  }

  const addField = () => setFields((prev) => [...prev, emptyField()])
  const removeField = (rowId) => setFields((prev) => prev.filter((f) => f.rowId !== rowId))

  const addOption = (rowId) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId
      ? { ...f, options: { values: [...(f.options?.values || []), ''] } }
      : f)))
  }
  const updateOption = (rowId, optIndex, value) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId
      ? { ...f, options: { values: f.options.values.map((v, i) => (i === optIndex ? value : v)) } }
      : f)))
  }
  const removeOption = (rowId, optIndex) => {
    setFields((prev) => prev.map((f) => (f.rowId === rowId
      ? { ...f, options: { values: f.options.values.filter((_, i) => i !== optIndex) } }
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

  const previewFields = fields.filter((f) => f.key && f.label).map(stripRowId)

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 360px', minWidth: 0 }}>
        <label style={labelStyle} htmlFor="form-builder-title">表單標題</label>
        <input
          id="form-builder-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={published}
          style={{ ...inputStyle, width: '100%', marginBottom: 20 }}
        />

        {fields.map((field) => (
          <div key={field.rowId} style={fieldRowStyle}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                placeholder="標籤"
                value={field.label}
                onChange={(e) => updateField(field.rowId, { label: e.target.value })}
                disabled={published}
                style={{ ...inputStyle, width: 140 }}
              />
              <select
                value={field.type}
                onChange={(e) => updateField(field.rowId, {
                  type: e.target.value,
                  options: e.target.value === 'searchable_select' ? { values: [] } : undefined,
                })}
                disabled={published}
                style={{ ...inputStyle, width: 130 }}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2C2C2C' }}>
                <input
                  type="checkbox"
                  checked={field.required !== false}
                  onChange={(e) => updateField(field.rowId, { required: e.target.checked })}
                  disabled={published}
                />
                必填
              </label>
              <button
                type="button"
                onClick={() => removeField(field.rowId)}
                disabled={published}
                style={removeBtnStyle}
              >
                刪除欄位
              </button>
            </div>

            {field.type === 'searchable_select' && (
              <div style={{ marginTop: 8, paddingLeft: 4 }}>
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
        ))}

        <button type="button" onClick={addField} disabled={published} style={addBtnStyle}>
          + 新增欄位
        </button>

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

      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', letterSpacing: '0.06em', marginBottom: 8 }}>
          預覽
        </p>
        <div style={previewCardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2C', margin: '0 0 16px' }}>
            {title || '（未命名表單）'}
          </h2>
          <FormFieldsPreview fields={previewFields} readOnly />
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#2C2C2C',
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

const fieldRowStyle = {
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 12,
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

const previewCardStyle = {
  background: '#F7F5F2',
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 16,
}
