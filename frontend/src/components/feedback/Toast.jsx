const COLOR_BAR = {
  success: '#4A7C59',
  info: '#8A8680',
  error: '#C0392B',
}

/**
 * Toast — 單一 toast 視覺
 * 視覺遵循 UIDESIGN.md「Feedback 元件規範 / Toast」
 *   - bg-white + rounded-xl + shadow-md + 12px padding
 *   - 左側 4px 色條（依 type 變色）
 *   - 14px / 500 / text-primary
 */
export default function Toast({ type = 'info', message }) {
  const barColor = COLOR_BAR[type] || COLOR_BAR.info
  return (
    <div
      className="flex items-stretch bg-white rounded-xl shadow-md overflow-hidden min-w-[220px] max-w-sm"
      role="status"
    >
      <div className="w-1 shrink-0" style={{ background: barColor }} />
      <div
        className="flex-1 px-3 py-3 text-sm font-medium whitespace-pre-line"
        style={{ color: '#2C2C2C' }}
      >
        {message}
      </div>
    </div>
  )
}
