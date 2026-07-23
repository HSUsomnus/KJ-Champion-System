import { useEffect, useRef } from 'react'

// 十二節 12.6：Dialog 要管理焦點、支援 Escape、返回觸發元素。
// 開啟時記住觸發焦點的元素、把焦點移到對話框第一個按鈕；按 Escape 等同取消；
// 關閉時把焦點還給原本觸發的元素，不留在已經消失的對話框內容上。
export default function useDialogA11y(open, onCancel) {
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement
    dialogRef.current?.querySelector('button')?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus?.()
    }
  }, [open, onCancel])

  return dialogRef
}
