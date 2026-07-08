import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getFormByToken, getMembers, submitForm } from '../../services/surveyApi'

const OTHER_VALUE = '__other__'

function SearchableSelect({ field, value, onChange, members }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [manual, setManual] = useState(false)

  const options = useMemo(() => {
    if (field.options?.source === 'survey_members') {
      return members.map((m) => m.name)
    }
    return field.options?.values || []
  }, [field, members])

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  )

  if (manual) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="請輸入姓名"
        autoFocus
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 16,
          border: '1.5px solid #E2DED8',
          fontSize: 14,
          color: '#2C2C2C',
          background: '#FFFFFF',
        }}
      />
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`搜尋或選擇${field.label}`}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 16,
          border: '1.5px solid #E2DED8',
          fontSize: 14,
          color: '#2C2C2C',
          background: '#FFFFFF',
        }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 10,
            background: '#FFFFFF',
            border: '1px solid #E2DED8',
            borderRadius: 16,
            maxHeight: 200,
            overflowY: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={() => {
                onChange(opt)
                setQuery(opt)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                fontSize: 14,
                color: '#2C2C2C',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
          {field.options?.source === 'survey_members' && (
            <button
              type="button"
              onMouseDown={() => {
                setManual(true)
                onChange('')
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                fontSize: 14,
                color: '#4A7C59',
                fontWeight: 500,
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid #E2DED8',
                cursor: 'pointer',
              }}
            >
              其他（手動輸入）
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function YesNoField({ value, onChange }) {
  const btnStyle = (active) => ({
    flex: 1,
    padding: '14px 0',
    borderRadius: 16,
    border: active ? 'none' : '1.5px solid #E2DED8',
    background: active ? '#4A7C59' : '#FFFFFF',
    color: active ? '#FFFFFF' : '#2C2C2C',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" style={btnStyle(value === 'yes')} onClick={() => onChange('yes')}>
        是
      </button>
      <button type="button" style={btnStyle(value === 'no')} onClick={() => onChange('no')}>
        否
      </button>
    </div>
  )
}

export default function SurveyFill() {
  const { token } = useParams()
  const [form, setForm] = useState(null)
  const [members, setMembers] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getFormByToken(token), getMembers()])
      .then(([formRes, membersRes]) => {
        setForm(formRes.data)
        setMembers(membersRes.data)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  const setAnswer = (key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await submitForm(token, answers)
      setDone(true)
    } catch (err) {
      setError(err.message || '送出失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <p style={{ color: '#8A8680', fontSize: 14 }}>載入中...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ fontSize: 14, color: '#2C2C2C', textAlign: 'center' }}>
            找不到此表單，請確認連結是否正確
          </p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2C', textAlign: 'center' }}>
            已送出，謝謝填寫！
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 448 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#2C2C2C', margin: '0 0 16px' }}>
          {form.title}
        </h1>
        <form onSubmit={handleSubmit} style={cardStyle}>
          {form.fields.map((field) => (
            <div key={field.key} style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#2C2C2C', marginBottom: 8 }}>
                {field.label}
              </label>
              {field.type === 'searchable_select' && (
                <SearchableSelect
                  field={field}
                  value={answers[field.key] || ''}
                  onChange={(v) => setAnswer(field.key, v)}
                  members={members}
                />
              )}
              {field.type === 'yesno' && (
                <YesNoField value={answers[field.key]} onChange={(v) => setAnswer(field.key, v)} />
              )}
              {field.type === 'text' && (
                <input
                  type="text"
                  value={answers[field.key] || ''}
                  onChange={(e) => setAnswer(field.key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: '1.5px solid #E2DED8',
                    fontSize: 14,
                    color: '#2C2C2C',
                  }}
                />
              )}
            </div>
          ))}

          {error && (
            <p style={{ fontSize: 12, color: '#C0392B', marginBottom: 12 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 16,
              border: 'none',
              background: '#2C2C2C',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '送出中...' : '送出'}
          </button>
        </form>
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100svh',
  background: '#F7F5F2',
  display: 'flex',
  justifyContent: 'center',
  padding: '32px 16px',
  overscrollBehavior: 'none',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}
