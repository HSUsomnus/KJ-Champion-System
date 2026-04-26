/**
 * FieldError — 表單欄位錯誤紅字
 * 視覺遵循 UIDESIGN.md「Feedback 元件規範 / FieldError」
 *   - #C0392B 12px / 400 + 左側 6px dot bullet
 *   - 4px margin-top
 *
 * 使用範例：
 *   <input ... />
 *   {errors.realName && <FieldError>{errors.realName}</FieldError>}
 */
export default function FieldError({ children }) {
  if (!children) return null
  return (
    <p
      className="flex items-center gap-1.5 mt-1 text-xs"
      style={{ color: '#C0392B' }}
      role="alert"
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: '#C0392B' }}
        aria-hidden="true"
      />
      <span>{children}</span>
    </p>
  )
}
