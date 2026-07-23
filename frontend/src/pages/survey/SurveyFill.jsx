import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getFormByToken, getMembersByToken, submitForm } from '../../services/surveyApi'
import FormFieldsPreview from './FormFieldsPreview'

const fieldErrorMessage = (field) => {
  if (field.type === 'yesno') return `請選擇${field.label}`
  if (field.type === 'searchable_select') return `請選擇${field.label}`
  return `請輸入${field.label}`
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
  const [fieldErrors, setFieldErrors] = useState({})
  const fieldRefs = useRef({})

  useEffect(() => {
    Promise.all([getFormByToken(token), getMembersByToken(token)])
      .then(([formRes, membersRes]) => {
        setForm(formRes.data)
        setMembers(membersRes.data)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  const setAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // 十二節 12.5：required:true 或缺少 required 的 legacy 欄位必填；required:false 可留空
  const validate = () => {
    const errors = {}
    for (const field of form.fields) {
      if (field.required === false) continue
      const value = (answers[field.key] || '').trim()
      if (!value) errors[field.key] = fieldErrorMessage(field)
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstKey = form.fields.find((f) => errors[f.key])?.key
      const el = fieldRefs.current[firstKey]
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.querySelector('input')?.focus()
      return
    }

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
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
          <img
            src="/康九_logo.png"
            alt="KJ Champion"
            style={{ width: 112, objectFit: 'contain', marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#2C2C2C', margin: 0, textAlign: 'center' }}>
            {form.title}
          </h1>
        </div>
        <form onSubmit={handleSubmit}>
          <FormFieldsPreview
            fields={form.fields}
            answers={answers}
            onChange={setAnswer}
            members={members}
            fieldErrors={fieldErrors}
            fieldRefs={fieldRefs}
          />

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
