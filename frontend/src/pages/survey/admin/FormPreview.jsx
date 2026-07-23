import { useState } from 'react'
import useAdminMembers from './useAdminMembers'
import FormFieldsPreview from '../FormFieldsPreview'

// 十二節 12.3：獨立互動預覽——用當下未儲存的 form state、可實際操作，
// 但不建立 submission；survey_members 題型透過管理員名冊 API 載入真實 confirmed 成員。
export default function FormPreview({ title, fields }) {
  const [answers, setAnswers] = useState({})
  const { members, status, error, retry } = useAdminMembers()

  const hasMemberField = fields.some(
    (f) => f.type === 'searchable_select' && f.options?.source === 'survey_members'
  )

  const setAnswer = (key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))

  return (
    <div style={previewCardStyle}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2C', margin: '0 0 16px' }}>
        {title || '（未命名表單）'}
      </h2>

      {hasMemberField && status === 'loading' && (
        <p style={{ fontSize: 12, color: '#8A8680', marginBottom: 16 }}>載入成員名單中...</p>
      )}
      {hasMemberField && status === 'error' && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 12, color: '#C0392B', margin: 0 }}>
            {error || '載入成員名單失敗'}
          </p>
          <button type="button" onClick={retry} style={retryBtnStyle}>重試</button>
        </div>
      )}
      {hasMemberField && status === 'empty' && (
        <p style={{ fontSize: 12, color: '#8A8680', marginBottom: 16 }}>目前沒有 confirmed 成員資料</p>
      )}

      {fields.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A8680' }}>尚未加入任何問題</p>
      ) : (
        <FormFieldsPreview fields={fields} answers={answers} onChange={setAnswer} members={members} />
      )}

      <button type="button" disabled style={disabledSubmitStyle}>
        送出（預覽停用）
      </button>
    </div>
  )
}

const previewCardStyle = {
  background: '#F7F5F2',
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 16,
}

const retryBtnStyle = {
  padding: '4px 12px',
  borderRadius: 12,
  border: '1px solid #E2DED8',
  background: '#FFFFFF',
  color: '#4A7C59',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
}

const disabledSubmitStyle = {
  width: '100%',
  padding: '14px 24px',
  borderRadius: 16,
  border: 'none',
  background: '#EFEDE9',
  color: '#8A8680',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'default',
  marginTop: 4,
}
