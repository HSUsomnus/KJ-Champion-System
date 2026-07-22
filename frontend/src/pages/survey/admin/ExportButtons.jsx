import { useState } from 'react'
import { downloadAdminExport } from '../../../services/surveyApi'

function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const LABELS = {
  csv: '匯出 CSV',
  xlsx: '匯出 Excel',
}

export default function ExportButtons({ formId }) {
  const [pending, setPending] = useState(null) // 'csv' | 'xlsx' | null
  const [error, setError] = useState('')

  const handleExport = async (format) => {
    setPending(format)
    setError('')
    try {
      const { blob, filename } = await downloadAdminExport(formId, format)
      triggerBrowserDownload(blob, filename)
    } catch (err) {
      setError(err.message || '匯出失敗，請稍後再試')
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['csv', 'xlsx'].map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => handleExport(format)}
            disabled={pending !== null}
            style={{
              padding: '8px 16px',
              borderRadius: 16,
              border: '1.5px solid #E2DED8',
              background: '#FFFFFF',
              color: '#2C2C2C',
              fontSize: 12,
              fontWeight: 500,
              cursor: pending !== null ? 'default' : 'pointer',
              opacity: pending !== null && pending !== format ? 0.4 : 1,
              pointerEvents: pending !== null && pending !== format ? 'none' : 'auto',
            }}
          >
            {pending === format ? '匯出中...' : LABELS[format]}
          </button>
        ))}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#C0392B', marginTop: 6 }}>{error}</p>
      )}
    </div>
  )
}
