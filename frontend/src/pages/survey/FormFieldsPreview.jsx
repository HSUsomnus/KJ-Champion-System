import { useMemo, useState } from 'react'

const OTHER_VALUE = '__other__'

function SearchableSelect({ field, value, onChange, members, readOnly }) {
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

  if (readOnly) {
    return (
      <input
        type="text"
        value=""
        disabled
        placeholder={`搜尋或選擇${field.label}`}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 16,
          border: '1.5px solid #E2DED8',
          fontSize: 14,
          color: '#8A8680',
          background: '#F7F5F2',
        }}
      />
    )
  }

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

function YesNoField({ value, onChange, readOnly }) {
  const btnStyle = (active) => ({
    flex: 1,
    padding: '14px 0',
    borderRadius: 16,
    border: active ? 'none' : '1.5px solid #E2DED8',
    background: active ? '#4A7C59' : '#FFFFFF',
    color: active ? '#FFFFFF' : '#2C2C2C',
    fontSize: 16,
    fontWeight: 600,
    cursor: readOnly ? 'default' : 'pointer',
    transition: 'background 0.15s, color 0.15s',
    opacity: readOnly ? 0.6 : 1,
  })

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" disabled={readOnly} style={btnStyle(value === 'yes')} onClick={() => onChange('yes')}>
        是
      </button>
      <button type="button" disabled={readOnly} style={btnStyle(value === 'no')} onClick={() => onChange('no')}>
        否
      </button>
    </div>
  )
}

export default function FormFieldsPreview({
  fields,
  answers = {},
  onChange = () => {},
  members = [],
  fieldErrors = {},
  fieldRefs,
  readOnly = false,
}) {
  return (
    <>
      {fields.map((field) => (
        <div
          key={field.key}
          ref={fieldRefs ? (el) => { fieldRefs.current[field.key] = el } : undefined}
          style={{ marginBottom: 20 }}
        >
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#2C2C2C', marginBottom: 8 }}>
            {field.label}
          </label>
          {field.type === 'searchable_select' && (
            <SearchableSelect
              field={field}
              value={answers[field.key] || ''}
              onChange={(v) => onChange(field.key, v)}
              members={members}
              readOnly={readOnly}
            />
          )}
          {field.type === 'yesno' && (
            <YesNoField
              value={answers[field.key]}
              onChange={(v) => onChange(field.key, v)}
              readOnly={readOnly}
            />
          )}
          {field.type === 'text' && (
            <input
              type="text"
              value={answers[field.key] || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              disabled={readOnly}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 16,
                border: '1.5px solid #E2DED8',
                fontSize: 14,
                color: readOnly ? '#8A8680' : '#2C2C2C',
                background: readOnly ? '#F7F5F2' : '#FFFFFF',
              }}
            />
          )}
          {fieldErrors[field.key] && (
            <p style={{ fontSize: 12, color: '#C0392B', marginTop: 4, marginBottom: 0 }}>
              ● {fieldErrors[field.key]}
            </p>
          )}
        </div>
      ))}
    </>
  )
}
