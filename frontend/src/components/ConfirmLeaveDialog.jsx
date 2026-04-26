import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import ConfirmDialog from './feedback/ConfirmDialog'

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

/**
 * 離開守衛對話框
 * 重構：改為消費統一的 ConfirmDialog（含 danger variant），不再自寫 modal
 */
export default function ConfirmLeaveDialog({ blocker }) {
  if (!blocker) return null
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      message="尚未儲存資料，確認離開？"
      confirmText="確認離開"
      cancelText="取消"
      variant="danger"
      onConfirm={() => blocker.proceed()}
      onCancel={() => blocker.reset()}
    />
  )
}
