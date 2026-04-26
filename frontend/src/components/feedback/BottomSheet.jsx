import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * BottomSheet — 底部抽屜（多選一選擇器 base）
 * 視覺遵循 UIDESIGN.md「Feedback 元件規範 / BottomSheet」
 *   - 遮罩 rgba(44,44,44,0.4) + z-[60]
 *   - 抽屜 bg-white + rounded-t-2xl + max-h-[60vh] + 內部捲動
 *   - 頂部 4×32 圓角條把手（視覺提示可關）
 *
 * Props:
 *   open, onClose
 *   title          標題
 *   children       抽屜內容（自行渲染選項）
 */
export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'rgba(44,44,44,0.4)' }}
      onClick={() => onClose?.()}
    >
      <div
        className="w-full bg-white rounded-t-2xl flex flex-col"
        style={{ maxHeight: '60vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-8 h-1 rounded-full"
            style={{ background: '#E2DED8' }}
          />
        </div>
        <div
          className="flex items-center justify-between px-4 py-2 border-b shrink-0"
          style={{ borderColor: '#E2DED8' }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: '#2C2C2C' }}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="text-sm font-medium px-2 py-1 transition-all active:scale-95"
            style={{ color: '#8A8680' }}
          >
            取消
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
