const STATUS_LABEL = {
  published: '已發佈',
  draft: '草稿',
}

export default function FormsSidebar({ forms, selectedId, onSelect, onCreateNew }) {
  return (
    <div className="w-full md:w-[200px] md:flex-shrink-0" style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={titleStyle}>表單</h2>
        {onCreateNew && (
          <button type="button" onClick={onCreateNew} aria-label="新增表單" style={newBtnStyle}>
            + 新增
          </button>
        )}
      </div>
      {forms.length === 0 && (
        <p style={{ fontSize: 12, color: '#8A8680' }}>尚無表單</p>
      )}
      {forms.map((form) => {
        const active = form.id === selectedId
        return (
          <button
            key={form.id}
            type="button"
            onClick={() => onSelect(form.id)}
            style={{
              ...itemStyle,
              background: active ? '#4A7C59' : '#FFFFFF',
              color: active ? '#FFFFFF' : '#2C2C2C',
              border: active ? 'none' : '1px solid #E2DED8',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500 }}>{form.title}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: active ? 'rgba(255,255,255,0.85)' : '#8A8680',
              }}
            >
              {STATUS_LABEL[form.status] || form.status}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const titleStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#8A8680',
  letterSpacing: '0.06em',
  margin: '0 0 4px',
}

const newBtnStyle = {
  padding: '4px 10px',
  borderRadius: 14,
  border: '1.5px dashed #E2DED8',
  background: '#FFFFFF',
  color: '#4A7C59',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  marginBottom: 4,
}

const itemStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  width: '100%',
  textAlign: 'left',
  padding: '10px 14px',
  borderRadius: 16,
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
}
