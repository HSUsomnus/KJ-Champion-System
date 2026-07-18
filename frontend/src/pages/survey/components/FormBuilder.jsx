/**
 * 表單建立器（Change 20，Section 7）— 發佈新任務，供管理者用。
 * 手打欄位（key/label/type/options）→ 夥伴視角預覽 → 發佈 → 顯示連結 + 複製。
 * 欄位型態：text / searchable_select / yesno（upload 為 Phase 2，本次不提供）。
 */

import { useMemo, useState } from 'react'
import { createForm, publishForm } from '../../../services/surveyApi'
import FormPreview from './FormPreview'

const TYPE_OPTIONS = [
  { value: 'text', label: '文字' },
  { value: 'searchable_select', label: '可搜尋下拉' },
  { value: 'yesno', label: '是非' },
]

const newField = () => ({ key: '', label: '', type: 'text', source: 'survey_members', valuesText: '' })

// 把建立器內部 field 狀態轉成 API 欄位形狀
function toApiFields(fields) {
  return fields.map((f) => {
    const base = { key: f.key.trim(), label: f.label.trim(), type: f.type }
    if (f.type === 'searchable_select') {
      base.options =
        f.source === 'static'
          ? { source: 'static', values: f.valuesText.split(',').map((v) => v.trim()).filter(Boolean) }
          : { source: 'survey_members', field: 'name' }
    }
    return base
  })
}

const smallInput = {
  padding: '8px 10px',
  borderRadius: 12,
  border: '1.5px solid #E2DED8',
  fontSize: 13,
  color: '#2C2C2C',
  background: '#FFFFFF',
}

export default function FormBuilder({ onPublished }) {
  const [title, setTitle] = useState('')
  const [fields, setFields] = useState([newField()])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { token, link }
  const [copied, setCopied] = useState(false)

  const previewFields = useMemo(() => toApiFields(fields), [fields])

  const updateField = (i, patch) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  const addField = () => setFields((prev) => [...prev, newField()])
  const removeField = (i) => setFields((prev) => prev.filter((_, idx) => idx !== i))

  const handlePublish = async () => {
    setError('')
    if (!title.trim()) return setError('請填任務標題')
    const apiFields = toApiFields(fields)
    if (apiFields.some((f) => !f.key || !f.label)) return setError('每個欄位都要填 key 與標題')

    setPublishing(true)
    try {
      const created = await createForm({ title: title.trim(), fields: apiFields })
      const published = await publishForm(created.data.id)
      const token = published.data.token
      const link = `${window.location.origin}/f/${token}`
      setResult({ token, link })
      if (onPublished) onPublished(published.data)
    } catch (err) {
      setError(err.message || '發佈失敗')
    } finally {
      setPublishing(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(result.link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (result) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2DED8',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2C', margin: '0 0 4px' }}>任務已發佈 🎉</p>
        <p style={{ fontSize: 13, color: '#8A8680', margin: '0 0 16px' }}>把下面的連結分享給團隊夥伴填寫：</p>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: '#F7F5F2',
            border: '1px solid #E2DED8',
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          <span style={{ flex: 1, fontSize: 13, color: '#2C2C2C', wordBreak: 'break-all' }}>{result.link}</span>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 12,
              border: 'none',
              background: '#4A7C59',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? '已複製' : '複製連結'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ gap: 24 }}>
      {/* 欄位編輯 */}
      <div className="flex-1 min-w-0">
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2DED8',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A8680', marginBottom: 6 }}>
            任務標題
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：七月回訓出席調查"
            style={{ ...smallInput, width: '100%', marginBottom: 16 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8A8680' }}>欄位（{fields.length}）</span>
            <button
              type="button"
              onClick={addField}
              style={{ fontSize: 12, fontWeight: 500, color: '#4A7C59', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              + 新增欄位
            </button>
          </div>

          {fields.map((f, i) => (
            <div
              key={i}
              data-testid="field-editor"
              style={{ border: '1px solid #E2DED8', borderRadius: 12, padding: 12, marginBottom: 10 }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  aria-label={`欄位 ${i + 1} 標題`}
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder="欄位標題（如：姓名）"
                  style={{ ...smallInput, flex: 1 }}
                />
                <input
                  aria-label={`欄位 ${i + 1} key`}
                  value={f.key}
                  onChange={(e) => updateField(i, { key: e.target.value })}
                  placeholder="key（英數）"
                  style={{ ...smallInput, width: 110 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  aria-label={`欄位 ${i + 1} 型態`}
                  value={f.type}
                  onChange={(e) => updateField(i, { type: e.target.value })}
                  style={{ ...smallInput }}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                {f.type === 'searchable_select' && (
                  <select
                    aria-label={`欄位 ${i + 1} 選項來源`}
                    value={f.source}
                    onChange={(e) => updateField(i, { source: e.target.value })}
                    style={{ ...smallInput }}
                  >
                    <option value="survey_members">讀團隊名單</option>
                    <option value="static">自訂選項</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => removeField(i)}
                  style={{ marginLeft: 'auto', fontSize: 12, color: '#C0392B', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  刪除
                </button>
              </div>

              {f.type === 'searchable_select' && f.source === 'static' && (
                <input
                  aria-label={`欄位 ${i + 1} 自訂選項`}
                  value={f.valuesText}
                  onChange={(e) => updateField(i, { valuesText: e.target.value })}
                  placeholder="選項以逗號分隔，如：白,綠,橙,紅,紫"
                  style={{ ...smallInput, width: '100%', marginTop: 8 }}
                />
              )}
            </div>
          ))}

          {error && <p style={{ fontSize: 12, color: '#C0392B', margin: '4px 0 12px' }}>{error}</p>}

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 16,
              border: 'none',
              background: '#2C2C2C',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 600,
              cursor: publishing ? 'default' : 'pointer',
              opacity: publishing ? 0.6 : 1,
              marginTop: 8,
            }}
          >
            {publishing ? '發佈中...' : '發佈任務'}
          </button>
        </div>
      </div>

      {/* 預覽 */}
      <div className="md:w-80 md:shrink-0">
        <FormPreview title={title} fields={previewFields} />
      </div>
    </div>
  )
}
