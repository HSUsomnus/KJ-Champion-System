import { createPortal } from 'react-dom'

// 十二節 12.2：發布前的不可逆確認（取消不送 API）。跟 DeleteQuestionDialog 同一套
// 視覺骨架，但這不是危險操作（default variant：深炭灰確認鈕，不是紅色）。
export default function PublishConfirmDialog({ open, onCancel, onConfirm }) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(44,44,44,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="mx-6 w-full max-w-xs rounded-2xl p-6 shadow-lg"
        style={{ background: '#fff' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-center mb-2" style={{ color: '#2C2C2C' }}>
          發布這份表單？
        </p>
        <p className="text-xs text-center mb-6" style={{ color: '#8A8680' }}>
          發布後表單內容將變成唯讀，並開始接受填寫。
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#EFEDE9', color: '#8A8680' }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#2C2C2C', color: '#FFFFFF' }}
          >
            確認發佈
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
