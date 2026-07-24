import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { createAdminForm, patchAdminForm, publishAdminForm } from '../../../services/surveyApi'
import DeleteQuestionDialog from './DeleteQuestionDialog'
import PublishConfirmDialog from './PublishConfirmDialog'
import ConfirmLeaveDialog from '../../../components/ConfirmLeaveDialog'
import FormPreview from './FormPreview'

const KEY_REGEX = /^[a-z][a-z0-9_]*$/
const FIELD_KEY_PATTERN = /^field_(\d+)$/

// 十二節 12.7：key 由系統自動產生，不依題目位置（index）計算——只依現有 key 內容找最大編號。
// 非 field_N 格式的既有 key（如固定表單的 nickname/star）不參與編號、不影響下一個號碼。
const nextFieldKey = (fields) => {
  const maxN = fields.reduce((acc, f) => {
    const m = FIELD_KEY_PATTERN.exec(f.key || '')
    if (!m) return acc
    const n = parseInt(m[1], 10)
    return n > acc ? n : acc
  }, 0)
  return `field_${maxN + 1}`
}

// 十二節 12.2：發布前重新驗證完整表單，鏡射後端 formService.js 的規則（五節），
// 讓錯誤能在送出 API 前就 inline 顯示、聚焦到第一個錯誤題目，不用等後端 400 才知道。
// 回傳 { title, fields: {rowId: message} }，皆為 undefined 表示驗證通過。
const validateForPublish = (title, fields) => {
  const errors = { title: undefined, fields: {} }

  if (!title || !title.trim()) errors.title = '請輸入表單標題'
  else if (title.length > 200) errors.title = '表單標題不可超過 200 字'

  if (fields.length === 0) return { ...errors, formError: '請至少新增一個問題' }
  if (fields.length > 50) return { ...errors, formError: '問題數量不可超過 50 個' }

  const seenKeys = new Set()
  for (const f of fields) {
    if (!f.key || !KEY_REGEX.test(f.key) || f.key.length > 40) {
      errors.fields[f.rowId] = 'key 格式錯誤（需以小寫英文字母開頭，只能有小寫英數與底線）'
    } else if (seenKeys.has(f.key)) {
      errors.fields[f.rowId] = 'key 重複，請修改成唯一值'
    }
    seenKeys.add(f.key)

    if (!errors.fields[f.rowId] && (!f.label || !f.label.trim() || f.label.length > 100)) {
      errors.fields[f.rowId] = '請輸入問題標題（不可超過 100 字）'
    }

    if (!errors.fields[f.rowId] && f.type === 'searchable_select' && f.options?.source !== 'survey_members') {
      const values = f.options?.values || []
      const uniqueValues = new Set(values)
      const hasBadValue = values.some((v) => !v || !v.trim() || v.length > 100)
      if (values.length === 0 || hasBadValue || uniqueValues.size !== values.length) {
        errors.fields[f.rowId] = '選項不可為空、不可重複，且每項不超過 100 字'
      }
    }
  }

  return errors
}

const TYPE_OPTIONS = [
  { value: 'text', label: '文字' },
  { value: 'searchable_select', label: '搜尋選單' },
  { value: 'yesno', label: '是否' },
]

let nextRowId = 0
const newRowId = () => nextRowId++

const emptyField = (fields) => ({ rowId: newRowId(), key: nextFieldKey(fields), label: '', type: 'text', required: true })

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

// 十二節 12.2：內容跟最近一次成功載入/儲存有差異即為 dirty
const serializeForm = (title, fields) => JSON.stringify({ title, fields: fields.map(stripRowId) })

// dirty 時攔截應用程式內導覽（react-router 導航）與重新整理/關閉（beforeunload）；
// 跟 ConfirmLeaveDialog.jsx 既有的 useLeaveGuard 不同之處：這裡用 dirtyRef 讓
// shouldBlock 隨 dirty 狀態即時反應（存草稿成功後不再攔，改回編輯又要攔）
function useDirtyGuard(dirty) {
  const dirtyRef = useRef(dirty)
  useEffect(() => { dirtyRef.current = dirty }, [dirty])

  const shouldBlock = useCallback(() => dirtyRef.current, [])
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    const handler = (e) => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  return blocker
}

