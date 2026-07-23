import { createPortal } from 'react-dom'

// [設計決策] change 12「統一彈出訊息系統」已於 2026-07-11 封存廢除（見 now.md），
// 專案沒有共用的 useConfirm()/ConfirmDialog。這裡照 uidesign 的 danger variant
// 視覺規範（fixed 遮罩 + 白卡 + 取消/危險確認雙鈕）做一個僅供本頁使用的 dialog，
// 樣式跟既有 ConfirmLeaveDialog.jsx 一致，不冒充成全站共用元件。
export default function DeleteQuestionDialog({ open, onCancel, onConfirm }) {
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
          刪除這個問題？
        </p>
        <p className="text-xs text-center mb-6" style={{ color: '#8A8680' }}>
          此操作無法復原。
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
            style={{ background: '#FDECEA', color: '#C0392B', border: '1px solid #C0392B' }}
          >
            刪除問題
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
