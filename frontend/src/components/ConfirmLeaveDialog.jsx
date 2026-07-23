import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useBlocker } from 'react-router-dom'
import useDialogA11y from './useDialogA11y'

/**
 * 編輯頁離開守衛
 * 回傳 [blocker, setSaved]
 * - 呼叫 setSaved() 後導航不再攔截（用於「確認/儲存」按鈕）
 *
 * 設計決策：用 useRef 而非 useState 記錄 saved 狀態
 * 原因：useState 的更新是非同步的，而 shouldBlock 函式由 useBlocker 透過
 *   useEffect 延遲註冊；在 setSaved() 之後立即 navigate 時，舊的 blocker
 *   可能尚未更新到「不攔截」，造成誤跳「未儲存離開」警告。
 *   改用 ref 可同步讀寫，shouldBlock 每次被呼叫時讀到最新值。
 */
export function useLeaveGuard() {
  const savedRef = useRef(false)
  const shouldBlock = useCallback(() => !savedRef.current, [])
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    const handler = (e) => {
      if (savedRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  return [blocker, useCallback(() => { savedRef.current = true }, [])]
}

export default function ConfirmLeaveDialog({ blocker }) {
  const open = Boolean(blocker) && blocker.state === 'blocked'
  const dialogRef = useDialogA11y(open, () => blocker?.reset())
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(44,44,44,0.4)' }}
      onClick={() => blocker.reset()}
    >
      <div
        ref={dialogRef}
        className="mx-6 w-full max-w-xs rounded-2xl p-6 shadow-lg"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-center mb-6" style={{ color: '#2C2C2C' }}>
          尚未儲存資料，確認離開？
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => blocker.reset()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#EFEDE9', color: '#8A8680' }}
          >
            取消
          </button>
          <button
            onClick={() => blocker.proceed()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#FDECEA', color: '#C0392B', border: '1px solid #C0392B' }}
          >
            確認離開
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