export default function FormBuilder({ form, onSaved, onDirtyChange }) {
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
  const [draggedRowId, setDraggedRowId] = useState(null)
  const [deleteTargetRowId, setDeleteTargetRowId] = useState(null)
  const [savedSnapshot, setSavedSnapshot] = useState(serializeForm(form?.title ?? '', initialFields))
  const [activeView, setActiveView] = useState('edit')
  const [publishErrors, setPublishErrors] = useState({ title: undefined, fields: {}, formError: '' })
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const titleInputRef = useRef(null)
  const fieldRefs = useRef({})

  const published = status === 'published'
  const dirty = !published && serializeForm(title, fields) !== savedSnapshot
  const blocker = useDirtyGuard(dirty)

  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  // key 自動產生後理論上不會重複；仍保留即時重複檢查作為使用者手動改 key 時的安全網（十二節 12.7）
  const keyCounts = fields.reduce((acc, f) => {
    if (f.key) acc[f.key] = (acc[f.key] || 0) + 1
    return acc
  }, {})
  const isDuplicateKey = (key) => Boolean(key) && keyCounts[key] > 1

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
    const field = emptyField(fields)
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

  const requestDeleteField = (rowId) => setDeleteTargetRowId(rowId)
  const cancelDeleteField = () => setDeleteTargetRowId(null)
  const confirmDeleteField = () => {
    removeField(deleteTargetRowId)
    setDeleteTargetRowId(null)
  }

  // 複製 label/type/required/options；key 改配系統自動產生的新唯一值，不沿用原題 key
  // （十二節 12.7，反轉舊版「key 原樣保留由使用者手動改」）
  const duplicateField = (rowId) => {
    const idx = fields.findIndex((f) => f.rowId === rowId)
    if (idx === -1) return
    const original = fields[idx]
    const clone = {
      ...original,
      rowId: newRowId(),
      key: nextFieldKey(fields),
      options: original.options
        ? { ...original.options, values: original.options.values ? [...original.options.values] : undefined }
        : undefined,
    }
    const next = [...fields]
    next.splice(idx + 1, 0, clone)
    setFields(next)
    setFocusedRowId(clone.rowId)
  }

  // 鍵盤可操作的排序替代方案：上移/下移（十二節 12.1，不是唯一排序方式）
  const moveField = (rowId, direction) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.rowId === rowId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (idx === -1 || swapIdx < 0 || swapIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  // 原生 HTML5 drag：把手 dragstart 記住拖曳中的題目，卡片本身接 dragover/drop 換位置（不引入拖曳套件）
  const handleDragStart = (rowId) => setDraggedRowId(rowId)
  const handleDrop = (targetRowId) => {
    if (draggedRowId == null || draggedRowId === targetRowId) return
    setFields((prev) => {
      const fromIdx = prev.findIndex((f) => f.rowId === draggedRowId)
      const toIdx = prev.findIndex((f) => f.rowId === targetRowId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    setDraggedRowId(null)
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
      // 十二節 12.2：成功儲存才清除 dirty；失敗保留內容與 dirty 狀態不變
      setSavedSnapshot(serializeForm(title, fields))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // 十二節 12.2：發布前先本地驗證整份表單；有錯誤就不呼叫 API，
  // 聚焦第一個錯誤題目（若目前收合成摘要卡，先展開）並捲入可視區
  const requestPublish = () => {
    if (!formId) return
    const result = validateForPublish(title, fields)
    setPublishErrors(result)

    const firstErrorRowId = fields.find((f) => result.fields[f.rowId])?.rowId

    if (result.title) {
      setActiveView('edit')
      titleInputRef.current?.focus()
      titleInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (result.formError) return
    if (firstErrorRowId != null) {
      setActiveView('edit')
      setFocusedRowId(firstErrorRowId)
      const el = fieldRefs.current[firstErrorRowId]
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.querySelector('input')?.focus()
      return
    }

    setPublishConfirmOpen(true)
  }

  const cancelPublish = () => setPublishConfirmOpen(false)

  const confirmPublish = async () => {
    setPublishConfirmOpen(false)
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

  const previewFields = fields.map(stripRowId)

  return (
    <div style={{ maxWidth: 680 }}>
      {!published && (
        <div style={{ display: 'inline-flex', background: '#EFEDE9', borderRadius: 18, padding: 3, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveView('edit')}
            style={pillTabStyle(activeView === 'edit')}
          >
            問題編輯
          </button>
          <button
            type="button"
            onClick={() => setActiveView('preview')}
            style={pillTabStyle(activeView === 'preview')}
          >
            預覽
          </button>
        </div>
      )}

      {activeView === 'preview' && !published ? (
        <FormPreview title={title} fields={previewFields} />
      ) : (
        <>
      <div style={{ ...cardStyle, borderLeft: '4px solid #4A7C59' }}>
        <label style={labelStyle} htmlFor="form-builder-title">表單標題</label>
        <input
          id="form-builder-title"
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={published}
          placeholder="請輸入這份表單的名稱"
          style={{ ...inputStyle, width: '100%', fontSize: 18, fontWeight: 600, border: 'none', borderBottom: '1px solid #E2DED8', borderRadius: 0, padding: '4px 0 8px' }}
        />
        {publishErrors.title && (
          <p style={{ fontSize: 11, color: '#C0392B', margin: '6px 0 0' }}>● {publishErrors.title}</p>
        )}
      </div>

      {fields.map((field, index) => {
        // 已發佈表單不進「聚焦編輯」狀態——一律顯示乾淨唯讀摘要，不再是 disabled 的編輯框
        // （十二節 12.1：已發佈表單改成乾淨的唯讀摘要）
        const focused = !published && field.rowId === focusedRowId
        return (
          <div
            key={field.rowId}
            ref={(el) => { fieldRefs.current[field.rowId] = el }}
            data-testid={`question-card-${index}`}
            onDragOver={(e) => { if (!published) e.preventDefault() }}
            onDrop={() => { if (!published) handleDrop(field.rowId) }}
            style={{ ...cardStyle, ...(focused ? { borderLeft: '4px solid #4A7C59' } : {}) }}
          >
            {!published && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  draggable
                  onDragStart={() => handleDragStart(field.rowId)}
                  aria-label="拖曳排序"
                  title="拖曳排序"
                  style={{ color: '#8A8680', fontSize: 14, cursor: 'grab', letterSpacing: -2 }}
                >
                  ⋮⋮
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => moveField(field.rowId, 'up')}
                    disabled={index === 0}
                    aria-label="題目上移"
                    style={moveBtnStyle}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(field.rowId, 'down')}
                    disabled={index === fields.length - 1}
                    aria-label="題目下移"
                    style={moveBtnStyle}
                  >
                    ▼
                  </button>
                </div>
              </div>
            )}
            {focused ? (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
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
                {isDuplicateKey(field.key) && (
                  <p style={{ fontSize: 11, color: '#C0392B', margin: '0 0 8px' }}>● key 重複，請修改成唯一值</p>
                )}
                {!isDuplicateKey(field.key) && publishErrors.fields[field.rowId] && (
                  <p style={{ fontSize: 11, color: '#C0392B', margin: '0 0 8px' }}>● {publishErrors.fields[field.rowId]}</p>
                )}

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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #E2DED8', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => duplicateField(field.rowId)}
                      disabled={published}
                      style={linkBtnStyle}
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteField(field.rowId)}
                      disabled={published}
                      style={removeBtnStyle}
                    >
                      刪除
                    </button>
                  </div>
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
            ) : published ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2C' }}>{field.label}</div>
                  <div style={{ fontSize: 12, color: '#8A8680', marginTop: 2 }}>{fieldSummary(field)}</div>
                </div>
                <span style={typeTagStyle}>{typeLabel(field.type)}</span>
              </div>
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
        </>
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
            onClick={requestPublish}
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

      {publishErrors.formError && (
        <p style={{ fontSize: 12, color: '#C0392B', marginTop: 8 }}>{publishErrors.formError}</p>
      )}

      {shareUrl && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#8A8680', wordBreak: 'break-all' }}>{shareUrl}</span>
          <button type="button" onClick={handleCopy} style={addBtnStyle}>
            {copied ? '已複製' : '複製連結'}
          </button>
        </div>
      )}

      <DeleteQuestionDialog
        open={deleteTargetRowId != null}
        onCancel={cancelDeleteField}
        onConfirm={confirmDeleteField}
      />
      <PublishConfirmDialog
        open={publishConfirmOpen}
        onCancel={cancelPublish}
        onConfirm={confirmPublish}
      />
      <ConfirmLeaveDialog blocker={blocker} />
    </div>
  )
}

// 十二節 12.3：問題編輯／預覽 Pill Tab，沿用 KJ Pill Tab 規範
const pillTabStyle = (active) => ({
  padding: '6px 16px',
  borderRadius: 14,
  border: 'none',
  fontSize: 12,
  fontWeight: active ? 500 : 400,
  background: active ? '#4A7C59' : 'transparent',
  color: active ? '#FFFFFF' : '#2C2C2C',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
})

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

const linkBtnStyle = {
  padding: '6px 12px',
  borderRadius: 14,
  border: 'none',
  background: 'transparent',
  color: '#4A7C59',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
}

const moveBtnStyle = {
  width: 24,
  height: 24,
  borderRadius: 8,
  border: '1px solid #E2DED8',
  background: '#FFFFFF',
  color: '#8A8680',
  fontSize: 10,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
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
