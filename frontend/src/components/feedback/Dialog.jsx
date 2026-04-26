import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const MAX_WIDTH_CLASS = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
}

/**
 * Dialog base — 遮罩 + 卡片容器
 *
 * 所有彈窗（ConfirmDialog、ShareConfirmDialog、ConfirmLeaveDialog…）的共用基底。
 * 視覺遵循 UIDESIGN.md「Feedback 元件規範 / ConfirmDialog」：
 *   - 遮罩 rgba(44,44,44,0.4) + z-[60]
 *   - 卡片 bg-white + rounded-2xl + 24px padding + shadow-lg
 *   - max-w-xs + mx-6（手機優先）
 *
 * Props:
 *   open              是否顯示
 *   onClose           關閉觸發（點擊遮罩 / ESC 鍵）
 *   closeOnBackdrop   點擊遮罩是否關閉（預設 true）
 *   maxWidth          'xs' | 'sm' | 'md'（預設 'xs'）
 *   children          卡片內內容
 */
export default function Dialog({
  open,
  onClose,
  closeOnBackdrop = true,
  maxWidth = 'xs',
  children,
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const widthClass = MAX_WIDTH_CLASS[maxWidth] || MAX_WIDTH_CLASS.xs

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(44,44,44,0.4)' }}
      onClick={() => { if (closeOnBackdrop) onClose?.() }}
    >
      <div
        className={`mx-6 w-full ${widthClass} rounded-2xl p-6 shadow-lg`}
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
