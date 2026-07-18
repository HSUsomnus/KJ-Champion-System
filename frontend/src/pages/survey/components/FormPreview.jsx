/**
 * 表單預覽（Change 20，Section 7，唯讀）
 * 以夥伴視角渲染建立器目前的欄位設定（沿用 SurveyFill 的欄位型態呈現），唯讀不可互動。
 */

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 16,
  border: '1.5px solid #E2DED8',
  fontSize: 14,
  color: '#8A8680',
  background: '#F7F5F2',
}

function YesNoPreview() {
  const btn = {
    flex: 1,
    padding: '14px 0',
    borderRadius: 16,
    border: '1.5px solid #E2DED8',
    background: '#FFFFFF',
    color: '#8A8680',
    fontSize: 16,
    fontWeight: 600,
  }
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={btn}>是</div>
      <div style={btn}>否</div>
    </div>
  )
}

export default function FormPreview({ title, fields }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2DED8',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        夥伴視角預覽
      </p>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#2C2C2C', margin: '0 0 16px', textAlign: 'center' }}>
        {title || '（未命名任務）'}
      </h2>
      {fields.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A8680', textAlign: 'center' }}>尚無欄位</p>
      ) : (
        fields.map((field, i) => (
          <div key={field.key || i} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#2C2C2C', marginBottom: 8 }}>
              {field.label || '（未命名欄位）'}
            </label>
            {field.type === 'yesno' ? (
              <YesNoPreview />
            ) : field.type === 'searchable_select' ? (
              <div style={inputStyle}>搜尋或選擇{field.label}…</div>
            ) : (
              <div style={inputStyle}>請輸入{field.label}…</div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
