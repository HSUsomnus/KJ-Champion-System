import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useBlocker } from 'react-router-dom'

/**
 * 編輯頁離開守衛
 * 回傳 [blocker, setSaved]
 * - 呼叫 setSaved(true) 後導航不再攔截（用於「確認」按鈕）
 */
export function useLeaveGuard(shouldBlock = true) {
  const [saved, setSaved] = useState(false)
  const blocker = useBlocker(shouldBlock && !saved)

  useEffect(() => {
    if (!shouldBlock || saved) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldBlock, saved])

  return [blocker, useCallback(() => setSaved(true), [])]
}

export default function ConfirmLeaveDialog({ blocker }) {
  if (!blocker || blocker.state !== 'blocked') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(44,44,44,0.4)' }}
      onClick={() => blocker.reset()}
    >
      <div
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
