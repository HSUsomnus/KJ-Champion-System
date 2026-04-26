import Dialog from './Dialog'

/**
 * ConfirmDialog — 二次確認對話框
 * 消費 Dialog base，視覺遵循 UIDESIGN.md「Feedback 元件規範 / ConfirmDialog」
 *
 * Props:
 *   open, onConfirm, onCancel
 *   title?         可選標題（粗體置中）
 *   message        必填，主訊息（置中、支援換行）
 *   confirmText    確認按鈕文字（預設「確認」）
 *   cancelText     取消按鈕文字（預設「取消」）
 *   variant        'default' | 'danger'（預設 'default'）
 */
export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'default',
}) {
  const confirmStyle = variant === 'danger'
    ? { background: '#FDECEA', color: '#C0392B', border: '1px solid #C0392B' }
    : { background: '#2C2C2C', color: '#FFFFFF' }

  return (
    <Dialog open={open} onClose={onCancel}>
      {title && (
        <h3
          className="text-base font-semibold mb-2 text-center"
          style={{ color: '#2C2C2C' }}
        >
          {title}
        </h3>
      )}
      <p
        className="text-sm font-medium text-center mb-6 whitespace-pre-line"
        style={{ color: '#2C2C2C' }}
      >
        {message}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: '#EFEDE9', color: '#8A8680' }}
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={confirmStyle}
        >
          {confirmText}
        </button>
      </div>
    </Dialog>
  )
}
